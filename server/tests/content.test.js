const request = require('supertest');

const { createApp } = require('../src/app');
const { closePool } = require('../src/config/db');
const { withTestDb, runMigrations, truncateAll, ensureAdminUser, requireDatabaseUrl } = require('./helpers/db');

const dbUrl = requireDatabaseUrl();
if (!dbUrl) {
  test.skip('content requires DATABASE_URL', () => {});
} else {
  describe('content', () => {
    const app = createApp();
    let token;

    beforeAll(async () => {
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
      await withTestDb(async (client) => {
        await client.query('BEGIN');
        await runMigrations(client);
        await truncateAll(client);
        await ensureAdminUser(client, 'admin', 'admin12345');
        await client.query('COMMIT');
      });

      const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin12345' });
      token = login.body.token;
    });

    afterAll(async () => {
      await closePool();
    });

    test('PUT /api/content creates version history per update', async () => {
      const createRes = await request(app)
        .put('/api/content')
        .set('Authorization', `Bearer ${token}`)
        .send({
          page_name: 'about',
          section_name: 'page',
          content_json: { title_ru: 'О компании' }
        });

      expect(createRes.status).toBe(200);
      expect(createRes.body.ok).toBe(true);
      expect(createRes.body.content_block?.id).toBeTruthy();

      const blockId = createRes.body.content_block.id;

      const updateRes = await request(app)
        .put('/api/content')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: blockId,
          content_json: { title_ru: 'О компании (обновлено)' }
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.ok).toBe(true);
      expect(updateRes.body.content_block.id).toBe(blockId);

      const versionsRes = await request(app)
        .get(`/api/content/blocks/${blockId}/versions`)
        .set('Authorization', `Bearer ${token}`);

      expect(versionsRes.status).toBe(200);
      expect(versionsRes.body.ok).toBe(true);
      expect(Array.isArray(versionsRes.body.versions)).toBe(true);
      expect(versionsRes.body.versions.length).toBeGreaterThanOrEqual(2);

      const latest = versionsRes.body.versions[0];
      expect(latest.content_block_id).toBe(blockId);
      expect(latest.content_json.title_ru).toBe('О компании (обновлено)');
      expect(latest.updated_by_username).toBe('admin');
    });
  });
}

