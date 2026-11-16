const jwt = require('jsonwebtoken');

const { closePool, query } = require('../src/config/db');
const { ensureUser, requireDatabaseUrl, withTestDb } = require('./helpers/db');
const { setupApi } = require('./helpers/api');

const PASSWORDS = { admin: 'admin12345', editor: 'editor12345' };

const dbUrl = requireDatabaseUrl();
if (!dbUrl) {
  test.skip('passwords require DATABASE_URL', () => {});
} else {
  describe('password changes', () => {
    let anon;
    let api;

    const login = (username, password) => anon.post('/api/auth/login').send({ username, password });
    const idOf = async (username) => (await query('SELECT id FROM users WHERE username = $1', [username])).rows[0].id;
    const withToken = (token) => ({
      get: (url) => anon.get(url).set('Authorization', `Bearer ${token}`),
      put: (url) => anon.put(url).set('Authorization', `Bearer ${token}`)
    });

    beforeAll(async () => {
      ({ anon } = await setupApi());
    });

    // Tests change passwords, so each one starts from the known passwords and fresh logins.
    beforeEach(async () => {
      await withTestDb(async (client) => {
        for (const [role, password] of Object.entries(PASSWORDS)) await ensureUser(client, role, password, role);
      });
      const tokenFor = async (role) => (await login(role, PASSWORDS[role])).body.token;
      api = { anon, admin: withToken(await tokenFor('admin')), editor: withToken(await tokenFor('editor')) };
    });

    afterAll(async () => {
      await closePool();
    });

    describe('PUT /api/auth/password', () => {
      test.each([
        ['admin', 'admin12345'],
        ['editor', 'editor12345']
      ])('%s changes their own password and only the new token keeps working', async (role, current) => {
        const res = await api[role].put('/api/auth/password').send({ current_password: current, new_password: 'brand-new-pass' });
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);

        const fresh = await api.anon.get('/api/admin/pages').set('Authorization', `Bearer ${res.body.token}`);
        expect(fresh.status).toBe(200);
        expect((await api[role].get('/api/admin/pages')).status).toBe(401);
        expect((await login(role, 'brand-new-pass')).status).toBe(200);
        expect((await login(role, current)).status).toBe(401);
      });

      test('a wrong current password is refused and nothing changes', async () => {
        const res = await api.editor.put('/api/auth/password').send({ current_password: 'not-my-password', new_password: 'brand-new-pass' });
        expect(res.status).toBe(403);
        expect((await login('editor', 'editor12345')).status).toBe(200);
      });

      test('a new password shorter than 8 characters is refused', async () => {
        const res = await api.editor.put('/api/auth/password').send({ current_password: 'editor12345', new_password: 'short' });
        expect(res.status).toBe(400);
        expect((await login('editor', 'editor12345')).status).toBe(200);
      });

      test('needs a login', async () => {
        const res = await api.anon.put('/api/auth/password').send({ current_password: 'editor12345', new_password: 'brand-new-pass' });
        expect(res.status).toBe(401);
      });
    });

    describe('PUT /api/auth/users/:id/password', () => {
      test("an admin sets another user's password and signs that user out", async () => {
        const res = await api.admin.put(`/api/auth/users/${await idOf('editor')}/password`).send({ password: 'given-by-admin' });
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);

        expect((await api.editor.get('/api/admin/pages')).status).toBe(401);
        expect((await login('editor', 'given-by-admin')).status).toBe(200);
        expect((await api.admin.get('/api/admin/pages')).status).toBe(200);
      });

      test('an editor cannot set passwords', async () => {
        const res = await api.editor.put(`/api/auth/users/${await idOf('admin')}/password`).send({ password: 'given-by-editor' });
        expect(res.status).toBe(403);
        expect((await login('admin', 'admin12345')).status).toBe(200);
      });

      test('needs a login', async () => {
        const res = await api.anon.put(`/api/auth/users/${await idOf('editor')}/password`).send({ password: 'given-by-nobody' });
        expect(res.status).toBe(401);
      });

      test('refuses a short password, a bad id and an unknown user', async () => {
        const editorId = await idOf('editor');
        expect((await api.admin.put(`/api/auth/users/${editorId}/password`).send({ password: 'short' })).status).toBe(400);
        expect((await api.admin.put('/api/auth/users/not-a-uuid/password').send({ password: 'given-by-admin' })).status).toBe(400);
        const unknown = await api.admin.put('/api/auth/users/00000000-0000-4000-8000-000000000000/password').send({ password: 'given-by-admin' });
        expect(unknown.status).toBe(404);
      });

      test.each([
        ['as stored', (id) => id],
        ['in capitals', (id) => id.toUpperCase()]
      ])('an admin changes their own password on the password page, not here (id %s)', async (_label, spell) => {
        const res = await api.admin.put(`/api/auth/users/${spell(await idOf('admin'))}/password`).send({ password: 'given-by-admin' });
        expect(res.status).toBe(400);
        expect((await login('admin', 'admin12345')).status).toBe(200);
      });
    });

    test('a token issued before password fingerprints is refused', async () => {
      const token = jwt.sign({ username: 'admin', role: 'admin' }, process.env.JWT_SECRET, { subject: await idOf('admin'), expiresIn: '1h' });
      const res = await api.anon.get('/api/admin/pages').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });
}
