const request = require('supertest');

const { createApp } = require('../src/app');
const { withTestDb, runMigrations, truncateAll, ensureAdminUser, requireDatabaseUrl } = require('./helpers/db');

describe('bookings', () => {
  const dbUrl = requireDatabaseUrl();
  if (!dbUrl) {
    // eslint-disable-next-line jest/no-disabled-tests
    describe.skip('bookings (db)', () => {});
    return;
  }

  const app = createApp();
  let token;
  let serviceId;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
    await withTestDb(async (client) => {
      await client.query('BEGIN');
      await runMigrations(client);
      await truncateAll(client);
      await ensureAdminUser(client, 'admin', 'admin12345');
      const svc = await client.query(
        `INSERT INTO services (type, title_ru, is_active) VALUES ('repair','Ремонт кондиционеров', TRUE) RETURNING id`
      );
      serviceId = svc.rows[0].id;
      await client.query('COMMIT');
    });

    const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin12345' });
    token = login.body.token;
  });

  test('POST /api/bookings creates booking', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ user_name: 'Ivan', phone: '+79990000000', service_id: serviceId, address: 'Moscow' });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.booking.status).toBe('new');
  });

  test('GET /api/bookings requires auth', async () => {
    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(401);
  });

  test('GET /api/bookings returns bookings for admin', async () => {
    const res = await request(app).get('/api/bookings?status=all').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.bookings)).toBe(true);
  });
});

