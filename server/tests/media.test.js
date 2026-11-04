process.env.UPLOAD_DIR = 'uploads-test';
process.env.MAX_UPLOAD_MB = '1';

const fs = require('fs');
const path = require('path');

const { closePool, query } = require('../src/config/db');
const { requireDatabaseUrl } = require('./helpers/db');
const { setupApi } = require('./helpers/api');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads-test');
const PNG = { filename: 'a.png', contentType: 'image/png' };

const dbUrl = requireDatabaseUrl();
if (!dbUrl) {
  test.skip('media requires DATABASE_URL', () => {});
} else {
  describe('media and galleries', () => {
    let api;
    let logSpy;

    beforeAll(async () => {
      api = await setupApi();
      logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(async () => {
      logSpy.mockRestore();
      fs.rmSync(UPLOAD_ROOT, { recursive: true, force: true });
      await closePool();
    });

    const upload = (client = api.editor, file = PNG, data = Buffer.from('image')) =>
      client.post('/api/admin/media').attach('file', data, file);
    const storedPath = (url) => path.join(UPLOAD_ROOT, path.basename(url));

    async function createAsset() {
      const res = await upload();
      expect(res.status).toBe(201);
      return res.body.asset;
    }

    describe('media', () => {
      test('requires a token', async () => {
        const res = await api.anon.post('/api/admin/media').attach('file', Buffer.from('image'), PNG);
        expect(res.status).toBe(401);
      });

      test('stores an image and records it', async () => {
        const asset = await createAsset();
        expect(asset).toMatchObject({ kind: 'image', mime_type: 'image/png', filename: 'a.png', size_bytes: 5 });
        expect(fs.existsSync(storedPath(asset.url))).toBe(true);
      });

      test('accepts a PDF as a document', async () => {
        const res = await upload(api.editor, { filename: 'c.pdf', contentType: 'application/pdf' });
        expect(res.status).toBe(201);
        expect(res.body.asset.kind).toBe('document');
      });

      test.each([
        ['SVG', { filename: 'x.svg', contentType: 'image/svg+xml' }],
        ['text', { filename: 'x.txt', contentType: 'text/plain' }],
        ['HTML', { filename: 'x.html', contentType: 'text/html' }],
        ['a type that does not match its extension', { filename: 'x.html', contentType: 'image/png' }]
      ])('rejects %s', async (_name, file) => {
        const res = await upload(api.editor, file);
        expect(res.status).toBe(400);
      });

      test('rejects a missing file and an oversized file', async () => {
        expect((await api.editor.post('/api/admin/media')).status).toBe(400);
        expect((await upload(api.editor, PNG, Buffer.alloc(2 * 1024 * 1024))).status).toBe(413);
      });

      test('the older upload route also rejects SVG', async () => {
        const res = await api.editor.post('/api/upload').attach('file', Buffer.from('<svg/>'), { filename: 'x.svg', contentType: 'image/svg+xml' });
        expect(res.status).toBe(400);
      });

      test('lists with filters and validates paging', async () => {
        await createAsset();
        const res = await api.editor.get('/api/admin/media?kind=image&limit=1');
        expect(res.status).toBe(200);
        expect(res.body.assets).toHaveLength(1);
        expect((await api.editor.get('/api/admin/media?limit=999')).status).toBe(400);
      });

      test('updates alt text but not the stored file details', async () => {
        const asset = await createAsset();
        const res = await api.editor.put(`/api/admin/media/${asset.id}`).send({ alt_hy: 'Նկար', url: 'https://evil.example/x.png' });
        expect(res.body.asset.alt_hy).toBe('Նկար');
        expect(res.body.asset.url).toBe(asset.url);
      });

      test('replacing a file moves every saved reference, including old versions', async () => {
        const asset = await createAsset();
        const service = (await api.editor.post('/api/services').send({ type: 'repair', title_hy: 'x', image_url: asset.url })).body.service;
        const page = (await api.admin.post('/api/admin/pages').send({ type: 'static', slug: `replace-${asset.id}` })).body.page;
        const section = (
          await api.admin.post(`/api/admin/pages/${page.id}/sections`).send({
            block_type: 'rich_text',
            content_json: { body_hy: `<img src="http://localhost${asset.url}" />` }
          })
        ).body.section;

        const res = await api.editor.put(`/api/admin/media/${asset.id}/file`).attach('file', Buffer.from('newer'), { filename: 'b.png', contentType: 'image/png' });
        expect(res.status).toBe(200);
        const newUrl = res.body.asset.url;
        expect(newUrl).not.toBe(asset.url);
        expect(res.body.asset.filename).toBe('b.png');
        expect(fs.existsSync(storedPath(asset.url))).toBe(false);
        expect(fs.existsSync(storedPath(newUrl))).toBe(true);

        const serviceRow = await query('SELECT image_url FROM services WHERE id = $1', [service.id]);
        expect(serviceRow.rows[0].image_url).toBe(newUrl);
        const block = await query('SELECT content_json FROM content_blocks WHERE id = $1', [section.id]);
        expect(block.rows[0].content_json.body_hy).toContain(newUrl);
        const version = await query('SELECT content_json FROM content_block_versions WHERE content_block_id = $1', [section.id]);
        expect(version.rows[0].content_json.body_hy).toContain(newUrl);
      });

      test('a file can only be replaced by one of the same kind', async () => {
        const asset = await createAsset();
        const storedBefore = fs.readdirSync(UPLOAD_ROOT).length;
        const res = await api.editor.put(`/api/admin/media/${asset.id}/file`).attach('file', Buffer.from('%PDF-1.4'), { filename: 'b.pdf', contentType: 'application/pdf' });
        expect(res.status).toBe(400);
        const row = await query('SELECT url, kind FROM media_assets WHERE id = $1', [asset.id]);
        expect(row.rows[0]).toEqual({ url: asset.url, kind: 'image' });
        expect(fs.existsSync(storedPath(asset.url))).toBe(true);
        expect(fs.readdirSync(UPLOAD_ROOT)).toHaveLength(storedBefore);
      });

      test('only admins can delete, and the file goes too', async () => {
        const asset = await createAsset();
        expect((await api.editor.delete(`/api/admin/media/${asset.id}`)).status).toBe(403);
        expect((await api.admin.delete(`/api/admin/media/${asset.id}`)).status).toBe(200);
        expect(fs.existsSync(storedPath(asset.url))).toBe(false);
      });

      test.each(['gallery', 'service', 'content'])('refuses to delete a file used by %s', async (usage) => {
        const asset = await createAsset();
        if (usage === 'gallery') {
          await api.editor.post('/api/admin/galleries').send({ collection: 'works', media_id: asset.id });
        }
        if (usage === 'service') {
          await api.editor.post('/api/services').send({ type: 'repair', title_hy: 'x', image_url: asset.url });
        }
        if (usage === 'content') {
          const page = (await api.admin.post('/api/admin/pages').send({ type: 'static', slug: `usage-${asset.id}` })).body.page;
          await api.admin.post(`/api/admin/pages/${page.id}/sections`).send({
            block_type: 'image_text',
            content_json: { image_url: asset.url }
          });
        }
        const res = await api.admin.delete(`/api/admin/media/${asset.id}`);
        expect(res.status).toBe(409);
        expect(fs.existsSync(storedPath(asset.url))).toBe(true);
      });
    });

    describe('galleries', () => {
      const addItem = (fields) => api.editor.post('/api/admin/galleries').send({ collection: 'certificates', ...fields });

      test('requires a token', async () => {
        expect((await api.anon.get('/api/admin/galleries')).status).toBe(401);
      });

      test('validates input', async () => {
        const asset = await createAsset();
        expect((await addItem({ collection: 'nope', media_id: asset.id })).status).toBe(400);
        expect((await addItem({ media_id: 'not-a-uuid' })).status).toBe(400);
        expect((await addItem({ media_id: '00000000-0000-4000-8000-000000000000' })).status).toBe(400);
        expect((await addItem({ media_id: asset.id, link_url: 'javascript:alert(1)' })).status).toBe(400);
      });

      test('hidden items stay out of the public site until published', async () => {
        const asset = await createAsset();
        const item = (await addItem({ media_id: asset.id, title_hy: 'Վկայական', is_visible: false })).body.item;
        let site = await api.anon.get('/api/site/hy');
        expect(site.body.galleries.certificates).toBeUndefined();

        expect((await api.editor.put(`/api/admin/galleries/${item.id}`).send({ is_visible: true })).status).toBe(200);
        site = await api.anon.get('/api/site/hy');
        expect(site.body.galleries.certificates).toEqual([
          { id: item.id, url: asset.url, title: 'Վկայական', alt: null, link_url: null }
        ]);
      });

      test('appends new items, reorders and deletes', async () => {
        const add = async () => {
          const asset = await createAsset();
          return (await api.editor.post('/api/admin/galleries').send({ collection: 'brands', media_id: asset.id })).body.item;
        };
        const first = await add();
        const second = await add();
        expect(second.sort_order).toBe(first.sort_order + 1);

        expect((await api.editor.put('/api/admin/galleries/order').send({ ids: [second.id, first.id] })).status).toBe(200);
        const list = await api.editor.get('/api/admin/galleries?collection=brands');
        expect(list.body.items.map((i) => i.id)).toEqual([second.id, first.id]);

        expect((await api.editor.delete(`/api/admin/galleries/${first.id}`)).status).toBe(200);
        expect((await api.editor.delete(`/api/admin/galleries/${first.id}`)).status).toBe(404);
      });
    });
  });
}
