const { closePool, query } = require('../src/config/db');
const { requireDatabaseUrl } = require('./helpers/db');
const { setupApi } = require('./helpers/api');

const dbUrl = requireDatabaseUrl();
if (!dbUrl) {
  test.skip('pages requires DATABASE_URL', () => {});
} else {
  describe('pages', () => {
    let api;

    beforeAll(async () => {
      api = await setupApi();
    });

    afterAll(async () => {
      await closePool();
    });

    async function createPage(fields) {
      const res = await api.admin.post('/api/admin/pages').send({ type: 'static', ...fields });
      expect(res.status).toBe(201);
      return res.body.page;
    }

    describe('admin access', () => {
      test('requires a token', async () => {
        const res = await api.anon.get('/api/admin/pages');
        expect(res.status).toBe(401);
      });

      test('editors can edit but not delete pages', async () => {
        const page = await createPage({ slug: 'editor-page' });
        expect((await api.editor.put(`/api/admin/pages/${page.id}`).send({ title_hy: 'Նոր' })).status).toBe(200);
        expect((await api.editor.delete(`/api/admin/pages/${page.id}`)).status).toBe(403);
        expect((await api.admin.delete(`/api/admin/pages/${page.id}`)).status).toBe(200);
      });
    });

    describe('create and update', () => {
      test('starts hidden and stores all languages', async () => {
        const page = await createPage({ slug: 'usluga/remont', type: 'service', title_hy: 'Վերանորոգում', title_ru: 'Ремонт' });
        expect(page.status).toBe('hidden');
        expect(page.title_hy).toBe('Վերանորոգում');
      });

      test.each(['Bad Slug', '/leading', 'trailing/', 'a//b', 'кириллица', '../etc'])('rejects the slug %s', async (slug) => {
        const res = await api.admin.post('/api/admin/pages').send({ type: 'static', slug });
        expect(res.status).toBe(400);
      });

      test.each(['api', 'booking', 'quiz/next'])('rejects the reserved slug %s', async (slug) => {
        const res = await api.admin.post('/api/admin/pages').send({ type: 'static', slug });
        expect(res.status).toBe(400);
      });

      test('rejects a duplicate slug with 409', async () => {
        await createPage({ slug: 'duplicate' });
        const res = await api.admin.post('/api/admin/pages').send({ type: 'static', slug: 'duplicate' });
        expect(res.status).toBe(409);
      });

      test('rejects an unknown type', async () => {
        const res = await api.admin.post('/api/admin/pages').send({ type: 'nope', slug: 'typed' });
        expect(res.status).toBe(400);
      });

      test('returns 404 for a missing page', async () => {
        const missing = '00000000-0000-4000-8000-000000000000';
        expect((await api.admin.put(`/api/admin/pages/${missing}`).send({ title_hy: 'x' })).status).toBe(404);
        expect((await api.admin.delete(`/api/admin/pages/${missing}`)).status).toBe(404);
      });

      test('blocks parent cycles', async () => {
        const parent = await createPage({ slug: 'cycle-parent' });
        const child = await createPage({ slug: 'cycle-child', parent_id: parent.id });
        expect((await api.admin.put(`/api/admin/pages/${parent.id}`).send({ parent_id: parent.id })).status).toBe(400);
        expect((await api.admin.put(`/api/admin/pages/${parent.id}`).send({ parent_id: child.id })).status).toBe(400);
      });

      test('protects the home page', async () => {
        const home = await createPage({ slug: 'home', type: 'home' });
        expect((await api.admin.put(`/api/admin/pages/${home.id}`).send({ slug: 'start' })).status).toBe(400);
        expect((await api.admin.delete(`/api/admin/pages/${home.id}`)).status).toBe(400);
      });

      test('a published home page cannot be hidden, because the site would have no front page', async () => {
        const home = (await api.admin.get('/api/admin/pages')).body.pages.find((page) => page.slug === 'home')
          || (await createPage({ slug: 'home', type: 'home' }));
        expect((await api.admin.put(`/api/admin/pages/${home.id}`).send({ status: 'published' })).status).toBe(200);
        expect((await api.admin.put(`/api/admin/pages/${home.id}`).send({ status: 'hidden' })).status).toBe(400);
        expect((await api.admin.get(`/api/admin/pages/${home.id}`)).body.page.status).toBe('published');
      });

      test('deleting a page also deletes its sections', async () => {
        const page = await createPage({ slug: 'with-sections' });
        const added = await api.admin.post(`/api/admin/pages/${page.id}/sections`).send({ block_type: 'rich_text' });
        expect((await api.admin.delete(`/api/admin/pages/${page.id}`)).status).toBe(200);
        const left = await query('SELECT 1 FROM content_blocks WHERE id = $1', [added.body.section.id]);
        expect(left.rowCount).toBe(0);
      });

      test('filters the admin list', async () => {
        await createPage({ slug: 'filter-article', type: 'article' });
        const res = await api.admin.get('/api/admin/pages?type=article');
        expect(res.status).toBe(200);
        expect(res.body.pages.every((p) => p.type === 'article')).toBe(true);
        expect(res.body.pages.map((p) => p.slug)).toContain('filter-article');
        expect((await api.admin.get('/api/admin/pages?type=nope')).status).toBe(400);
      });
    });

    describe('sections', () => {
      let page;

      beforeAll(async () => {
        page = await createPage({ slug: 'sections-page' });
      });

      const addSection = (fields) => api.admin.post(`/api/admin/pages/${page.id}/sections`).send(fields);

      test('rejects an unknown block type', async () => {
        const res = await addSection({ block_type: 'nope', content_json: {} });
        expect(res.status).toBe(400);
        expect(res.body.error.details.kind).toBe('unknown_block_type');
      });

      test('rejects unknown keys, with details the admin can show', async () => {
        const res = await addSection({ block_type: 'rich_text', content_json: { nope: 'x' } });
        expect(res.status).toBe(400);
        expect(res.body.error.details.kind).toBe('schema_validation_failed');
      });

      test('rejects unknown keys inside a list', async () => {
        const res = await addSection({ block_type: 'price_cards', content_json: { items: [{ nope: 'x' }] } });
        expect(res.status).toBe(400);
      });

      test('sanitizes rich text and records a version', async () => {
        const res = await addSection({
          block_type: 'rich_text',
          content_json: { body_hy: '<p>ok</p><script>alert(1)</script>' }
        });
        expect(res.status).toBe(201);
        expect(res.body.section.content_json.body_hy).toBe('<p>ok</p>');

        const versions = await api.admin.get(`/api/admin/sections/${res.body.section.id}/versions`);
        expect(versions.body.versions).toHaveLength(1);
      });

      test('an update sanitizes and adds a version; hiding does not', async () => {
        const created = await addSection({ block_type: 'rich_text', content_json: { body_hy: '<p>1</p>' } });
        const id = created.body.section.id;

        const updated = await api.editor.put(`/api/admin/sections/${id}`).send({ content_json: { body_hy: '<p>2</p><script>x</script>' } });
        expect(updated.status).toBe(200);
        expect(updated.body.section.content_json.body_hy).toBe('<p>2</p>');

        const hidden = await api.admin.put(`/api/admin/sections/${id}`).send({ is_visible: false });
        expect(hidden.body.section.is_visible).toBe(false);
        expect(hidden.body.section.content_json.body_hy).toBe('<p>2</p>');

        const versions = await api.admin.get(`/api/admin/sections/${id}/versions`);
        expect(versions.body.versions).toHaveLength(2);
      });

      test('sections require a token', async () => {
        const created = await addSection({ block_type: 'rich_text' });
        const res = await api.anon.delete(`/api/admin/sections/${created.body.section.id}`);
        expect(res.status).toBe(401);
      });

      test('reorders, and refuses a partial order', async () => {
        const target = await createPage({ slug: 'reorder-page' });
        const add = () => api.admin.post(`/api/admin/pages/${target.id}/sections`).send({ block_type: 'rich_text' });
        const first = (await add()).body.section.id;
        const second = (await add()).body.section.id;

        const url = `/api/admin/pages/${target.id}/sections/order`;
        expect((await api.admin.put(url).send({ ids: [first] })).status).toBe(400);
        expect((await api.admin.put(url).send({ ids: [second, first] })).status).toBe(200);

        const res = await api.admin.get(`/api/admin/pages/${target.id}`);
        expect(res.body.page.sections.map((s) => s.id)).toEqual([second, first]);
      });

      test('only admins can delete a section', async () => {
        const created = await addSection({ block_type: 'rich_text' });
        const id = created.body.section.id;
        expect((await api.editor.delete(`/api/admin/sections/${id}`)).status).toBe(403);
        expect((await api.admin.delete(`/api/admin/sections/${id}`)).status).toBe(200);
        expect((await api.admin.delete(`/api/admin/sections/${id}`)).status).toBe(404);
      });
    });

    describe('public pages', () => {
      let parent;
      let page;

      beforeAll(async () => {
        parent = await createPage({ slug: 'uslugi', type: 'listing', status: 'published', title_hy: 'Ծառայություններ' });
        page = await createPage({
          slug: 'usluga/chistka',
          type: 'service',
          status: 'published',
          parent_id: parent.id,
          title_hy: 'Մաքրում',
          title_ru: 'Чистка',
          meta_description_hy: 'Նկարագրություն'
        });
        const add = (fields) => api.admin.post(`/api/admin/pages/${page.id}/sections`).send(fields);
        await add({ block_type: 'rich_text', content_json: { heading_hy: 'Տեսանելի', heading_ru: 'Видно' } });
        await add({ block_type: 'rich_text', content_json: { heading_hy: 'Թաքնված' }, is_visible: false });
      });

      test('returns the page in the requested language, with slashes in the slug', async () => {
        const res = await api.anon.get('/api/pages/hy/usluga/chistka');
        expect(res.status).toBe(200);
        expect(res.body.page.title).toBe('Մաքրում');
        expect(res.body.page.meta_description).toBe('Նկարագրություն');
        expect(res.body.page.sections).toHaveLength(1);
        expect(res.body.page.sections[0].content).toEqual({ heading: 'Տեսանելի' });
      });

      test('never exposes internal fields', async () => {
        const res = await api.anon.get('/api/pages/hy/usluga/chistka');
        expect(JSON.stringify(res.body)).not.toMatch(/needs_review|title_ru|heading_ru/);
      });

      test('includes breadcrumbs', async () => {
        const res = await api.anon.get('/api/pages/hy/usluga/chistka');
        expect(res.body.page.breadcrumbs).toEqual([{ href: '/uslugi', title: 'Ծառայություններ' }]);
      });

      test('hidden and missing pages return 404', async () => {
        await createPage({ slug: 'secret-page', status: 'hidden' });
        expect((await api.anon.get('/api/pages/hy/secret-page')).status).toBe(404);
        expect((await api.anon.get('/api/pages/hy/no-such-page')).status).toBe(404);
      });

      test('rejects an unknown language', async () => {
        expect((await api.anon.get('/api/pages/am/usluga/chistka')).status).toBe(400);
      });

      test('the slug list only has published pages', async () => {
        const res = await api.anon.get('/api/pages/slugs');
        const slugs = res.body.pages.map((p) => p.slug);
        expect(slugs).toContain('usluga/chistka');
        expect(slugs).not.toContain('secret-page');
      });

      test('page sections stay out of the older content API', async () => {
        const blocks = await api.admin.get('/api/content/blocks');
        expect(blocks.body.content_blocks.every((b) => b.page_name)).toBe(true);
        const content = await api.anon.get('/api/content/hy');
        expect(Object.keys(content.body.pages)).not.toContain('null');
      });
    });

    test('lists block types for the admin', async () => {
      expect((await api.anon.get('/api/admin/schemas')).status).toBe(401);
      const res = await api.editor.get('/api/admin/schemas');
      expect(res.status).toBe(200);
      expect(res.body.block_types.map((b) => b.type)).toContain('price_cards');
      expect(JSON.stringify(res.body)).not.toContain('jsonSchema');
    });

    test('section links must be safe, because they are rendered as href', async () => {
      const page = (await api.admin.post('/api/admin/pages').send({ slug: 'link-check', type: 'static', title_hy: 'Ա' })).body.page;
      const save = (link_url) =>
        api.editor.post(`/api/admin/pages/${page.id}/sections`).send({
          block_type: 'icon_features',
          content_json: { items: [{ title_hy: 'Ա', link_url }] }
        });
      expect((await save('javascript:alert(1)')).status).toBe(400);
      expect((await save('//evil.example')).status).toBe(400);
      expect((await save('/usluga/remont')).status).toBe(201);
      expect((await save('https://example.com')).status).toBe(201);
      expect((await save(null)).status).toBe(201);
    });

    test('a video address must be a web address', async () => {
      const page = (await api.admin.post('/api/admin/pages').send({ slug: 'video-check', type: 'static', title_hy: 'Ա' })).body.page;
      const save = (video_url) => api.editor.post(`/api/admin/pages/${page.id}/sections`).send({ block_type: 'video', content_json: { video_url } });
      expect((await save('javascript:alert(1)')).status).toBe(400);
      expect((await save('https://www.youtube.com/embed/abc')).status).toBe(201);
    });

    test('products can hold a list of pictures inside each product', async () => {
      const page = (await api.admin.post('/api/admin/pages').send({ slug: 'products-check', type: 'static', title_hy: 'Ա' })).body.page;
      const res = await api.editor.post(`/api/admin/pages/${page.id}/sections`).send({
        block_type: 'products',
        content_json: { items: [{ title_hy: 'Ա', images: [{ image_url: '/uploads/a.png' }], details_hy: '<p>Բ</p><script>x</script>' }] }
      });
      expect(res.status).toBe(201);
      expect(res.body.section.content_json.items[0].details_hy).toBe('<p>Բ</p>');
    });

    test('describes site blocks so the admin can build their forms', async () => {
      const res = await api.editor.get('/api/admin/schemas');
      const branding = res.body.site_blocks.find((b) => b.page_name === 'global' && b.section_name === 'branding');
      expect(branding.title).toBe('Logo and company name');
      expect(branding.groups.map((g) => g.id)).toEqual(['text', 'images']);
      expect(branding.fields.find((field) => field.key === 'logo_url').kind).toBe('image');
    });

    test('every group of a site block names real fields', async () => {
      const res = await api.editor.get('/api/admin/schemas');
      for (const block of res.body.site_blocks) {
        const known = block.fields.map((field) => field.key);
        const grouped = block.groups.flatMap((group) => group.fieldKeys);
        expect(grouped.filter((key) => !known.includes(key))).toEqual([]);
        expect(known.filter((key) => !grouped.includes(key))).toEqual([]);
      }
    });
  });
}
