process.env.UPLOAD_DIR = 'uploads-test-languages';

const fs = require('fs');
const path = require('path');

const { closePool } = require('../src/config/db');
const { LANGS } = require('../src/services/localization');
const { requireDatabaseUrl } = require('./helpers/db');
const { setupApi } = require('./helpers/api');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads-test-languages');
const WORDS = { hy: 'Օդորակիչ', ru: 'Кондиционер', en: 'Air conditioner', ar: 'مكيف هواء' };

const dbUrl = requireDatabaseUrl();
if (!dbUrl) {
  test.skip('languages require DATABASE_URL', () => {});
} else {
  describe('every kind of content in every language', () => {
    let api;
    let sharedPage;

    const inEvery = (base, what) => Object.fromEntries(LANGS.map((lang) => [`${base}_${lang}`, `${WORDS[lang]} ${what}`]));
    const site = async (lang) => (await api.anon.get(`/api/site/${lang}`)).body;

    beforeAll(async () => {
      api = await setupApi();
      const res = await api.editor.post('/api/admin/pages').send({ slug: 'yazyki', type: 'static', status: 'published', ...inEvery('title', 'page') });
      sharedPage = res.body.page;
    });

    afterAll(async () => {
      fs.rmSync(UPLOAD_ROOT, { recursive: true, force: true });
      await closePool();
    });

    test('there is sample text for every language', () => {
      expect(LANGS.filter((lang) => !WORDS[lang])).toEqual([]);
    });

    describe.each(LANGS)('%s', (lang) => {
      const other = LANGS.find((candidate) => candidate !== lang);
      const text = (what) => `${WORDS[lang]} ${what}`;

      test('a page has its title and description in its language only', async () => {
        const created = await api.editor.post('/api/admin/pages').send({
          slug: `stranica-${lang}`,
          type: 'static',
          status: 'published',
          [`title_${lang}`]: text('title'),
          [`meta_title_${lang}`]: text('meta title'),
          [`meta_description_${lang}`]: text('meta description'),
          [`needs_review_${lang}`]: true
        });
        expect(created.status).toBe(201);
        expect(created.body.page[`needs_review_${lang}`]).toBe(true);

        const shown = await api.anon.get(`/api/pages/${lang}/stranica-${lang}`);
        expect(shown.body.page).toMatchObject({ title: text('title'), meta_title: text('meta title'), meta_description: text('meta description') });
        expect((await api.anon.get(`/api/pages/${other}/stranica-${lang}`)).body.page).toMatchObject({ title: null, meta_title: null, meta_description: null });

        await api.editor.put(`/api/admin/pages/${created.body.page.id}`).send({ slug: `stranica-${lang}`, [`title_${lang}`]: text('edited') });
        expect((await api.anon.get(`/api/pages/${lang}/stranica-${lang}`)).body.page.title).toBe(text('edited'));
      });

      test('a section shows its text in its language only', async () => {
        const created = await api.editor.post(`/api/admin/pages/${sharedPage.id}/sections`).send({
          block_type: 'rich_text',
          content_json: { [`heading_${lang}`]: text('heading'), [`body_${lang}`]: `<p>${text('body')}</p>` }
        });
        expect(created.status).toBe(201);
        const sectionIn = async (code) => (await api.anon.get(`/api/pages/${code}/yazyki`)).body.page.sections.find((item) => item.id === created.body.section.id);

        expect((await sectionIn(lang)).content).toMatchObject({ heading: text('heading'), body: `<p>${text('body')}</p>` });
        expect((await sectionIn(other)).content.heading).toBeUndefined();

        await api.editor.put(`/api/admin/sections/${created.body.section.id}`).send({ content_json: { [`heading_${lang}`]: text('edited') } });
        expect((await sectionIn(lang)).content.heading).toBe(text('edited'));
      });

      test('a site setting shows in its language only', async () => {
        const save = (value) => api.editor.put('/api/content').send({ page_name: 'global', section_name: 'branding', content_json: { [`site_name_${lang}`]: value } });
        expect((await save(text('company'))).status).toBe(200);
        expect((await site(lang)).settings.branding.site_name).toBe(text('company'));
        expect((await site(other)).settings.branding.site_name).toBeUndefined();

        await save(text('edited'));
        expect((await site(lang)).settings.branding.site_name).toBe(text('edited'));
      });

      test('a service shows its names in its language only', async () => {
        const created = await api.editor.post('/api/services').send({
          type: 'repair',
          [`title_${lang}`]: text('service'),
          [`description_${lang}`]: text('description'),
          [`menu_title_${lang}`]: text('menu'),
          [`pill_title_${lang}`]: text('pill')
        });
        expect(created.status).toBe(201);
        const { id } = created.body.service;
        const listed = async (code) => (await site(code)).services.service.find((item) => item.id === id);

        expect(await listed(lang)).toMatchObject({ title: text('service'), menu_title: text('menu'), pill_title: text('pill') });
        expect(await listed(other)).toMatchObject({ title: null, menu_title: null, pill_title: null });
        const publicRow = (await api.anon.get('/api/services')).body.services.find((item) => item.id === id);
        expect(publicRow[`description_${lang}`]).toBe(text('description'));

        await api.editor.put(`/api/services/${id}`).send({ [`title_${lang}`]: text('edited') });
        expect((await listed(lang)).title).toBe(text('edited'));
      });

      test('a menu link shows its label in its language only', async () => {
        const created = await api.editor.post('/api/admin/navigation').send({ location: 'footer', url: '/booking', [`label_${lang}`]: text('link') });
        expect(created.status).toBe(201);
        const { id } = created.body.item;
        const listed = async (code) => (await site(code)).nav.footer.find((item) => item.id === id);

        expect((await listed(lang)).label).toBe(text('link'));
        expect((await listed(other)).label).toBeNull();

        await api.editor.put(`/api/admin/navigation/${id}`).send({ [`label_${lang}`]: text('edited') });
        expect((await listed(lang)).label).toBe(text('edited'));
      });

      test('a gallery picture shows its title and description in its language only', async () => {
        const uploaded = await api.editor.post('/api/admin/media').attach('file', Buffer.from(`picture ${lang}`), { filename: `${lang}.png`, contentType: 'image/png' });
        const asset = uploaded.body.asset;
        expect((await api.editor.put(`/api/admin/media/${asset.id}`).send({ [`alt_${lang}`]: text('description') })).status).toBe(200);
        const created = await api.editor.post('/api/admin/galleries').send({ collection: 'works', media_id: asset.id, [`title_${lang}`]: text('picture') });
        expect(created.status).toBe(201);
        const { id } = created.body.item;
        const listed = async (code) => (await site(code)).galleries.works.find((item) => item.id === id);

        expect(await listed(lang)).toMatchObject({ title: text('picture'), alt: text('description') });
        expect(await listed(other)).toMatchObject({ title: null, alt: null });

        await api.editor.put(`/api/admin/galleries/${id}`).send({ [`title_${lang}`]: text('edited') });
        await api.editor.put(`/api/admin/media/${asset.id}`).send({ [`alt_${lang}`]: text('edited description') });
        expect(await listed(lang)).toMatchObject({ title: text('edited'), alt: text('edited description') });
      });

      test('interface text shows in its language only', async () => {
        const key = `request.title_${lang}`;
        expect((await api.editor.put(`/api/admin/translations/${key}`).send({ [`value_${lang}`]: text('button') })).status).toBe(200);
        const texts = async (code) => (await api.anon.get(`/api/translations/${code}`)).body.translations;

        expect((await texts(lang))[key]).toBe(text('button'));
        expect((await texts(other))[key]).toBeUndefined();

        await api.editor.put(`/api/admin/translations/${key}`).send({ [`value_${lang}`]: text('edited') });
        expect((await texts(lang))[key]).toBe(text('edited'));
      });
    });
  });
}
