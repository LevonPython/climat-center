const express = require('express');
const request = require('supertest');

const { createApp } = require('../src/app');
const { errorHandler } = require('../src/middleware/errorHandler');

const INTERNAL = 'connect ECONNREFUSED 10.0.0.5:5432 password=hunter2';

function appFailingWith(err) {
  const app = express();
  app.get('/', (req, res, next) => next(err));
  app.use(errorHandler);
  return app;
}

function errorWith(message, fields) {
  return Object.assign(new Error(message), fields);
}

describe('errorHandler', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test.each([
    ['no status', errorWith(INTERNAL, {}), 500],
    ['explicit 500', errorWith(INTERNAL, { status: 500 }), 500],
    ['explicit 503', errorWith(INTERNAL, { statusCode: 503 }), 503],
    ['status outside the error range', errorWith(INTERNAL, { status: 200 }), 500],
    ['non-numeric status', errorWith(INTERNAL, { status: 'bad' }), 500],
    ['unmapped Postgres error', errorWith(INTERNAL, { code: '42P01' }), 500]
  ])('hides internal text: %s', async (_name, err, status) => {
    const res = await request(appFailingWith(err)).get('/');
    expect(res.status).toBe(status);
    expect(res.body).toEqual({ ok: false, error: { message: 'Internal Server Error', status } });
  });

  test('keeps the full error in the server log', async () => {
    const err = new Error(INTERNAL);
    await request(appFailingWith(err)).get('/');
    expect(logSpy).toHaveBeenCalledWith(err);
  });

  test('keeps the message of a deliberate 4xx', async () => {
    const res = await request(appFailingWith(errorWith('Only image uploads are allowed', { status: 400 }))).get('/');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Only image uploads are allowed');
  });

  test.each([
    ['23505', 409, 'Already exists'],
    ['23503', 400, 'Invalid reference']
  ])('maps Postgres error %s without its text', async (code, status, message) => {
    const res = await request(appFailingWith(errorWith(INTERNAL, { code }))).get('/');
    expect(res.status).toBe(status);
    expect(res.body.error.message).toBe(message);
  });

  test('does not echo the request body when JSON is invalid', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"password":"hunter2"');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid JSON');
  });
});
