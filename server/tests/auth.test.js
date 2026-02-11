const request = require('supertest');

const { createApp } = require('../src/app');
const { closePool } = require('../src/config/db');
const { withTestDb, runMigrations, truncateAll, ensureAdminUser, requireDatabaseUrl } = require('./helpers/db');

const dbUrl = requireDatabaseUrl();
if (!dbUrl) {
  test.skip('auth requires DATABASE_URL', () => {});
} else {
  describe('auth', () => {
    const app = createApp();

    beforeAll(async () => {
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
      await withTestDb(async (client) => {
        await client.query('BEGIN');
        await runMigrations(client);
        await truncateAll(client);
        await ensureAdminUser(client, 'admin', 'admin12345');
        await client.query('COMMIT');
      });
    });

    afterAll(async () => {
      await closePool();
    });

    test('POST /api/auth/login returns token', async () => {
      const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin12345' });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.token).toBe('string');
    });
  });
}

