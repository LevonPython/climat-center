// Checks the tracked content itself: what ships in server/content, without a database.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { getBlockType } = require('../src/contentSchemas/blockTypes');
const { validateBlockType } = require('../src/contentSchemas/validate');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const pagesDir = path.join(CONTENT_DIR, 'pages');
const pages = fs.readdirSync(pagesDir).map((name) => JSON.parse(fs.readFileSync(path.join(pagesDir, name), 'utf8')));
const site = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'site.json'), 'utf8'));
const coverage = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'coverage.json'), 'utf8'));
const strings = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'strings.ru.json'), 'utf8'));
const translations = {
  hy: JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'translations', 'hy.json'), 'utf8')),
  en: JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'translations', 'en.json'), 'utf8'))
};

const OWN_ROUTES = new Set(['/', '/booking', '/quiz']);
const translatedPages = pages.filter((page) => page.translate);
const knownPaths = new Set([...OWN_ROUTES, ...pages.map((page) => `/${page.slug}`)]);

function toSchemaShape(fields, content) {
  const out = {};
  for (const field of fields) {
    const value = content[field.key];
    if (field.kind === 'list') out[field.key] = (value || []).map((item) => toSchemaShape(field.fields, item));
    else if (field.multilingual) out[`${field.key}_ru`] = value ?? null;
    else if (value !== undefined) out[field.key] = value;
  }
  return out;
}

function internalLinks(value, out = new Set()) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/href="(\/[^"#?]*)/g)) out.add(match[1]);
    if (/^\/[a-z0-9/-]*$/.test(value)) out.add(value);
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => internalLinks(item, out));
  }
  return out;
}

describe('imported pages', () => {
  test('no page shows the Russian discount picture', () => {
    expect(pages.filter((page) => JSON.stringify(page.sections).includes('2climatecentr_banner')).map((page) => page.slug)).toEqual([]);
  });

  test('removing prices left no heading without words and no empty text', () => {
    const broken = [];
    for (const page of pages) {
      page.sections.forEach((section, index) => {
        const { heading, body } = section.content;
        if (heading && !/\p{L}/u.test(heading)) broken.push(`${page.slug} #${index}: heading "${heading}"`);
        if (section.block_type === 'rich_text' && !/<img/.test(body || '') && !/\p{L}/u.test(`${heading || ''}${(body || '').replace(/<[^>]+>/g, '')}`)) broken.push(`${page.slug} #${index}: empty text`);
        if (section.block_type === 'rich_text' && heading && !body) broken.push(`${page.slug} #${index}: heading with nothing under it`);
      });
    }
    expect(broken).toEqual([]);
  });

  test('every page in the Russian sitemap is accounted for', () => {
    const slugs = new Set(pages.map((page) => (page.slug === 'home' ? '/' : `/${page.slug}`)));
    expect(coverage.sitemap.length).toBeGreaterThanOrEqual(66);
    expect(coverage.sitemap.filter((pagePath) => !slugs.has(pagePath))).toEqual([]);
  });

  test('the works gallery and every kind of page are there', () => {
    const types = new Set(pages.map((page) => page.type));
    expect([...types].sort()).toEqual(['article', 'fault', 'gallery', 'home', 'listing', 'service', 'static']);
    expect(pages.find((page) => page.slug === 'nashi-raboty').type).toBe('gallery');
    expect(site.works.length).toBeGreaterThanOrEqual(100);
  });

  test.each(pages.map((page) => [page.slug, page]))('%s only holds sections its block types allow', (_slug, page) => {
    for (const { block_type, content } of page.sections) {
      const type = getBlockType(block_type);
      expect(type).toBeTruthy();
      expect(validateBlockType(block_type, toSchemaShape(type.fields, content))).toEqual(expect.objectContaining({ ok: true }));
    }
  });

  test('pages that are published have something on them', () => {
    const empty = pages.filter((page) => page.status === 'published' && !page.sections.length).map((page) => page.slug);
    expect(empty).toEqual([]);
  });

  test('pages specific to Russia stay hidden', () => {
    for (const slug of ['politika-konfidencialnosti', 'polzovatelskoe-soglashenie', 'pokupki-v-kredit', 'vakansiya']) {
      const page = pages.find((candidate) => candidate.slug === slug);
      expect([slug, page.status, page.translate]).toEqual([slug, 'hidden', false]);
    }
  });

  test('service pages have a parent listing, for breadcrumbs', () => {
    const orphans = pages.filter((page) => ['service', 'fault'].includes(page.type) && !page.parent).map((page) => page.slug);
    expect(orphans).toEqual([]);
  });

  test('internal links lead somewhere', () => {
    const broken = [];
    for (const page of translatedPages) {
      for (const link of internalLinks(page.sections)) {
        const target = link.length > 1 ? link.replace(/\/$/, '') : link;
        if (!knownPaths.has(target) && !target.startsWith('/sites/')) broken.push(`${page.slug} -> ${link}`);
      }
    }
    expect(broken).toEqual([]);
  });
});

describe('what the original site shows', () => {
  const page = (slug) => pages.find((item) => item.slug === slug);
  const blocks = (slug, type) => page(slug).sections.filter((item) => item.block_type === type);
  const text = (slug) => JSON.stringify(page(slug).sections);

  test.each([
    ['kak-ustanovit-kondicioner-svoimi-rukami-poshagovaya-instrukciya', 'ustanovka.jpg'],
    ['kogda-i-kak-provodit-remont-kondicionera-v-kvartire', 'kvartira.jpg'],
    ['usluga/chistka-kondicionerov', 'service-paket.jpg']
  ])('%s keeps its picture %s', (slug, file) => {
    expect(text(slug)).toContain(file);
  });

  test('a picture inside a heading is kept, ahead of the text', () => {
    const withPictures = pages.flatMap((item) => item.sections).filter((item) => item.block_type === 'rich_text' && item.content.heading && /^<(a [^>]*><img|img)/.test(item.content.body || ''));
    expect(withPictures.length).toBeGreaterThanOrEqual(8);
  });

  test.each([
    ['usluga/remont-kondicionerov', 'работает много лет'],
    ['usluga/ustanovka-kondicionerov', 'специализируемся на установке']
  ])('%s keeps the text beside its video', (slug, words) => {
    expect(text(slug)).toContain(words);
  });

  test('the cleaning page keeps its video', () => {
    expect(blocks('usluga/chistka-kondicionerov', 'video').map((item) => item.content.video_url)).toContain('https://www.youtube.com/embed/y1xyPI8hFAg');
  });

  test('the repair page lists the warning signs on their own', () => {
    const [signs] = blocks('usluga/remont-kondicionerov', 'signs');
    expect(signs.content.items).toHaveLength(5);
    expect(signs.content.body).toMatch(/^<p>/);
    expect(signs.content.body).not.toContain('<ul');
  });

  test.each(['usluga/remont-kondicionerov', 'usluga/ustanovka-kondicionerov'])('the brand list on %s is in two columns', (slug) => {
    expect(text(slug)).toContain('<ul class=\\"two-columns\\">');
  });

  test('the highlights keep their pictures and icons', () => {
    const remont = blocks('usluga/remont-kondicionerov', 'callout');
    const icons = remont.find((item) => item.content.items.every((point) => point.icon_url));
    expect(icons.content.items).toHaveLength(6);
    expect(remont.find((item) => item.content.image_url && item.content.items.length)).toBeTruthy();
    expect(blocks('usluga/ustanovka-kondicionerov', 'callout').find((item) => item.content.image_url && !item.content.items.length)).toBeTruthy();
  });

  test('the picture is on the right where the text comes first', () => {
    expect(blocks('usluga/remont-kondicionerov', 'image_text')[0].content.image_side).toBe('right');
    expect(blocks('home', 'image_text')[0].content.image_side || 'left').toBe('left');
  });

  test('forms inside a service page are the two-part kind, and the home form is not', () => {
    expect(blocks('usluga/remont-kondicionerov', 'request_form')[0].content.layout).toBe('split');
    expect(blocks('home', 'request_form')[0].content.layout || 'row').toBe('row');
  });

  test('no published page sends visitors to the old site', () => {
    const published = pages.filter((item) => item.status === 'published');
    expect(published.filter((item) => JSON.stringify(item.sections).includes('climatecentr.ru')).map((item) => item.slug)).toEqual([]);
  });

  test('the contacts page has a map between the details and the form', () => {
    expect(page('kontakty').sections.map((item) => item.block_type)).toEqual(['contacts_strip', 'map', 'request_form']);
  });

  test('bold headings in running text stay black, as on the original', () => {
    const headings = page('usluga/remont-kondicionerov').sections.map((item) => item.content.heading || '');
    expect(headings.filter((heading) => /бытовых/i.test(heading))).toEqual(['Ремонт бытовых кондиционеров на дому - акцент на профессионалов']);
    expect(headings.filter((heading) => /^\*\*Цены\*\*/.test(heading))).toHaveLength(1);
  });
});

describe('regional text', () => {
  const REGIONAL = /Москв|Московск|Подмосков|МКАД|рубл|₽|\bруб\b/;
  const everything = JSON.stringify([translatedPages, site]);

  test('nothing about Moscow or rubles is left in the source text', () => {
    expect(everything.match(new RegExp(`.{30}(?:${REGIONAL.source}).{30}`, 'g'))).toBeNull();
  });

  test('the Russian phone, email and company details are gone', () => {
    expect(everything).not.toMatch(/\+7\s?\(?495|8\s?\(?495|mail@climatecentr|haisberg|ИНН\s|ОГРН\s/);
  });

  test('no amount is left in a price field', () => {
    const prices = [];
    JSON.stringify(translatedPages, (key, value) => {
      if (key === 'price' && /\d/.test(value || '')) prices.push(value);
      return value;
    });
    expect(prices).toEqual([]);
  });
});

describe.each(['hy', 'en'])('%s translations', (lang) => {
  const table = translations[lang];
  const entries = Object.entries(strings);

  test('cover every text', () => {
    const missing = entries.filter(([key]) => !table[key]).map(([, text]) => text.slice(0, 70));
    expect(missing).toEqual([]);
  });

  test('have no entries for text that no longer exists', () => {
    expect(Object.keys(table).filter((key) => !strings[key])).toEqual([]);
  });

  test('are keyed by the text they translate', () => {
    for (const [key, text] of entries) {
      expect(crypto.createHash('sha1').update(text).digest('hex').slice(0, 16)).toBe(key);
    }
  });

  test('keep the pictures and links of the original', () => {
    const differ = [];
    const count = (text, pattern) => (text.match(pattern) || []).length;
    for (const [key, text] of entries) {
      const translated = table[key];
      if (!translated) continue;
      for (const pattern of [/<img\b/g, /<a\b/g, /media:[^"'\s]+/g, /<table\b/g]) {
        if (count(text, pattern) !== count(translated, pattern)) differ.push(`${key} ${pattern}`);
      }
    }
    expect(differ).toEqual([]);
  });

  test('contain no Russian or regional text', () => {
    const left = Object.entries(table).filter(([, text]) => /[А-Яа-яЁё]/.test(text.replace(/<[^>]+>/g, ''))).map(([key]) => key);
    expect(left).toEqual([]);
  });
});
