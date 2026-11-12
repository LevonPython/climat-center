// Loads the tracked content in server/content into a database and file storage.
// Local:      npm run content:import -w server
// Production: DATABASE_URL='...' BLOB_READ_WRITE_TOKEN='...' npm run content:import -w server -- --remote
// Safe to rerun: pages, services and settings that exist are left alone, so edits made in the admin survive.
// Menu items and gallery pictures deleted in the admin come back. --overwrite replaces pages.
// --overwrite --only=slug,slug replaces just those pages and touches nothing else.
// --fill-language=ar adds one language to a database that already has content; see fillLanguage.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Only when run by hand. Tests import this file and must never pick up a real upload token.
if (require.main === module) require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { query } = require('../../src/config/db');
const { getBlockType } = require('../../src/contentSchemas/blockTypes');
const { validateContentJson } = require('../../src/contentSchemas/validate');
const { mediaRepository } = require('../../src/repositories/mediaRepository');
const { pageRepository } = require('../../src/repositories/pageRepository');
const { sectionRepository } = require('../../src/repositories/sectionRepository');
const { sanitizeRichText } = require('../../src/services/contentSanitizer');
const { storeFile } = require('../../src/services/fileStorage');
const galleryService = require('../../src/services/galleryService');
const navService = require('../../src/services/navService');
const pageService = require('../../src/services/pageService');
const { LANGS } = require('../../src/services/localization');
const sectionService = require('../../src/services/sectionService');

const DEFAULT_CONTENT_DIR = path.join(__dirname, '..', '..', 'content');
const TRANSLATED_LANGS = LANGS.filter((lang) => lang !== 'ru');
const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf'
};
const UNSAFE_SVG = /<script|\son\w+\s*=|javascript:/i;
// These existing services become the pages with the same meaning, so booking links stay valid.
const EXISTING_SERVICES = {
  'usluga/ustanovka-kondicionerov': 'air conditioner installation',
  'usluga/remont-kondicionerov': 'air conditioner repair',
  'usluga/chistka-kondicionerov': 'air conditioner cleaning'
};
const SERVICE_TYPES = { 'usluga/ustanovka-kondicionerov': 'install', 'usluga/remont-kondicionerov': 'repair' };
// Pages this project has and the Russian site doesn't, so they aren't in the crawl.
const OWN_MENU_ITEMS = [
  { url: '/booking', label_ru: 'Онлайн-запись', label_en: 'Online booking', label_hy: 'Առցանց գրանցում', label_ar: 'الحجز عبر الإنترنت' },
  { url: '/quiz', label_ru: 'Быстрый подбор', label_en: 'Quick quiz', label_hy: 'Արագ հարցում', label_ar: 'استبيان سريع' }
];
const CITY_ITEM = { url: '/', label_ru: 'Ереван', label_en: 'Yerevan', label_hy: 'Երևան', label_ar: 'يريفان' };

function textHash(text) {
  return crypto.createHash('sha1').update(text).digest('hex').slice(0, 16);
}

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}

function loadContent(contentDir) {
  const pagesDir = path.join(contentDir, 'pages');
  return {
    pages: fs.readdirSync(pagesDir).filter((name) => name.endsWith('.json')).sort().map((name) => readJson(path.join(pagesDir, name))),
    site: readJson(path.join(contentDir, 'site.json')),
    translations: Object.fromEntries(TRANSLATED_LANGS.map((lang) => [lang, readJson(path.join(contentDir, 'translations', `${lang}.json`), {})]))
  };
}

function createTranslator(translations, report) {
  return function translate(lang, text) {
    if (!text) return null;
    if (lang === 'ru') return text;
    const translated = translations[lang][textHash(text)];
    if (!translated) {
      report.missingTranslations.add(`${lang}: ${text.slice(0, 60)}`);
      return null;
    }
    return translated;
  };
}

// Stored files keep their name and size, which is how a rerun recognises them.
// With store: false it only finds files already stored, and never uploads.
function createMediaStore(rawFilesDir, report, { store = true } = {}) {
  const known = new Map();

  return async function resolve(assetPath) {
    if (known.has(assetPath)) return known.get(assetPath);
    const source = path.join(rawFilesDir, assetPath.replace(/^\/+/, ''));
    if (!fs.existsSync(source)) {
      report.missingFiles.add(assetPath);
      known.set(assetPath, null);
      return null;
    }

    const buffer = fs.readFileSync(source);
    const filename = path.basename(assetPath);
    const mimetype = MIME_TYPES[path.extname(filename).toLowerCase()];
    if (!mimetype || (mimetype === 'image/svg+xml' && UNSAFE_SVG.test(buffer.toString('utf8')))) {
      report.refusedFiles.add(assetPath);
      known.set(assetPath, null);
      return null;
    }

    const existing = await query('SELECT id, url FROM media_assets WHERE filename = $1 AND size_bytes = $2', [filename, buffer.length]);
    if (existing.rows[0] || !store) {
      known.set(assetPath, existing.rows[0] || null);
      return existing.rows[0] || null;
    }

    const url = await storeFile({ originalname: filename, buffer, mimetype });
    const row = await mediaRepository.insert({
      url,
      filename,
      mime_type: mimetype,
      size_bytes: buffer.length,
      kind: mimetype === 'application/pdf' ? 'document' : 'image'
    });
    report.filesStored += 1;
    known.set(assetPath, row);
    return row;
  };
}

async function resolveMediaInText(text, resolveMedia) {
  if (typeof text !== 'string' || !text.includes('media:')) return text;
  const paths = [...new Set([...text.matchAll(/media:([^"'\s]+)/g)].map((match) => match[1]))];
  let out = text;
  for (const assetPath of paths) {
    const asset = await resolveMedia(assetPath);
    out = out.split(`media:${assetPath}`).join(asset ? asset.url : '');
  }
  // A picture whose file is missing would show as a broken image.
  return out.replace(/<img\b[^>]*\ssrc=""[^>]*>/g, '') || null;
}

async function expandContent(fields, content, translate, resolveMedia, translated) {
  const out = {};
  for (const field of fields) {
    const value = content[field.key];
    if (field.kind === 'list') {
      out[field.key] = [];
      for (const item of value || []) {
        out[field.key].push(await expandContent(field.fields, item, translate, resolveMedia, translated));
      }
    } else if (field.multilingual) {
      out[`${field.key}_ru`] = await resolveMediaInText(value || null, resolveMedia);
      for (const lang of TRANSLATED_LANGS) {
        out[`${field.key}_${lang}`] = translated ? await resolveMediaInText(translate(lang, value), resolveMedia) : null;
      }
    } else {
      out[field.key] = (await resolveMediaInText(value ?? null, resolveMedia)) ?? null;
    }
  }
  return out;
}

function pageValues(page, translate, index) {
  const localized = (base, value) => ({
    [`${base}_ru`]: value || null,
    ...Object.fromEntries(TRANSLATED_LANGS.map((lang) => [`${base}_${lang}`, page.translate ? translate(lang, value) : null]))
  });
  return {
    slug: page.slug,
    type: page.type,
    status: page.status,
    sort_order: index,
    ...localized('title', page.title),
    ...localized('meta_title', page.meta_title),
    ...localized('meta_description', page.meta_description),
    ...Object.fromEntries(TRANSLATED_LANGS.map((lang) => [`needs_review_${lang}`, page.translate])),
    needs_review_ru: false
  };
}

async function importPages(pages, translate, resolveMedia, overwrite, report, only) {
  const bySlug = new Map();
  const written = new Set();

  for (const [index, page] of pages.entries()) {
    const existing = await pageRepository.findBySlug(page.slug);
    if (only && !only.has(page.slug)) {
      if (existing) bySlug.set(page.slug, existing);
      continue;
    }
    if (existing && !overwrite) {
      bySlug.set(page.slug, existing);
      report.pagesKept += 1;
      continue;
    }

    const values = pageValues(page, translate, index);
    let row;
    if (existing) {
      row = await pageRepository.update(existing.id, values);
      await query('DELETE FROM content_blocks WHERE page_id = $1', [existing.id]);
      report.pagesReplaced += 1;
    } else {
      row = await pageService.createPage(values);
      report.pagesCreated += 1;
    }
    bySlug.set(page.slug, row);
    written.add(page.slug);

    try {
      for (const { block_type, content, hidden } of page.sections) {
        const content_json = await expandContent(getBlockType(block_type).fields, content, translate, resolveMedia, page.translate && !hidden);
        await sectionService.createSection(row.id, { block_type, content_json, is_visible: !hidden }, null);
      }
    } catch (err) {
      // A kept page is never touched again, so a half-made one must not stay behind.
      if (!existing) await query('DELETE FROM pages WHERE id = $1', [row.id]);
      throw err;
    }
  }

  for (const page of pages) {
    if (written.has(page.slug) && page.parent && bySlug.has(page.parent)) {
      await pageRepository.update(bySlug.get(page.slug).id, { parent_id: bySlug.get(page.parent).id });
    }
  }
  return bySlug;
}

function localizedColumns(base, text, translate) {
  return {
    [`${base}_ru`]: text || null,
    ...Object.fromEntries(TRANSLATED_LANGS.map((lang) => [`${base}_${lang}`, translate(lang, text)]))
  };
}

async function importServices(site, pagesBySlug, pages, translate, report) {
  const pills = new Map(site.pills.map((pill) => [pill.href.replace(/^\//, ''), pill.label]));
  const pageSource = new Map(pages.map((page) => [page.slug, page]));
  const listed = [...site.services.map((item) => ({ ...item, category: 'service' })), ...site.faults.map((item) => ({ ...item, category: 'fault' }))];
  const seen = new Set();

  for (const [index, item] of listed.entries()) {
    const slug = item.href.replace(/^\//, '');
    const page = pagesBySlug.get(slug);
    if (!page || seen.has(slug)) continue;
    seen.add(slug);

    const linked = await query('SELECT id FROM services WHERE page_id = $1', [page.id]);
    if (linked.rows[0]) {
      report.servicesKept += 1;
      continue;
    }

    const source = pageSource.get(slug);
    const columns = {
      page_id: page.id,
      category: item.category,
      type: SERVICE_TYPES[slug] || 'service',
      sort_order: index,
      show_in_menu: true,
      show_in_pills: pills.has(slug),
      is_active: true,
      ...localizedColumns('title', source.title, translate),
      ...localizedColumns('description', source.meta_description, translate),
      ...localizedColumns('menu_title', item.label, translate),
      ...localizedColumns('pill_title', pills.get(slug), translate)
    };

    const existingTitle = EXISTING_SERVICES[slug];
    const existing = existingTitle
      ? await query('SELECT id FROM services WHERE page_id IS NULL AND lower(title_en) = $1 LIMIT 1', [existingTitle])
      : { rows: [] };
    const names = Object.keys(columns);
    if (existing.rows[0]) {
      const sets = names.map((name, position) => `${name} = $${position + 1}`).join(', ');
      await query(`UPDATE services SET ${sets} WHERE id = $${names.length + 1}`, [...Object.values(columns), existing.rows[0].id]);
    } else {
      const placeholders = names.map((_, position) => `$${position + 1}`).join(', ');
      await query(`INSERT INTO services (${names.join(', ')}) VALUES (${placeholders})`, Object.values(columns));
    }
    report.servicesLinked += 1;
  }
}

async function importGallery(collection, items, translate, resolveMedia, isVisible) {
  for (const item of items) {
    const asset = item.image ? await resolveMedia(item.image.replace(/^media:/, '')) : null;
    if (!asset) continue;
    const existing = await query('SELECT 1 FROM gallery_items WHERE collection = $1 AND media_id = $2', [collection, asset.id]);
    if (existing.rowCount) continue;
    await galleryService.createItem({
      collection,
      media_id: asset.id,
      is_visible: isVisible,
      title_ru: item.title || null,
      // Brand names read the same in every language.
      ...Object.fromEntries(TRANSLATED_LANGS.map((lang) => [`title_${lang}`, collection === 'brands' ? item.title || null : translate(lang, item.title)]))
    });
  }
}

async function addMenuItem(location, target, labels, sort_order) {
  const existing = target.page_id
    ? await query('SELECT 1 FROM nav_items WHERE location = $1 AND page_id = $2', [location, target.page_id])
    : await query('SELECT 1 FROM nav_items WHERE location = $1 AND url = $2', [location, target.url]);
  if (existing.rowCount) return;
  await navService.createItem({ location, ...target, ...labels, sort_order, is_visible: true });
}

async function importMenus(site, pagesBySlug, translate) {
  const fromSite = (items) =>
    items.map((item) => {
      const page = pagesBySlug.get(item.href.replace(/^\//, ''));
      return { target: page ? { page_id: page.id } : { url: item.href }, labels: localizedColumns('label', item.label, translate) };
    });
  const own = OWN_MENU_ITEMS.map(({ url, ...labels }) => ({ target: { url }, labels }));
  const { url: cityUrl, ...cityLabels } = CITY_ITEM;
  const footerLinks = site.footer_links || [];

  const menus = {
    topbar: [...fromSite(site.topbar), ...own],
    header: fromSite(site.header),
    footer: fromSite(footerLinks),
    mobile: [...fromSite(site.topbar), ...fromSite(site.header), ...own],
    cities: [{ target: { url: cityUrl }, labels: cityLabels }]
  };

  for (const [location, items] of Object.entries(menus)) {
    for (const [index, { target, labels }] of items.entries()) {
      await addMenuItem(location, target, labels, index);
    }
  }
}

async function importSettings(site, translate, resolveMedia, overwrite) {
  const localized = (base, text) => localizedColumns(base, text, translate);
  const blocks = {
    branding: {
      ...localized('site_name', site.branding.site_name),
      ...localized('tagline', site.branding.tagline),
      logo_url: await resolveMediaInText(site.branding.logo_url, resolveMedia),
      hero_image_url: await resolveMediaInText(site.branding.hero_image_url, resolveMedia)
    },
    header: {
      ...localized('hours_text', site.header_texts.hours_text),
      ...localized('arrival_text', site.header_texts.arrival_text),
      ...localized('free_visit_text', site.header_texts.free_visit_text),
      ...localized('cta_label', site.header_texts.cta_label)
    },
    footer: {
      ...localized('copyright', null),
      ...localized('disclaimer', site.footer.disclaimer)
    }
  };

  for (const [section_name, content] of Object.entries(blocks)) {
    await query(
      `
      INSERT INTO content_blocks (page_name, section_name, content_json)
      VALUES ('global', $1, $2)
      ON CONFLICT (page_name, section_name) ${overwrite ? 'DO UPDATE SET content_json = EXCLUDED.content_json' : 'DO NOTHING'}
    `,
      [section_name, content]
    );
  }
}

async function runImport({ contentDir = DEFAULT_CONTENT_DIR, overwrite = false, only = null } = {}) {
  const report = {
    pagesCreated: 0,
    pagesKept: 0,
    pagesReplaced: 0,
    servicesLinked: 0,
    servicesKept: 0,
    filesStored: 0,
    missingTranslations: new Set(),
    missingFiles: new Set(),
    refusedFiles: new Set()
  };
  const { pages, site, translations } = loadContent(contentDir);
  const unknown = (only || []).filter((slug) => !pages.some((page) => page.slug === slug));
  if (unknown.length) throw new Error(`No such pages to import: ${unknown.join(', ')}`);
  const selected = only && new Set(only);
  const translate = createTranslator(translations, report);
  const resolveMedia = createMediaStore(path.join(contentDir, 'raw', 'files'), report);

  const pagesBySlug = await importPages(pages, translate, resolveMedia, overwrite, report, selected);
  if (selected) return report;
  await importServices(site, pagesBySlug, pages, translate, report);
  await importGallery('brands', site.brands, translate, resolveMedia, true);
  // Certificates are Russian documents, so they stay hidden until someone publishes the ones that apply.
  await importGallery('certificates', site.certificates, translate, resolveMedia, false);
  await importGallery('works', site.works, translate, resolveMedia, true);
  await importMenus(site, pagesBySlug, translate);
  await importSettings(site, translate, resolveMedia, overwrite);
  return report;
}

// Maps each Russian text, as the import stored it, to its translation stored the same way.
// Sanitized forms are added first, so a plain text whose two forms are equal keeps its unsanitized translation.
async function buildTranslationMap(contentDir, lang, resolveMedia) {
  const { translations } = loadContent(contentDir);
  const strings = readJson(path.join(contentDir, 'strings.ru.json'), {});
  const pairs = [
    ...Object.entries(strings).map(([key, russian]) => [russian, translations[lang][key]]),
    ...[...OWN_MENU_ITEMS, CITY_ITEM].map((item) => [item.label_ru, item[`label_${lang}`]])
  ];
  const map = new Map();
  for (const [russian, translated] of pairs) {
    if (!russian || !translated) continue;
    const storedRussian = await resolveMediaInText(russian, resolveMedia);
    const storedTranslation = await resolveMediaInText(translated, resolveMedia);
    if (!storedRussian || !storedTranslation) continue;
    map.set(sanitizeRichText(storedRussian), sanitizeRichText(storedTranslation));
    map.set(storedRussian, storedTranslation);
  }
  return map;
}

// Adds one language to a database that already has content. It fills only empty fields, and only where the
// Russian is still the text the import wrote, so nothing an editor changed is touched. Safe to rerun.
async function fillLanguage(lang, { contentDir = DEFAULT_CONTENT_DIR } = {}) {
  if (!TRANSLATED_LANGS.includes(lang)) throw new Error(`No such language to fill: ${lang}`);
  const report = { fieldsFilled: 0, pagesMarked: 0, unfilled: [], missingFiles: new Set(), refusedFiles: new Set() };
  const resolveMedia = createMediaStore(path.join(contentDir, 'raw', 'files'), report, { store: false });
  const map = await buildTranslationMap(contentDir, lang, resolveMedia);
  const others = TRANSLATED_LANGS.filter((other) => other !== lang);

  // A field only Russian has is Russia-only content, left untranslated on purpose, so it isn't reported.
  function translateField(values, base, where) {
    const russian = values[`${base}_ru`];
    if (typeof russian !== 'string' || !russian || values[`${base}_${lang}`]) return null;
    const translated = map.get(russian);
    if (translated) return translated;
    if (others.some((other) => values[`${base}_${other}`])) report.unfilled.push(`${where}: ${base}`);
    return null;
  }

  function fillColumns(row, bases, where) {
    const filled = {};
    for (const base of bases) {
      const translated = translateField(row, base, where);
      if (translated) filled[`${base}_${lang}`] = translated;
    }
    report.fieldsFilled += Object.keys(filled).length;
    return filled;
  }

  function fillContent(value, where) {
    if (Array.isArray(value)) return value.map((item) => fillContent(item, where));
    if (!value || typeof value !== 'object') return value;
    const out = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, fillContent(child, where)]));
    for (const key of Object.keys(value).filter((name) => name.endsWith('_ru'))) {
      const base = key.slice(0, -'_ru'.length);
      const translated = translateField(value, base, where);
      if (!translated) continue;
      out[`${base}_${lang}`] = translated;
      report.fieldsFilled += 1;
    }
    return out;
  }

  const pages = await query('SELECT * FROM pages ORDER BY sort_order, slug');
  for (const page of pages.rows) {
    const filled = fillColumns(page, ['title', 'meta_title', 'meta_description'], `/${page.slug}`);
    if (!Object.keys(filled).length) continue;
    await pageRepository.update(page.id, { ...filled, [`needs_review_${lang}`]: true });
    report.pagesMarked += 1;
  }

  const sections = await query(
    'SELECT b.id, b.content_json, p.slug FROM content_blocks b JOIN pages p ON p.id = b.page_id ORDER BY p.sort_order, p.slug, b.sort_order'
  );
  for (const section of sections.rows) {
    const content = fillContent(section.content_json, `/${section.slug} section`);
    if (JSON.stringify(content) !== JSON.stringify(section.content_json)) {
      await sectionService.updateSection(section.id, { content_json: content }, null);
    }
  }

  const blocks = await query("SELECT id, page_name, section_name, content_json FROM content_blocks WHERE page_name = 'global'");
  for (const block of blocks.rows) {
    const content = fillContent(block.content_json, `site settings: ${block.section_name}`);
    if (JSON.stringify(content) === JSON.stringify(block.content_json)) continue;
    const check = validateContentJson(block.page_name, block.section_name, content);
    if (!check.ok) throw new Error(`Site settings ${block.section_name} would not validate: ${check.message}`);
    await query('UPDATE content_blocks SET content_json = $1 WHERE id = $2', [content, block.id]);
    await sectionRepository.insertVersion(block.id, null, content);
  }

  const services = await query('SELECT s.*, p.slug FROM services s LEFT JOIN pages p ON p.id = s.page_id');
  for (const service of services.rows) {
    const filled = fillColumns(service, ['title', 'description', 'menu_title', 'pill_title'], `service ${service.slug ? `/${service.slug}` : service.id}`);
    if (Object.keys(filled).length) await query(...updateStatement('services', service.id, filled));
  }

  const navItems = await query('SELECT n.*, p.slug FROM nav_items n LEFT JOIN pages p ON p.id = n.page_id');
  for (const item of navItems.rows) {
    const filled = fillColumns(item, ['label'], `menu ${item.location}: ${item.slug ? `/${item.slug}` : item.url}`);
    if (Object.keys(filled).length) await query(...updateStatement('nav_items', item.id, filled));
  }

  const galleryItems = await query('SELECT * FROM gallery_items');
  for (const item of galleryItems.rows) {
    // Brand names read the same in every language.
    const isBrand = item.collection === 'brands';
    const filled = isBrand ? (item.title_ru && !item[`title_${lang}`] ? { [`title_${lang}`]: item.title_ru } : {}) : fillColumns(item, ['title'], `gallery ${item.collection}`);
    if (isBrand) report.fieldsFilled += Object.keys(filled).length;
    if (Object.keys(filled).length) await query(...updateStatement('gallery_items', item.id, filled));
  }

  return report;
}

// Column names come from the language list and fixed field names, never from the data.
function updateStatement(table, id, values) {
  const names = Object.keys(values);
  const sets = names.map((name, position) => `${name} = $${position + 1}`).join(', ');
  return [`UPDATE ${table} SET ${sets} WHERE id = $${names.length + 1}`, [...Object.values(values), id]];
}

async function main() {
  const args = process.argv.slice(2);
  const { hostname, pathname } = new URL(process.env.DATABASE_URL || 'postgres://missing/');
  const isLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
  console.log(`Target: ${isLocal ? 'LOCAL' : 'REMOTE'} database=${pathname.slice(1)}`);

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!isLocal && !args.includes('--remote')) throw new Error('Refusing a remote database without --remote.');
  const overwrite = args.includes('--overwrite');
  const only = args.find((arg) => arg.startsWith('--only='))?.slice('--only='.length).split(',');
  const fill = args.find((arg) => arg.startsWith('--fill-language='))?.slice('--fill-language='.length);
  if (only && !overwrite) throw new Error('--only needs --overwrite.');
  if (fill && (overwrite || only)) throw new Error('--fill-language works on its own.');
  // Without Blob storage, files on a remote import would land on this computer and show as broken links.
  if (!isLocal && !fill && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error('A remote import needs BLOB_READ_WRITE_TOKEN.');
  if (isLocal) delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.PUBLIC_SITE_URL;

  if (fill) {
    const report = await fillLanguage(fill);
    console.log(`Filled ${report.fieldsFilled} fields in ${fill}. Pages marked for review: ${report.pagesMarked}.`);
    console.log(`Not filled, because the text differs from what the import wrote. Translate these in the admin: ${report.unfilled.length}.`);
    for (const line of report.unfilled) console.log(`  ${line}`);
    return;
  }

  const report = await runImport({ overwrite, only });
  console.log(`Pages: ${report.pagesCreated} created, ${report.pagesReplaced} replaced, ${report.pagesKept} kept.`);
  console.log(`Services: ${report.servicesLinked} linked, ${report.servicesKept} kept. Files stored: ${report.filesStored}.`);
  console.log(`Missing translations: ${report.missingTranslations.size}. Missing files: ${report.missingFiles.size}. Refused files: ${report.refusedFiles.size}.`);
  for (const file of [...report.missingFiles].slice(0, 20)) console.log(`  missing file: ${file}`);
  for (const file of report.refusedFiles) console.log(`  refused file: ${file}`);
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => require('../../src/config/db').closePool());
}

module.exports = { fillLanguage, runImport, textHash };
