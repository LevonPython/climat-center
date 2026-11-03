const { closePool, query } = require('../src/config/db');
const { requireDatabaseUrl } = require('./helpers/db');
const { setupApi } = require('./helpers/api');

const dbUrl = requireDatabaseUrl();
if (!dbUrl) {
  test.skip('site structure requires DATABASE_URL', () => {});
} else {
  describe('site structure', () => {
    let api;
    let published;
    let hidden;

    beforeAll(async () => {
      api = await setupApi();
      const create = async (fields) => (await api.admin.post('/api/admin/pages').send({ type: 'static', ...fields })).body.page;
      published = await create({ slug: 'o-kompanii', status: 'published' });
      hidden = await create({ slug: 'vakansiya', status: 'hidden' });
    });

    afterAll(async () => {
      await closePool();
    });

    describe('navigation', () => {
      test('requires a token', async () => {
        expect((await api.anon.post('/api/admin/navigation').send({ location: 'footer', url: '/x' })).status).toBe(401);
      });

      test('needs a page or a link', async () => {
        const res = await api.editor.post('/api/admin/navigation').send({ location: 'footer', label_hy: 'x' });
        expect(res.status).toBe(400);
      });

      test('rejects an unknown location and page', async () => {
        expect((await api.editor.post('/api/admin/navigation').send({ location: 'nope', url: '/x' })).status).toBe(400);
        const missing = '00000000-0000-4000-8000-000000000000';
        expect((await api.editor.post('/api/admin/navigation').send({ location: 'footer', page_id: missing })).status).toBe(400);
      });

      test.each(['javascript:alert(1)', '//evil.example', 'data:text/html,x', ' javascript:alert(1)'])('rejects the unsafe link %s', async (url) => {
        const res = await api.editor.post('/api/admin/navigation').send({ location: 'footer', url });
        expect(res.status).toBe(400);
      });

      test.each(['/booking', 'https://wa.me/374', 'tel:+37494000000', 'mailto:a@b.am'])('accepts the link %s', async (url) => {
        const res = await api.editor.post('/api/admin/navigation').send({ location: 'footer', url });
        expect(res.status).toBe(201);
      });

      test('the public menu resolves links and leaves out hidden items and hidden pages', async () => {
        const add = async (fields) => (await api.editor.post('/api/admin/navigation').send({ location: 'topbar', ...fields })).body.item;
        await add({ page_id: published.id, label_hy: 'Մեր մասին', label_ru: 'О нас' });
        await add({ page_id: hidden.id, label_hy: 'Աշխատանք' });
        await add({ url: '/booking', label_hy: 'Թաքնված', is_visible: false });

        const res = await api.anon.get('/api/site/hy');
        expect(res.status).toBe(200);
        expect(res.body.nav.topbar.map(({ label, href }) => ({ label, href }))).toEqual([{ label: 'Մեր մասին', href: '/o-kompanii' }]);
      });

      test('updates, reorders and deletes', async () => {
        const add = async (url) => (await api.editor.post('/api/admin/navigation').send({ location: 'cities', url, label_hy: url })).body.item;
        const first = await add('/yerevan');
        const second = await add('/gyumri');

        const updated = await api.editor.put(`/api/admin/navigation/${first.id}`).send({ label_hy: 'Երևան' });
        expect(updated.body.item.label_hy).toBe('Երևան');
        expect((await api.editor.put(`/api/admin/navigation/${first.id}`).send({ url: null })).status).toBe(400);

        expect((await api.editor.put('/api/admin/navigation/order').send({ ids: [second.id, first.id] })).status).toBe(200);
        let site = await api.anon.get('/api/site/hy');
        expect(site.body.nav.cities.map((i) => i.href)).toEqual(['/gyumri', '/yerevan']);

        expect((await api.editor.delete(`/api/admin/navigation/${second.id}`)).status).toBe(200);
        site = await api.anon.get('/api/site/hy');
        expect(site.body.nav.cities.map((i) => i.href)).toEqual(['/yerevan']);
      });

      test('deleting a page removes its menu items', async () => {
        const temp = (await api.admin.post('/api/admin/pages').send({ type: 'static', slug: 'temp-nav', status: 'published' })).body.page;
        const item = (await api.editor.post('/api/admin/navigation').send({ location: 'footer', page_id: temp.id })).body.item;
        await api.admin.delete(`/api/admin/pages/${temp.id}`);
        const left = await query('SELECT 1 FROM nav_items WHERE id = $1', [item.id]);
        expect(left.rowCount).toBe(0);
      });
    });

    describe('services', () => {
      const makeService = (fields) =>
        api.editor.post('/api/services').send({ type: 'repair', title_hy: 'Վերանորոգում', ...fields });

      test('stores the new structure fields', async () => {
        const res = await makeService({
          category: 'fault',
          menu_title_hy: 'Ցանկ',
          pill_title_hy: 'Կոճակ',
          show_in_pills: true,
          page_id: published.id,
          sort_order: 3
        });
        expect(res.status).toBe(201);
        expect(res.body.service).toMatchObject({ category: 'fault', menu_title_hy: 'Ցանկ', show_in_pills: true, sort_order: 3 });
      });

      test('keeps working without the new fields', async () => {
        const res = await makeService({});
        expect(res.status).toBe(201);
        expect(res.body.service).toMatchObject({ category: 'service', show_in_menu: true, show_in_pills: false, sort_order: 0 });
      });

      test('validates the new fields', async () => {
        expect((await makeService({ category: 'nope' })).status).toBe(400);
        expect((await makeService({ page_id: 'not-a-uuid' })).status).toBe(400);
      });

      test('updates the new fields', async () => {
        const created = (await makeService({})).body.service;
        const res = await api.editor.put(`/api/services/${created.id}`).send({ pill_title_hy: 'Նոր', show_in_menu: false });
        expect(res.body.service).toMatchObject({ pill_title_hy: 'Նոր', show_in_menu: false });
      });

      test('the public site groups services and leaves out those on hidden pages', async () => {
        await makeService({ menu_title_hy: 'Հրապարակված', page_id: published.id });
        await makeService({ menu_title_hy: 'Թաքնված էջ', page_id: hidden.id });
        const res = await api.anon.get('/api/site/hy');
        const titles = res.body.services.service.map((s) => s.menu_title);
        expect(titles).toContain('Հրապարակված');
        expect(titles).not.toContain('Թաքնված էջ');
        const linked = res.body.services.service.find((s) => s.menu_title === 'Հրապարակված');
        expect(linked.href).toBe('/o-kompanii');
      });

      test('reorders', async () => {
        const first = (await makeService({})).body.service;
        const second = (await makeService({})).body.service;
        expect((await api.anon.put('/api/admin/services/order').send({ ids: [second.id, first.id] })).status).toBe(401);
        expect((await api.editor.put('/api/admin/services/order').send({ ids: ['nope'] })).status).toBe(400);
        expect((await api.editor.put('/api/admin/services/order').send({ ids: [second.id, first.id] })).status).toBe(200);
        const rows = await query('SELECT id, sort_order FROM services WHERE id = ANY($1::uuid[]) ORDER BY sort_order', [[first.id, second.id]]);
        expect(rows.rows.map((r) => r.id)).toEqual([second.id, first.id]);
      });
    });

    describe('interface text', () => {
      test('requires a token', async () => {
        expect((await api.anon.put('/api/admin/translations/nav.home').send({ value_hy: 'x' })).status).toBe(401);
      });

      test('rejects a malformed key', async () => {
        expect((await api.editor.put('/api/admin/translations/bad%20key').send({ value_hy: 'x' })).status).toBe(400);
      });

      test('creates, updates, serves and removes an override', async () => {
        expect((await api.editor.put('/api/admin/translations/nav.home').send({ value_hy: 'Գլխավոր' })).status).toBe(200);
        await api.editor.put('/api/admin/translations/nav.home').send({ value_hy: 'Սկիզբ', value_en: 'Start' });

        const hy = await api.anon.get('/api/translations/hy');
        expect(hy.body.translations['nav.home']).toBe('Սկիզբ');
        const ru = await api.anon.get('/api/translations/ru');
        expect(ru.body.translations).not.toHaveProperty(['nav.home']);

        expect((await api.editor.delete('/api/admin/translations/nav.home')).status).toBe(200);
        expect((await api.editor.delete('/api/admin/translations/nav.home')).status).toBe(404);
        const after = await api.anon.get('/api/translations/hy');
        expect(after.body.translations).not.toHaveProperty(['nav.home']);
      });

      test('rejects an unknown language', async () => {
        expect((await api.anon.get('/api/translations/am')).status).toBe(400);
      });
    });

    test('the public site serves global settings in the requested language', async () => {
      await api.editor.put('/api/content').send({
        page_name: 'global',
        section_name: 'branding',
        content_json: { site_name_hy: 'Կլիմայի կենտրոն', site_name_ru: 'Центр климата', logo_url: '/logo.png' }
      });
      const res = await api.anon.get('/api/site/hy');
      expect(res.body.settings.branding).toEqual({ site_name: 'Կլիմայի կենտրոն', logo_url: '/logo.png' });
      expect((await api.anon.get('/api/site/am')).status).toBe(400);
    });
  });
}
