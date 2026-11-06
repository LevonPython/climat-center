const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.UPLOAD_DIR = 'uploads-import-test';

const { closePool, query } = require('../src/config/db');
const { requireDatabaseUrl } = require('./helpers/db');
const { setupApi } = require('./helpers/api');

const dbUrl = requireDatabaseUrl();
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads-import-test');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const hash = (text) => crypto.createHash('sha1').update(text).digest('hex').slice(0, 16);

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

function writeFile(root, assetPath, data) {
  const target = path.join(root, 'raw', 'files', assetPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
}

function buildContent(root) {
  const page = (slug, extra) => ({ slug, type: 'article', parent: null, status: 'published', translate: true, title: `Заголовок ${slug}`, meta_title: null, meta_description: null, sections: [], ...extra });

  writeJson(path.join(root, 'pages', 'home.json'), page('home', { type: 'home', title: 'Главная' }));
  writeJson(path.join(root, 'pages', 'uslugi__uslugi-i-servis.json'), page('uslugi/uslugi-i-servis', { type: 'listing', title: 'Услуги' }));
  writeJson(
    path.join(root, 'pages', 'usluga__remont.json'),
    page('usluga/remont', {
      type: 'service',
      parent: 'uslugi/uslugi-i-servis',
      title: 'Ремонт',
      sections: [
        { block_type: 'rich_text', content: { heading: 'Как мы работаем', body: '<p>Текст <img src="media:/one.png" alt="x"></p><script>alert(1)</script>' } },
        { block_type: 'steps', content: { heading: null, items: [{ title: 'Шаг', description: null, image_url: 'media:/one.png' }] } },
        { block_type: 'rich_text', hidden: true, content: { heading: 'Отзывы', body: '<p>Юлия</p>' } }
      ]
    })
  );
  writeJson(path.join(root, 'pages', 'usluga__ustanovka-kondicionerov.json'), page('usluga/ustanovka-kondicionerov', { type: 'service', title: 'Установка' }));
  writeJson(path.join(root, 'pages', 'vakansiya.json'), page('vakansiya', { type: 'static', status: 'hidden', translate: false, title: 'Вакансия', sections: [{ block_type: 'rich_text', content: { heading: 'Только на русском', body: null } }] }));

  writeJson(path.join(root, 'site.json'), {
    pills: [{ label: 'Ремонт', href: '/usluga/remont' }],
    services: [{ label: 'Ремонт кондиционеров', href: '/usluga/remont' }, { label: 'Установка', href: '/usluga/ustanovka-kondicionerov' }],
    faults: [],
    topbar: [{ label: 'Услуги', href: '/uslugi/uslugi-i-servis' }],
    header: [{ label: 'Скрытая', href: '/vakansiya' }],
    footer_links: [],
    brands: [{ image: 'media:/one.png', title: 'LG' }],
    certificates: [{ image: 'media:/two.png', title: 'Сертификат' }],
    works: [{ image: 'media:/one.png', title: '' }],
    header_texts: { hours_text: 'Круглосуточно', arrival_text: null, free_visit_text: null, cta_label: null },
    branding: { site_name: 'Центр', tagline: null, logo_url: 'media:/one.png', hero_image_url: 'media:/missing.png' },
    footer: { disclaimer: 'Примечание' }
  });

  const hy = (text) => `HY ${text}`;
  const strings = ['Главная', 'Услуги', 'Ремонт', 'Установка', 'Как мы работаем', 'Шаг', 'Ремонт кондиционеров', 'Сертификат', 'Скрытая', 'Круглосуточно', 'Центр', 'Примечание', 'Заголовок home'];
  const translations = Object.fromEntries(strings.map((text) => [hash(text), hy(text)]));
  translations[hash('<p>Текст <img src="media:/one.png" alt="x"></p><script>alert(1)</script>')] = '<p>HY Տեքստ <img src="media:/one.png" alt="x"></p>';
  writeJson(path.join(root, 'translations', 'hy.json'), translations);
  writeJson(path.join(root, 'translations', 'en.json'), {});

  writeFile(root, 'one.png', PNG);
  writeFile(root, 'two.png', Buffer.concat([PNG, Buffer.from('x')]));
}

if (!dbUrl) {
  test.skip('content import requires DATABASE_URL', () => {});
} else {
  const { runImport } = require('../scripts/content/import');

  describe('content import', () => {
    let api;
    let root;
    let logSpy;
    let existingServiceId;

    beforeAll(async () => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      api = await setupApi();
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'content-import-'));
      buildContent(root);
      const existing = await query("INSERT INTO services (type, title_en) VALUES ('install', 'Air conditioner installation') RETURNING id");
      existingServiceId = existing.rows[0].id;
    });

    afterAll(async () => {
      logSpy.mockRestore();
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(UPLOAD_ROOT, { recursive: true, force: true });
      await closePool();
    });

    describe('first run', () => {
      let report;

      beforeAll(async () => {
        report = await runImport({ contentDir: root });
      });

      test('creates the pages and reports what it could not do', () => {
        expect(report.pagesCreated).toBe(5);
        expect(report.missingFiles).toEqual(new Set(['/missing.png']));
        expect(report.filesStored).toBe(2);
        expect([...report.missingTranslations].some((line) => line.startsWith('en:'))).toBe(true);
      });

      test('a published page opens with its text in each language', async () => {
        const hy = await api.anon.get('/api/pages/hy/usluga/remont');
        const ru = await api.anon.get('/api/pages/ru/usluga/remont');
        expect(hy.status).toBe(200);
        expect(hy.body.page.title).toBe('HY Ремонт');
        expect(ru.body.page.title).toBe('Ремонт');
        expect(hy.body.page.sections[0].content.heading).toBe('HY Как мы работаем');
      });

      test('a language without a translation has no text, rather than Russian', async () => {
        const en = await api.anon.get('/api/pages/en/usluga/remont');
        expect(en.body.page.title).toBeNull();
      });

      test('rich text goes through the sanitizer and points at stored files', async () => {
        const { body } = await api.anon.get('/api/pages/ru/usluga/remont');
        const html = body.page.sections[0].content.body;
        expect(html).not.toContain('<script');
        expect(html).not.toContain('media:');
        expect(html).toMatch(/src="\/uploads\/[^"]+one\.png"/);
        expect(body.page.sections[1].content.items[0].image_url).toMatch(/^\/uploads\//);
      });

      test('a section marked hidden is imported but stays off the page, for an editor to review', async () => {
        const { body } = await api.anon.get('/api/pages/ru/usluga/remont');
        expect(body.page.sections.map((item) => item.content.heading)).not.toContain('Отзывы');
        const { pages } = (await api.admin.get('/api/admin/pages')).body;
        const repair = pages.find((page) => page.slug === 'usluga/remont');
        const { sections } = (await api.admin.get(`/api/admin/pages/${repair.id}`)).body.page;
        const hidden = sections.find((item) => item.content_json.heading_ru === 'Отзывы');
        expect(hidden.is_visible).toBe(false);
        expect(hidden.content_json.heading_hy).toBeNull();
      });

      test('breadcrumbs follow the parent page', async () => {
        const { body } = await api.anon.get('/api/pages/hy/usluga/remont');
        expect(body.page.breadcrumbs.map((crumb) => crumb.href)).toEqual(['/uslugi/uslugi-i-servis']);
      });

      test('pages kept hidden stay off the site', async () => {
        expect((await api.anon.get('/api/pages/ru/vakansiya')).status).toBe(404);
        const slugs = (await api.anon.get('/api/pages/slugs')).body.pages.map((page) => page.slug);
        expect(slugs).not.toContain('vakansiya');
      });

      test('marks translated pages for review, and not the ones in Russian only', async () => {
        const { pages } = (await api.admin.get('/api/admin/pages')).body;
        const repair = pages.find((page) => page.slug === 'usluga/remont');
        const vacancy = pages.find((page) => page.slug === 'vakansiya');
        expect([repair.needs_review_hy, repair.needs_review_en, repair.needs_review_ru]).toEqual([true, true, false]);
        expect([vacancy.needs_review_hy, vacancy.title_hy]).toEqual([false, null]);
      });

      test('services link to their pages, with menu and banner labels', async () => {
        const { services } = (await api.anon.get('/api/site/hy')).body;
        const repair = services.service.find((service) => service.href === '/usluga/remont');
        expect(repair.menu_title).toBe('HY Ремонт кондиционеров');
        expect(repair.pill_title).toBe('HY Ремонт');
        expect(repair.show_in_pills).toBe(true);
      });

      test('an existing service with the same meaning is linked, not duplicated, so bookings stay valid', async () => {
        const rows = await query('SELECT page_id FROM services WHERE id = $1', [existingServiceId]);
        expect(rows.rows[0].page_id).not.toBeNull();
        const linked = await query("SELECT COUNT(*)::int AS n FROM services s JOIN pages p ON p.id = s.page_id WHERE p.slug = 'usluga/ustanovka-kondicionerov'");
        expect(linked.rows[0].n).toBe(1);
      });

      test('brands are public, and certificates wait to be published', async () => {
        const { galleries } = (await api.anon.get('/api/site/hy')).body;
        expect(galleries.brands.map((item) => item.title)).toEqual(['LG']);
        expect(galleries.certificates).toBeUndefined();
        const hiddenOnes = (await api.admin.get('/api/admin/galleries?collection=certificates')).body.items;
        expect(hiddenOnes).toHaveLength(1);
        expect(hiddenOnes[0].is_visible).toBe(false);
      });

      test('menus are built, including our own pages and a hidden page leaving no link', async () => {
        const { nav } = (await api.anon.get('/api/site/hy')).body;
        expect(nav.topbar.map((item) => item.href)).toEqual(['/uslugi/uslugi-i-servis', '/booking', '/quiz']);
        expect(nav.header).toBeUndefined();
        expect(nav.cities.map((item) => item.label)).toEqual(['Երևան']);
      });

      test('settings are stored, and a missing picture is left empty', async () => {
        const { settings } = (await api.anon.get('/api/site/hy')).body;
        expect(settings.branding.site_name).toBe('HY Центр');
        expect(settings.branding.logo_url).toMatch(/^\/uploads\//);
        expect(settings.branding.hero_image_url).toBeNull();
        expect(settings.footer.disclaimer).toBe('HY Примечание');
      });

      test('existing contact details are left alone', async () => {
        const rows = await query("SELECT 1 FROM content_blocks WHERE page_name = 'global' AND section_name = 'contacts'");
        expect(rows.rowCount).toBe(0);
      });

      test('every imported section has a version, so it can be restored', async () => {
        const rows = await query('SELECT COUNT(*)::int AS n FROM content_blocks b WHERE b.page_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM content_block_versions v WHERE v.content_block_id = b.id)');
        expect(rows.rows[0].n).toBe(0);
      });
    });

    describe('running it again', () => {
      test('keeps what editors changed and adds no duplicates', async () => {
        const { pages } = (await api.admin.get('/api/admin/pages')).body;
        const repair = pages.find((page) => page.slug === 'usluga/remont');
        await api.admin.put(`/api/admin/pages/${repair.id}`).send({ title_hy: 'Խմբագրված' });
        const counts = async () => (await query('SELECT (SELECT COUNT(*) FROM media_assets)::int AS media, (SELECT COUNT(*) FROM nav_items)::int AS nav, (SELECT COUNT(*) FROM gallery_items)::int AS gallery, (SELECT COUNT(*) FROM services)::int AS services, (SELECT COUNT(*) FROM content_blocks WHERE page_id IS NOT NULL)::int AS sections')).rows[0];
        const before = await counts();

        const report = await runImport({ contentDir: root });

        expect(report.pagesKept).toBe(5);
        expect(report.pagesCreated).toBe(0);
        expect(report.filesStored).toBe(0);
        expect(await counts()).toEqual(before);
        expect((await api.anon.get('/api/pages/hy/usluga/remont')).body.page.title).toBe('Խմբագրված');
      });

      test('a page an editor moved stays where it is', async () => {
        const { pages } = (await api.admin.get('/api/admin/pages')).body;
        const repair = pages.find((page) => page.slug === 'usluga/remont');
        expect((await api.admin.put(`/api/admin/pages/${repair.id}`).send({ parent_id: null })).status).toBe(200);

        await runImport({ contentDir: root });

        const after = (await query("SELECT parent_id FROM pages WHERE slug = 'usluga/remont'")).rows[0];
        expect(after.parent_id).toBeNull();
      });

      test('a page that fails halfway is not left behind, so the next run can finish it', async () => {
        const file = path.join(root, 'pages', 'broken.json');
        const page = { slug: 'broken', type: 'article', status: 'published', translate: false, title: 'Сломанная', sections: [{ block_type: 'rich_text', content: { heading: 'Часть', body: null } }, { block_type: 'no_such_block', content: {} }] };
        fs.writeFileSync(file, JSON.stringify(page));
        const pagesNamedBroken = async () => (await query("SELECT COUNT(*)::int AS total FROM pages WHERE slug = 'broken'")).rows[0].total;

        await expect(runImport({ contentDir: root })).rejects.toThrow();
        expect(await pagesNamedBroken()).toBe(0);

        fs.writeFileSync(file, JSON.stringify({ ...page, sections: page.sections.slice(0, 1) }));
        await runImport({ contentDir: root });
        expect(await pagesNamedBroken()).toBe(1);

        fs.rmSync(file);
        await query("DELETE FROM pages WHERE slug = 'broken'");
      });

      test('--only replaces just the named pages and leaves the rest of the site alone', async () => {
        const before = await query("SELECT id, title_ru FROM pages WHERE slug = 'home'");
        await query("UPDATE pages SET title_ru = 'Edited in the admin' WHERE slug = 'home'");
        await query("UPDATE nav_items SET is_visible = FALSE");
        const settings = await query("SELECT section_name, content_json FROM content_blocks WHERE page_id IS NULL ORDER BY section_name");
        expect(settings.rows.length).toBeGreaterThan(0);

        const report = await runImport({ contentDir: root, overwrite: true, only: ['usluga/remont'] });

        expect(report.pagesReplaced).toBe(1);
        expect((await query("SELECT title_ru FROM pages WHERE slug = 'home'")).rows[0].title_ru).toBe('Edited in the admin');
        expect((await query('SELECT count(*)::int AS n FROM nav_items WHERE is_visible')).rows[0].n).toBe(0);
        expect((await query('SELECT section_name, content_json FROM content_blocks WHERE page_id IS NULL ORDER BY section_name')).rows).toEqual(settings.rows);
        await query('UPDATE pages SET title_ru = $1 WHERE id = $2', [before.rows[0].title_ru, before.rows[0].id]);
        await query('UPDATE nav_items SET is_visible = TRUE');
      });

      test('--only refuses a page it does not know', async () => {
        await expect(runImport({ contentDir: root, overwrite: true, only: ['no-such-page'] })).rejects.toThrow('no-such-page');
      });

      test('overwrite replaces pages and their sections', async () => {
        const report = await runImport({ contentDir: root, overwrite: true });
        expect(report.pagesReplaced).toBe(5);
        const { page } = (await api.anon.get('/api/pages/hy/usluga/remont')).body;
        expect(page.title).toBe('HY Ремонт');
        expect(page.sections).toHaveLength(2);
      });
    });

    test('a picture with a script in it is refused', async () => {
      const other = fs.mkdtempSync(path.join(os.tmpdir(), 'content-import-'));
      buildContent(other);
      writeFile(other, 'bad.svg', '<svg onload="alert(1)"/>');
      writeFile(other, 'good.svg', '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>');
      const site = JSON.parse(fs.readFileSync(path.join(other, 'site.json'), 'utf8'));
      site.works = [{ image: 'media:/bad.svg', title: '' }, { image: 'media:/good.svg', title: '' }];
      writeJson(path.join(other, 'site.json'), site);

      const report = await runImport({ contentDir: other });

      expect(report.refusedFiles).toEqual(new Set(['/bad.svg']));
      const stored = await query("SELECT filename FROM media_assets WHERE filename LIKE '%.svg'");
      expect(stored.rows.map((row) => row.filename)).toEqual(['good.svg']);
      fs.rmSync(other, { recursive: true, force: true });
    });
  });
}
