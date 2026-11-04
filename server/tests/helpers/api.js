const request = require('supertest');

const { createApp } = require('../../src/app');
const { withTestDb, runMigrations, truncateAll, ensureUser } = require('./db');

async function setupApi() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
  await withTestDb(async (client) => {
    await runMigrations(client);
    await truncateAll(client);
    await ensureUser(client, 'admin', 'admin12345', 'admin');
    await ensureUser(client, 'editor', 'editor12345', 'editor');
  });

  const app = createApp();

  async function tokenFor(username, password) {
    const res = await request(app).post('/api/auth/login').send({ username, password });
    return res.body.token;
  }

  function clientWith(token) {
    const withAuth = (method) => (url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);
    return { get: withAuth('get'), post: withAuth('post'), put: withAuth('put'), delete: withAuth('delete') };
  }

  return {
    anon: request(app),
    admin: clientWith(await tokenFor('admin', 'admin12345')),
    editor: clientWith(await tokenFor('editor', 'editor12345'))
  };
}

module.exports = { setupApi };
