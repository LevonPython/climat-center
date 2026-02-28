const express = require('express');
const request = require('supertest');

jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/config/revalidateClient', () => ({
  // Simulate "fire-and-forget" not blocking the HTTP response.
  triggerRevalidate: jest.fn(() => new Promise(() => {}))
}));

jest.mock('../src/middleware/auth', () => ({
  verifyToken: (req, _res, next) => next(),
  requireAnyRole: () => (req, _res, next) => next()
}));

const { query } = require('../src/config/db');
const { triggerRevalidate } = require('../src/config/revalidateClient');
const { servicesRouter } = require('../src/routes/services');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/services', servicesRouter);
  // Minimal error handler for tests.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => res.status(500).json({ ok: false, error: { message: err?.message || 'Error' } }));
  return app;
}

describe('services mutations trigger revalidate(services)', () => {
  const app = createTestApp();
  const id = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    query.mockReset();
    triggerRevalidate.mockClear();
  });

  test('POST /api/services triggers revalidate and does not block response', async () => {
    query.mockResolvedValueOnce({ rows: [{ id, type: 'service', is_active: true }], rowCount: 1 });

    const res = await request(app)
      .post('/api/services')
      .send({ type: 'service', title_ru: 'Услуга' })
      .timeout({ response: 800 });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(triggerRevalidate).toHaveBeenCalledWith('services');
  });

  test('PUT /api/services/:id triggers revalidate and does not block response', async () => {
    query.mockResolvedValueOnce({ rows: [{ id, type: 'service', is_active: true }], rowCount: 1 });

    const res = await request(app)
      .put(`/api/services/${id}`)
      .send({ is_active: true })
      .timeout({ response: 800 });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(triggerRevalidate).toHaveBeenCalledWith('services');
  });

  test('PUT /api/services/:id does not trigger revalidate on 404', async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).put(`/api/services/${id}`).send({ is_active: true });

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(triggerRevalidate).not.toHaveBeenCalled();
  });

  test('DELETE /api/services/:id triggers revalidate and does not block response', async () => {
    query.mockResolvedValueOnce({ rows: [{ id, type: 'service', is_active: false }], rowCount: 1 });

    const res = await request(app).delete(`/api/services/${id}`).timeout({ response: 800 });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(triggerRevalidate).toHaveBeenCalledWith('services');
  });

  test('DELETE /api/services/:id does not trigger revalidate on 404', async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).delete(`/api/services/${id}`);

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(triggerRevalidate).not.toHaveBeenCalled();
  });
});

