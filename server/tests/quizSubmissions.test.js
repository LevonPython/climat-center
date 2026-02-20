const request = require('supertest');

const { createApp } = require('../src/app');
const { closePool } = require('../src/config/db');
const { withTestDb, runMigrations, truncateAll, ensureAdminUser, requireDatabaseUrl } = require('./helpers/db');

const dbUrl = requireDatabaseUrl();
if (!dbUrl) {
  test.skip('quiz-submissions requires DATABASE_URL', () => {});
} else {
  describe('quiz-submissions', () => {
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

    test('POST /api/quiz-submissions creates submission (no auth)', async () => {
      const res = await request(app)
        .post('/api/quiz-submissions')
        .send({
          answers_json: { problem: 'Not cooling', acType: 'Wall-mounted' },
          contact_info: { name: 'John', phone: '+37499123456' }
        });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.quiz_submission).toBeDefined();
      expect(res.body.quiz_submission.id).toBeDefined();
      expect(res.body.quiz_submission.answers_json).toEqual({ problem: 'Not cooling', acType: 'Wall-mounted' });
      expect(res.body.quiz_submission.contact_info).toEqual({ name: 'John', phone: '+37499123456' });
    });

    test('POST /api/quiz-submissions accepts minimal payload', async () => {
      const res = await request(app)
        .post('/api/quiz-submissions')
        .send({ answers_json: { problem: 'Bad smell' } });
      expect(res.status).toBe(201);
      expect(res.body.quiz_submission.contact_info).toEqual({});
    });

    test('POST /api/quiz-submissions rejects invalid payload', async () => {
      const res = await request(app)
        .post('/api/quiz-submissions')
        .send({ answers_json: 'not-an-object' });
      expect(res.status).toBe(400);
    });

    test('GET /api/quiz-submissions requires auth', async () => {
      const res = await request(app).get('/api/quiz-submissions');
      expect(res.status).toBe(401);
    });

    test('GET /api/quiz-submissions returns list for admin', async () => {
      const res = await request(app)
        .get('/api/quiz-submissions')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.quiz_submissions)).toBe(true);
      expect(res.body.limit).toBeDefined();
      expect(res.body.offset).toBeDefined();
    });
  });
}
