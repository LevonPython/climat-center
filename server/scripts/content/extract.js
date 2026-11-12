// Turns the crawled climatecentr.ru pages into the tracked JSON in server/content.
// Run after crawl.js: npm run content:extract -w server
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const { sanitizeRichText } = require('../../src/services/contentSanitizer');
const { LANGS } = require('../../src/services/localization');
const { adaptForArmenia } = require('./adapt');
const { applyRemovals, keepWork } = require('./removals');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'content');
const RAW_PAGES = path.join(CONTENT_DIR, 'raw', 'pages');
const OUT_PAGES = path.join(CONTENT_DIR, 'pages');
const THEME = '/sites/all/themes/new/image';

// Specific to Russia until replaced. They import hidden, in Russian only.
const HIDDEN_PAGES = new Set(['politika-konfidencialnosti', 'polzovatelskoe-soglashenie', 'pokupki-v-kredit', 'vakansiya']);
const SKIPPED_PATHS = /^\/(krasnogorsk|himki|lubertsy|mytishi|odintsovo)(\/|$)/;
// Banners that only exist as a background picture in the old stylesheet.
const BANNER_IMAGES = {
  'block-block-36': `${THEME}/cond2.jpg`,
  'block-block-43': `${THEME}/dozapravka.jpg`,
  'block-block-47': `${THEME}/dozapravka.jpg`,
  'block-block-44': `${THEME}/ustanovka-cond.jpg`,
  'block-block-45': `${THEME}/chistka.jpg`
};
const LISTINGS = { service: 'uslugi/uslugi-i-servis', fault: 'uslugi/neispravnosti' };
// The old FAQ page links to these without their section, and those addresses return 404.
const MOVED_LINKS = /href="\/(konservaciya-chillerov-na-zimniy-period|diagnostika-chillerov|puskonaladka-chillerov|raskonservaciya-chillerov-pered-nachalom-sezona)"/g;

// A discount offer baked into the picture, so the rule for promotions in text can't catch it.
const PROMOTION_PICTURE = '2climatecentr_banner';
// A scan of a document signed by the Russian company.
const COMPANY_DOCUMENT = 'skan_centr_klimata';
const review = { removed: [], prices: new Set(), flagged: [] };
let currentPath = '/';

function adapt(text) {
  if (typeof text !== 'string') return text;
  const { text: adapted, removed } = adaptForArmenia(text);
  for (const item of removed) review.removed.push({ page: currentPath, item });
  if (/(\+7|8\s?\(?495|mail@climatecentr|climatecentr\.ru)/.test(adapted)) {
    review.flagged.push({ page: currentPath, item: adapted.replace(/<[^>]+>/g, ' ').slice(0, 100) });
  }
  return adapted;
}

function clean(text) {
  return String(text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

const plain = (el) => (el ? adapt(clean(el.textContent)) || null : null);

// Headings on the old site emphasise part of the text. `**` keeps that in a plain text field.
function headingText(el) {
  if (!el) return null;
  // In running text the old site's stylesheet leaves bold headings black, so there is nothing to highlight.
  if (el.tagName === 'H2' && el.parentElement?.matches('.field-item')) return adapt(clean(el.textContent)) || null;
  const parts = [];
  for (const node of el.childNodes) {
    const text = clean(node.textContent);
    if (!text) continue;
    parts.push(node.nodeType === 1 && /^(B|STRONG|SPAN)$/.test(node.tagName) ? `**${text}**` : text);
  }
  const joined = parts.join(' ').replace(/\s+([.,!?:;])/g, '$1');
  const stripped = joined.replace(/\*\*/g, '');
  // A heading that is entirely emphasised has nothing to contrast with.
  return adapt(joined === `**${stripped}**` ? stripped : joined) || null;
}

const withoutOrigin = (address) => address.trim().replace(/^https?:\/\/(www\.)?climatecentr\.ru/, '');

function mediaRef(raw) {
  if (!raw) return null;
  const value = withoutOrigin(raw).split('?')[0];
  return value.startsWith('/') ? `media:${decodeURI(value)}` : value;
}

function richHtml(nodes) {
  const holder = nodes[0].ownerDocument.createElement('div');
  for (const node of nodes) holder.appendChild(node.cloneNode(true));
  holder.querySelectorAll('.callb, .t-line, .border, .cub, .line, .vyp, script, style').forEach((el) => el.remove());
  holder.querySelectorAll('.dve-kol ul').forEach((list) => list.setAttribute('class', 'two-columns'));
  for (const banner of holder.querySelectorAll(`img[src*="${PROMOTION_PICTURE}"]`)) {
    review.removed.push({ page: currentPath, item: 'A Russian picture advertising a discount on installation' });
    banner.remove();
  }
  for (const scan of holder.querySelectorAll(`img[src*="${COMPANY_DOCUMENT}"]`)) {
    review.removed.push({ page: currentPath, item: 'A scan of a quality policy signed by the Russian company' });
    (scan.closest('a') || scan).remove();
  }

  const walker = holder.ownerDocument.createTreeWalker(holder, 128);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((comment) => comment.remove());

  for (const link of holder.querySelectorAll('a[href]')) {
    link.setAttribute('href', withoutOrigin(link.getAttribute('href')) || '/');
  }
  for (const img of holder.querySelectorAll('img[src]')) {
    img.setAttribute('src', withoutOrigin(img.getAttribute('src')));
  }

  const html = sanitizeRichText(holder.innerHTML)
    .replace(/&nbsp;/g, ' ')
    .replace(/ /g, ' ')
    .replace(/<p>\s*<strong>\s*<\/strong>\s*\/\s*100\s*г\.?\s*<\/p>/g, '')
    .replace(/<strong>\s*<\/strong>/g, '')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(MOVED_LINKS, 'href="/usluga/$1"')
    .replace(/(src|href)="(\/sites\/[^"]+)"/g, (_all, attr, value) => `${attr}="media:${decodeURI(value.split('?')[0])}"`)
    .trim();
  return adapt(html) || null;
}

function section(block_type, content) {
  return { block_type, content };
}

// A heading right before a component belongs to that component.
function takeTrailingHeading(buffer) {
  const last = buffer[buffer.length - 1];
  if (last && last.nodeType === 1 && /^H[1-4]$/.test(last.tagName)) {
    buffer.pop();
    return headingText(last);
  }
  return null;
}

function priceOf(el) {
  const value = clean(el?.textContent);
  if (/\d/.test(value)) review.prices.add(currentPath);
  // Ruble amounts are removed, so the site shows "price on request" until AMD is entered.
  return /\d/.test(value) ? null : value || null;
}

const COMPONENTS = [
  {
    match: '.content-banner',
    build: (el) => section('service_banner', {
      heading: plain(el.querySelector('h2')),
      image_url: mediaRef(el.querySelector('img')?.getAttribute('src')),
      options: [...el.querySelectorAll('.cb-options li')].map((li) => ({ text: plain(li) })),
      button_label: plain(el.querySelector('.cb-link'))
    })
  },
  {
    match: '.wrap-block',
    build: (el) => {
      const blockId = el.closest('[id^="block-block-"]')?.id;
      const lines = [...el.querySelectorAll('.text-block > div')].map((line) => plain(line)).filter(Boolean);
      return section('service_banner', {
        heading: lines[0] || null,
        image_url: BANNER_IMAGES[blockId] ? `media:${BANNER_IMAGES[blockId]}` : null,
        options: lines.slice(1).map((text) => ({ text })),
        button_label: null
      });
    }
  },
  {
    match: '.rc-banner',
    build: (el) => section('callout', {
      heading: headingText(el.querySelector('.rc-banner_title')),
      image_url: null,
      items: [...el.querySelectorAll('li')].map((li, index) => ({ icon_url: `media:${THEME}/rc/${index + 1}.svg`, text: plain(li) })),
      button_label: plain(el.querySelector('.callb'))
    })
  },
  {
    match: '.complex',
    build: (el) => section('callout', {
      heading: headingText(el.querySelector('.item-text-h')),
      image_url: `media:${THEME}/cgr.png`,
      items: [...el.querySelectorAll('.item-text-line > div')].map((item) => ({ icon_url: null, text: plain(item) })),
      button_label: plain(el.querySelector('.item-text-but'))
    })
  },
  {
    match: '.block-banner',
    build: (el) => section('callout', {
      heading: headingText(el.querySelector('.banner-block__text')),
      image_url: mediaRef(el.querySelector('img')?.getAttribute('src')),
      items: [],
      button_label: plain(el.querySelector('.banner-block__btn'))
    })
  },
  {
    match: '.priz',
    build: (el) => section('signs', {
      heading: plain(el.querySelector('h2')),
      items: [...el.querySelectorAll('li')].map((li) => ({ icon_url: null, title: plain(li) })),
      body: richHtml([...el.querySelector('.t-block').childNodes])
    })
  },
  {
    match: '.banner-split',
    // The sum here was in rubles, so what remains is the example itself: the model and what comes with it.
    build: (el) => {
      review.removed.push({ page: currentPath, item: 'The example sum in rubles for an air conditioner with installation' });
      const included = plain(el.querySelector('.banner-split-instruction'))?.replace(/^за\s+/, '+ ');
      const lines = [clean(el.querySelector('.banner-split-left .title-block')?.innerHTML), included, plain(el.querySelector('.banner-split-explanation'))];
      return section('image_text', {
        heading: null,
        image_url: mediaRef(el.querySelector('.banner-split-right img')?.getAttribute('src')),
        image_side: 'right',
        labels: [],
        body: adapt(lines.filter(Boolean).map((line) => `<p>${line}</p>`).join(''))
      });
    }
  },
  {
    match: '.content-info',
    build: (el) => {
      const textItem = el.querySelector('.item.text');
      return section('image_text', {
        heading: null,
        image_url: mediaRef(el.querySelector('.image img')?.getAttribute('src')),
        image_side: el.firstElementChild === textItem ? 'right' : 'left',
        labels: [...el.querySelectorAll('.text-line')].map((line) => ({ text: plain(line) })),
        body: textItem ? richHtml([...textItem.childNodes]) : null
      });
    }
  },
  {
    match: '.block-icons-v',
    build: (el) => section('icon_features', {
      heading: null,
      items: [...el.querySelectorAll('.block-icons-v__item')].map((item) => ({
        icon_url: mediaRef(item.querySelector('img')?.getAttribute('src')),
        title: plain(item.querySelector('p')),
        description: null,
        link_url: withoutOrigin(item.querySelector('a')?.getAttribute('href') || '') || null
      }))
    })
  },
  {
    match: '.block-icons',
    build: (el) => section('icon_features', {
      heading: headingText(el.querySelector('.block-icons__title')),
      items: [...el.querySelectorAll('.block-icons__item')].map((item) => ({
        icon_url: mediaRef(item.querySelector('img')?.getAttribute('src')),
        title: null,
        description: plain(item.querySelector('p')),
        link_url: null
      }))
    })
  },
  {
    match: '.why-item',
    group: '.row-why',
    build: (el) => section('work_cards', {
      heading: null,
      items: [...el.parentElement.querySelectorAll('.why-item')].map((item) => ({
        title: plain(item.querySelector('.title_item')),
        description: adapt(clean([...item.childNodes].filter((node) => !node.classList?.contains('title_item')).map((node) => node.textContent).join(' '))) || null
      }))
    })
  },
  {
    match: '.down-price',
    // The first row names the group and gives its lowest price.
    build: (el) => {
      const [group, ...items] = [...el.querySelectorAll('.item')]
        .filter((item) => item.querySelector('.item-text'))
        .map((item) => ({ title: plain(item.querySelector('.item-text')), price: priceOf(item.querySelector('.item-price')) }));
      return section('price_list', { heading: null, group_title: group?.title ?? null, group_price: group?.price ?? null, items });
    }
  },
  {
    // With the ruble amounts gone these tables would be columns of empty cells.
    match: 'table',
    applies: (el) => /\d\s*(руб|₽)/.test(el.textContent),
    build: (el) => {
      review.prices.add(currentPath);
      const rows = [...el.querySelectorAll('tr')].filter((row) => !row.querySelector('td strong, th'));
      return section('price_list', {
        heading: null,
        items: rows
          .map((row) => ({ title: plain(row.querySelector('td, th')), price: null }))
          .filter((row) => row.title)
      });
    }
  },
  {
    match: '.block-numbers',
    build: (el) => section('steps', {
      heading: headingText(el.querySelector('.block-numbers__title')),
      items: [...el.querySelectorAll('.block-numbers__item')].map((item) => {
        const text = item.querySelector('.block-numbers__text');
        const strong = text?.querySelector('strong');
        const rest = strong ? clean(text.textContent.replace(strong.textContent, '')) : '';
        return { title: plain(strong || text), description: adapt(rest) || null, image_url: null };
      })
    })
  },
  {
    match: '.questions-block',
    build: (el) => section('faq', {
      heading: plain(el.querySelector('h2')),
      items: [...el.querySelectorAll('.holder')].map((holder) => ({
        question: plain(holder.querySelector('.opener')),
        answer: richHtml([...holder.querySelector('.slide').childNodes])
      }))
    })
  },
  {
    match: '.block-photos',
    build: (el) => section('photos', {
      heading: null,
      items: [...el.querySelectorAll('a')].map((link) => ({
        image_url: mediaRef(link.getAttribute('href')),
        caption: adapt(clean(link.querySelector('img')?.getAttribute('alt'))) || null
      }))
    })
  },
  {
    match: '.video-block, .youtube, iframe',
    build: (el) => {
      const raw = el.matches('iframe') ? el.getAttribute('src') : el.querySelector('iframe')?.getAttribute('src') || (el.closest('[data-embed]') || el.querySelector('[data-embed]'))?.getAttribute('data-embed');
      // The old site reuses this class as a plain column, for text or a picture.
      if (!raw) return section('rich_text', { heading: null, body: richHtml([...el.childNodes]) });
      const video_url = raw.startsWith('//') ? `https:${raw}` : /^https?:/.test(raw) ? raw : `https://www.youtube.com/embed/${raw}`;
      return section('video', { heading: null, video_url });
    }
  },
  {
    match: '.v-sistems__body',
    build: (el) => section('products', {
      heading: null,
      items: [...el.querySelectorAll('.v-sistems__item')].map((item) => {
        review.prices.add(currentPath);
        const table = item.querySelector('table');
        // Model names stay; their ruble amounts don't.
        for (const cell of table ? [...table.querySelectorAll('td:last-child')] : []) cell.remove();
        const specs = item.querySelector('.v-sistems__item-characteristic__text');
        return {
          title: plain(item.querySelector('.v-sistems__item-title')),
          images: [...item.querySelectorAll('.v-sistems__item-slider-main img')].map((img) => ({ image_url: mediaRef(img.getAttribute('src')) })),
          price: null,
          details: richHtml([table, specs].filter(Boolean))
        };
      })
    })
  },
  {
    match: '.on-form, [id^="webform-client-form"]',
    build: (el) => section('request_form', {
      heading: plain(el.querySelector('.webform-component--text, .webform-component-markup')),
      button_label: el.querySelector('input[type="submit"]')?.getAttribute('value') || null,
      layout: el.matches('.on-form') || el.querySelector('.on-form') ? 'split' : null
    })
  }
];

const applies = (component, el) => !component.applies || component.applies(el);
const matchComponent = (el) => COMPONENTS.find((component) => el.matches(component.match) && applies(component, el));
const holdsComponent = (el) => COMPONENTS.some((component) => [...el.querySelectorAll(component.match)].some((found) => applies(component, found)));

// Splits running content into sections: each known component becomes its own, and each h2 starts a new text section.
function sectionsFrom(root) {
  // Notices from the old form's spam protection.
  root.querySelectorAll('.antibot-no-js, .antibot-message, .messages, noscript').forEach((el) => el.remove());
  // Some pages repeat the contacts strip inside their text. The layout already shows it.
  for (const strip of root.querySelectorAll('.contact-items')) {
    if (strip.previousElementSibling?.matches('.bl-title')) strip.previousElementSibling.remove();
    strip.remove();
  }
  const sections = [];
  let buffer = [];
  const seenGroups = new Set();

  function flush() {
    const nodes = buffer.filter((node) => node.nodeType === 1 || clean(node.textContent));
    buffer = [];
    if (!nodes.length) return;
    const first = nodes[0];
    const hasHeading = first.nodeType === 1 && /^H[23]$/.test(first.tagName);
    // A picture floated inside a heading belongs with the text below it.
    const headingImages = hasHeading ? [...first.querySelectorAll('img')].map((img) => img.closest('a') || img) : [];
    const body = [...headingImages, ...nodes.slice(hasHeading ? 1 : 0)];
    const content = {
      heading: hasHeading ? headingText(first) : null,
      body: body.length ? richHtml(body) : null
    };
    if (content.heading || content.body) sections.push(section('rich_text', content));
  }

  function walk(parent) {
    for (const node of parent.childNodes) {
      if (node.nodeType === 8) continue;
      if (node.nodeType !== 1) {
        buffer.push(node);
        continue;
      }
      const component = matchComponent(node);
      if (component) {
        if (component.group) {
          const group = node.closest(component.group);
          if (group && seenGroups.has(group)) continue;
          if (group) seenGroups.add(group);
        }
        const inherited = takeTrailingHeading(buffer);
        flush();
        const built = component.build(node);
        if (built) {
          if (inherited && !built.content.heading) built.content.heading = inherited;
          sections.push(built);
        }
        continue;
      }
      if (holdsComponent(node)) {
        walk(node);
        continue;
      }
      if (node.tagName === 'H2') flush();
      // Plain wrappers hold the headings that split text into sections.
      if (/^(DIV|SECTION)$/.test(node.tagName) && node.querySelector('h2')) {
        walk(node);
        continue;
      }
      buffer.push(node);
    }
  }

  walk(root);
  flush();
  return sections;
}

// A heading left alone belongs to the block right after it.
function mergeLoneHeadings(sections) {
  const out = [];
  for (const current of sections) {
    const previous = out[out.length - 1];
    const lone = previous && previous.block_type === 'rich_text' && previous.content.heading && !previous.content.body;
    if (lone && 'heading' in current.content && !current.content.heading) {
      out.pop();
      out.push({ ...current, content: { ...current.content, heading: previous.content.heading } });
    } else {
      out.push(current);
    }
  }
  return out;
}

function dropEmptyText(sections) {
  return sections.filter(({ block_type, content }) => {
    if (block_type !== 'rich_text') return true;
    return content.heading || /<img/.test(content.body || '') || /\p{L}/u.test((content.body || '').replace(/<[^>]+>/g, ''));
  });
}

// The sidebar already lists every service, and this copy's links have no text.
function dropServiceTeasers(sections) {
  return sections.filter((current) => !/какие еще услуги/i.test(current.content.heading || ''));
}

// Reviews signed by clients in Russia would mislead on the Armenian site, so they stay hidden until replaced.
function hideForeignReviews(sections) {
  return sections.map((current) => {
    if (!/отзыв/i.test(current.content.heading || '')) return current;
    review.removed.push({ page: currentPath, item: `Hidden, not deleted: "${current.content.heading.replace(/\*\*/g, '')}", reviews from clients in Russia` });
    return { ...current, hidden: true };
  });
}

function contentRoots(doc) {
  const roots = [];
  const top = doc.querySelector('#content-top .region');
  if (top) roots.push(top);
  const region = doc.querySelector('#content .region-content');
  for (const block of region ? region.children : []) {
    if (block.id === 'block-system-main') {
      // The node holds more than the text field: question lists and request forms sit beside it.
      const node = block.querySelector('.node > .content');
      if (node) roots.push(node);
    } else {
      roots.push(block.querySelector('.content') || block);
    }
  }
  // Question lists and request forms sit below the content. The contacts strip there belongs to the layout.
  const bottom = doc.querySelector('#content-bottom .region');
  if (bottom) {
    bottom.querySelector('#block-block-24')?.remove();
    roots.push(bottom);
  }
  return roots;
}

function errorCodeSections(root) {
  const intro = [];
  const items = [];
  let current = null;
  for (const node of root.children) {
    if (node.tagName === 'H2') {
      current = { brand: plain(node), nodes: [] };
      items.push(current);
    } else if (current) {
      current.nodes.push(node);
    } else {
      intro.push(node);
    }
  }
  const sections = intro.length ? [section('rich_text', { heading: null, body: richHtml(intro) })] : [];
  sections.push(section('error_codes', { heading: null, items: items.map((item) => ({ brand: item.brand, codes: richHtml(item.nodes) })) }));
  return sections;
}

function breadcrumbParent(doc, slug) {
  const links = [...doc.querySelectorAll('#breadcrumb a')].map((a) => a.getAttribute('href').replace(/^\//, ''));
  const parent = links.slice(1, -1).pop();
  return parent && parent !== slug ? parent : null;
}

function homeSections(doc) {
  const block = (id) => doc.querySelector(`#${id}`);
  const hero = block('block-block-19');
  const works = block('block-block-20');
  const service = block('block-block-21');
  const prices = block('block-block-25');
  const advantages = block('block-block-23');
  const form = block('block-webform-client-block-140');
  const promoImages = [`${THEME}/im-19-1.webp`, `${THEME}/im-19-2.webp`];
  const workImages = [`${THEME}/work-1.jpg`, `${THEME}/work-2.jpg`, `${THEME}/work-3.jpg`];
  const h1 = hero.querySelector('h1');
  const strong = h1.querySelector('b');

  return [
    section('intro_banner', {
      heading: plain(strong),
      subheading: adapt(clean(h1.textContent.replace(strong.textContent, ''))),
      intro_text: plain(hero.querySelector('.oval')),
      promos: [...hero.querySelectorAll('.rob')].map((rob, index) => ({
        label: plain(rob.querySelector('.text')),
        price: priceOf(rob.querySelector('.price')),
        image_url: `media:${promoImages[index]}`
      }))
    }),
    section('icon_features', {
      heading: null,
      items: [...hero.querySelectorAll('.awad-line .item')].map((item) => ({
        icon_url: null,
        title: null,
        description: plain(item.querySelector('.text')),
        link_url: null
      }))
    }),
    section('work_cards', {
      heading: headingText(works.querySelector('.bl-title')),
      items: [...works.querySelectorAll('.items > .item')].map((item, index) => ({
        title: plain(item.querySelector('.item-title')),
        description: plain(item.querySelector('.text')),
        image_url: `media:${workImages[index]}`
      }))
    }),
    section('image_text', {
      heading: headingText(service.querySelector('.bl-title')),
      image_url: `media:${THEME}/condik.webp`,
      labels: [...service.querySelectorAll('.text-line')].map((line) => ({ text: plain(line) })),
      body: richHtml([...service.querySelector('.item.text').childNodes])
    }),
    section('request_form', {
      heading: headingText(form.querySelector('.bl-title')),
      button_label: form.querySelector('input[type="submit"]').getAttribute('value')
    }),
    section('price_cards', {
      heading: headingText(prices.querySelector('.bl-title')),
      items: [...prices.querySelectorAll('.items .item')].map((item) => ({
        title: plain(item.querySelector('.item-text')),
        price: priceOf(item.querySelector('.item-price'))
      }))
    }),
    section('advantages', {
      heading: headingText(advantages.querySelector('.bl-title')),
      items: [...advantages.querySelectorAll('.prem-items .item')].map((item) => ({
        icon_url: null,
        text: plain(item.querySelector('.text'))
      }))
    })
  ];
}

function pageType(doc, pagePath) {
  if (pagePath === '/') return 'home';
  if (pagePath.startsWith('/uslugi/')) return 'listing';
  if (doc.body.className.includes('node-type-photogallary')) return 'gallery';
  if (doc.body.className.includes('node-type-service') || pagePath.startsWith('/usluga/')) {
    const faults = [...doc.querySelectorAll('#block-views-service-list-block .views-block')].find((group) => /Неисправност/.test(group.textContent));
    const inFaults = faults && [...faults.querySelectorAll('a')].some((a) => a.getAttribute('href') === pagePath);
    return inFaults ? 'fault' : 'service';
  }
  if (/^\/(kontakty|actions|proizvoditeli|o-kompanii-centr-klimata|politika-konfidencialnosti|polzovatelskoe-soglashenie|pokupki-v-kredit|vakansiya)$/.test(pagePath)) return 'static';
  return 'article';
}

function extractPage(doc, pagePath) {
  currentPath = pagePath;
  const slug = pagePath === '/' ? 'home' : pagePath.replace(/^\//, '');
  const type = pageType(doc, pagePath);
  const hidden = HIDDEN_PAGES.has(slug);
  const h1 = doc.querySelector('#page-title');

  let sections;
  if (type === 'home') sections = homeSections(doc);
  else if (type === 'gallery') sections = [section('gallery', { heading: null, collection: 'works' })];
  else if (type === 'listing') sections = [section('listing', { heading: null, category: slug === LISTINGS.fault ? 'fault' : 'service' })];
  else if (slug === 'proizvoditeli') sections = [section('gallery', { heading: null, collection: 'brands' })];
  // The old page lists Moscow offices. The contacts come from the site settings instead.
  else if (slug === 'kontakty') sections = [section('contacts_strip', { heading: null }), section('map', { heading: null }), section('request_form', { heading: null, button_label: null })];
  else if (slug === 'actions') sections = [];
  else if (slug === 'kody-oshibok-kondicionerov') sections = errorCodeSections(doc.querySelector('.field-name-body .field-item'));
  else sections = hideForeignReviews(dropServiceTeasers(dropEmptyText(mergeLoneHeadings(contentRoots(doc).flatMap(sectionsFrom)))));

  if (slug === 'kontakty') review.removed.push({ page: pagePath, item: 'Moscow office and showroom addresses' });
  if (slug === 'actions') review.removed.push({ page: pagePath, item: 'The Russian promotion (10% until 15 November). The page stays hidden until you add one.' });

  return {
    slug,
    type,
    parent: type === 'service' ? LISTINGS.service : type === 'fault' ? LISTINGS.fault : breadcrumbParent(doc, slug),
    status: hidden || slug === 'actions' ? 'hidden' : 'published',
    translate: !hidden,
    title: adapt(clean(h1?.textContent)) || adapt(clean(doc.title.split('|')[0])),
    meta_title: adapt(clean(doc.title)),
    // The contacts page description lists the Moscow offices.
    meta_description: slug === 'kontakty' ? null : adapt(clean(doc.querySelector('meta[name="description"]')?.getAttribute('content'))) || null,
    sections
  };
}

function extractSite(doc) {
  currentPath = '(site)';
  const links = (selector) =>
    [...doc.querySelectorAll(selector)].map((a) => ({ label: clean(a.textContent), href: a.getAttribute('href') }));

  return {
    pills: links('#block-views-service-list-block-2 a'),
    services: links('#block-views-service-list-block .views-block:nth-child(1) a'),
    faults: links('#block-views-service-list-block .views-block:nth-child(2) a'),
    topbar: links('.menu-top a'),
    footer_links: links('#footer .adress > a').filter((link) => link.href.startsWith('/')),
    header: links('#block-system-main-menu a'),
    brands: [...doc.querySelectorAll('.jcarousel-brand img')].map((img) => ({
      image: mediaRef(img.getAttribute('src')),
      title: clean(img.getAttribute('alt'))
    })),
    certificates: [...doc.querySelectorAll('#block-block-27 a')].map((a) => ({
      image: mediaRef(a.getAttribute('href')),
      title: clean(a.querySelector('img')?.getAttribute('alt'))
    })),
    header_texts: {
      hours_text: clean(doc.querySelector('.times .text-1')?.textContent),
      arrival_text: clean(doc.querySelector('.times .text-2')?.textContent),
      free_visit_text: clean(doc.querySelector('.phone .text-3 .text')?.textContent),
      cta_label: clean(doc.querySelector('.right-block .callb')?.textContent)
    },
    branding: {
      site_name: clean(doc.querySelector('.logo-name .name')?.textContent),
      tagline: clean(doc.querySelector('.logo-name .slog')?.textContent),
      logo_url: `media:/sites/all/themes/new/logo.png`,
      hero_image_url: `media:${THEME}/big_banner.webp`
    },
    footer: {
      disclaimer: [...doc.querySelectorAll('#footer .adress')]
        .map((el) => clean([...el.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent).join(' ')))
        .filter((text) => text && !/haisberg|Рекламное/i.test(text))
        .join(' ')
    },
    form: {
      title: clean(doc.querySelector('#block-webform-client-block-20 .block-title')?.textContent),
      note: clean(doc.querySelector('#block-webform-client-block-20 .webform-component-markup')?.textContent),
      question: clean(doc.querySelector('.webform-component--vashi-raboty > label')?.textContent).replace(/\*$/, '').trim(),
      options: [...doc.querySelectorAll('.webform-component--vashi-raboty .option')].map((label) => clean(label.textContent)),
      consent: clean(doc.querySelector('#block-webform-client-block-20 .form-note')?.textContent)
    }
  };
}

function collectText(value, out) {
  if (typeof value === 'string') {
    if (!/^media:/.test(value) && !/^(https?:|\/)/.test(value) && /[А-Яа-яЁё]/.test(value)) out.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, out));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectText(item, out));
  }
}

function collectMedia(value, out) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/media:([^"'\s]+)/g)) out.add(match[1]);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectMedia(item, out));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectMedia(item, out));
  }
}

function fileNameFor(slug) {
  return `${slug.replace(/\//g, '__')}.json`;
}

// These aren't about Armenia, so no rule can catch them, and whether they are true is the owner's call.
const COPIED_BUT_DOUBTFUL = [
  { page: '/nashi-raboty', item: "The photos are the Russian company's jobs, not jobs in Armenia. Replace them with your own in the admin." },
  { page: '/usluga/prodazha-i-ustanovka-brizerov', item: 'The page sells TION breezers and quotes air pollution figures and benefits for asthma and allergies. Keep it only if you sell them and can back that up.' },
  { page: '/o-kompanii-centr-klimata', item: 'Says more than 8 years of work, and that specialists are trained and hold certificates.' },
  { page: '/usluga/remont-kondicionerov', item: 'Promises free diagnostics and a large stock of spare parts.' },
  { page: '(every page)', item: 'The header promises work around the clock, a specialist within 2 hours and a free visit. Other pages promise a 6 to 12 month warranty.' }
];

function writeReview(pages) {
  const lines = [
    '# Content import: what to review',
    '',
    'Generated by `server/scripts/content/extract.js`. Armenian and English are drafts, and each translated page is marked "needs review" in the admin.',
    '',
    '## Hidden until you confirm',
    ...pages.filter((page) => page.status === 'hidden').map((page) => `- \`/${page.slug}\``),
    '',
    '## Pages where ruble prices were removed',
    'They show "price on request" until you enter prices in AMD.',
    ...[...review.prices].sort().map((page) => `- \`${page}\``),
    '',
    '## Removed text',
    ...review.removed.map(({ page, item }) => `- \`${page}\`: ${item.replace(/\s+/g, ' ').slice(0, 140)}`),
    '',
    '## Contact details left in text',
    ...(review.flagged.length ? review.flagged.map(({ page, item }) => `- \`${page}\`: ${item}`) : ['None.']),
    '',
    '## Text copied as it was, but worth checking',
    ...COPIED_BUT_DOUBTFUL.map(({ page, item }) => `- \`${page}\`: ${item}`),
    ''
  ];
  fs.writeFileSync(path.join(CONTENT_DIR, 'review.md'), lines.join('\n'));
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'raw', 'manifest.json'), 'utf8'));
  fs.rmSync(OUT_PAGES, { recursive: true, force: true });
  fs.mkdirSync(OUT_PAGES, { recursive: true });

  // A line break separates words visually, so reading the text must not glue them together.
  const load = (file) => new JSDOM(fs.readFileSync(path.join(RAW_PAGES, file), 'utf8').replace(/<br\s*\/?>/gi, ' <br>').replace(/\u00ad|&shy;/g, '')).window.document;
  const entries = Object.entries(manifest).filter(([pagePath, row]) => row.status === 200 && !SKIPPED_PATHS.test(pagePath));
  const pages = [];
  const texts = new Set();
  const media = new Set();

  for (const [pagePath, row] of entries) {
    const { page, notes } = applyRemovals(extractPage(load(row.file), pagePath));
    for (const item of notes) review.removed.push({ page: pagePath, item });
    pages.push(page);
    fs.writeFileSync(path.join(OUT_PAGES, fileNameFor(page.slug)), `${JSON.stringify(page, null, 2)}\n`);
    if (page.translate) collectText({ ...page, sections: page.sections.filter((item) => !item.hidden) }, texts);
    collectMedia(page, media);
  }

  const homeDoc = load(manifest['/'].file);
  const site = extractSite(homeDoc);
  site.works = [...load(manifest['/nashi-raboty'].file).querySelectorAll('.field-name-field-foto a')].map((a) => ({
    image: mediaRef(a.getAttribute('href')),
    title: ''
  })).filter(keepWork);
  review.removed.push({ page: '/nashi-raboty', item: 'Nine design drawings with Russian labels' });
  fs.writeFileSync(path.join(CONTENT_DIR, 'site.json'), `${JSON.stringify(site, null, 2)}\n`);
  collectText(site, texts);
  collectMedia(site, media);

  const hashes = Object.fromEntries([...texts].map((text) => [crypto.createHash('sha1').update(text).digest('hex').slice(0, 16), text]));
  fs.writeFileSync(path.join(CONTENT_DIR, 'strings.ru.json'), `${JSON.stringify(hashes, null, 2)}\n`);
  writeReview(pages);

  const sitemap = [...fs.readFileSync(path.join(CONTENT_DIR, 'raw', 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  fs.writeFileSync(path.join(CONTENT_DIR, 'coverage.json'), `${JSON.stringify({ sitemap }, null, 2)}\n`);
  fs.mkdirSync(path.join(CONTENT_DIR, 'translations'), { recursive: true });
  for (const lang of LANGS.filter((code) => code !== 'ru')) {
    const file = path.join(CONTENT_DIR, 'translations', `${lang}.json`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, '{}\n');
  }

  const counts = {};
  for (const page of pages) for (const { block_type } of page.sections) counts[block_type] = (counts[block_type] || 0) + 1;
  const words = [...texts].join(' ').replace(/<[^>]+>/g, ' ').split(/\s+/).length;
  console.log(`${pages.length} pages, ${Object.keys(hashes).length} texts to translate, about ${words} words, ${media.size} files`);
  console.log(counts);
  console.log(`Removed: ${review.removed.length}, pages with prices removed: ${review.prices.size}, contact details left: ${review.flagged.length}`);
}

main();
