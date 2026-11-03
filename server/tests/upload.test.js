process.env.MAX_UPLOAD_MB = '1';

const request = require('supertest');

const { createApp } = require('../src/app');
const { closePool } = require('../src/config/db');
const { withTestDb, runMigrations, truncateAll, ensureAdminUser, requireDatabaseUrl } = require('./helpers/db');

const dbUrl = requireDatabaseUrl();
if (!dbUrl) {
  test.skip('upload requires DATABASE_URL', () => {});
} else {
  describe('upload', () => {
    const app = createApp();
    let token;
    let logSpy;

    beforeAll(async () => {
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
      await withTestDb(async (client) => {
        await runMigrations(client);
        await truncateAll(client);
        await ensureAdminUser(client, 'admin', 'admin12345');
      });
      const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin12345' });
      token = login.body.token;
      logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(async () => {
      logSpy.mockRestore();
      await closePool();
    });

    test('POST /api/upload rejects a non-image with 400', async () => {
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Only image uploads are allowed');
    });

    test('POST /api/upload rejects an oversized file with 413', async () => {
      const res = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.alloc(2 * 1024 * 1024), { filename: 'big.png', contentType: 'image/png' });
      expect(res.status).toBe(413);
      expect(res.body.ok).toBe(false);
    });

    test('POST /api/upload requires a token', async () => {
      const res = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('hello'), { filename: 'a.png', contentType: 'image/png' });
      expect(res.status).toBe(401);
    });
  });
}
