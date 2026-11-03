const path = require('path');
const { spawnSync } = require('child_process');
const request = require('supertest');

const { createApp } = require('../src/app');
const { closePool } = require('../src/config/db');
const { withTestDb, runMigrations, truncateAll, requireDatabaseUrl } = require('./helpers/db');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'resetAdminPassword.js');
const USERNAME = 'reset_admin_test';

function runScript(env = {}) {
  return spawnSync(process.execPath, [SCRIPT], {
    encoding: 'utf8',
    env: { ...process.env, ADMIN_USERNAME: USERNAME, ...env }
  });
}

const dbUrl = requireDatabaseUrl();
if (!dbUrl) {
  test.skip('reset admin password requires DATABASE_URL', () => {});
} else {
  describe('reset:admin', () => {
    const app = createApp();
    const login = (password) => request(app).post('/api/auth/login').send({ username: USERNAME, password });

    beforeAll(async () => {
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
      await withTestDb(async (client) => {
        await runMigrations(client);
        await truncateAll(client);
      });
    });

    afterAll(async () => {
      await closePool();
    });

    test('creates a missing admin with a generated password', async () => {
      const result = runScript({ ADMIN_PASSWORD: '' });
      expect(result.status).toBe(0);

      const password = result.stdout.match(/^Password: (.+)$/m)?.[1];
      expect(password.length).toBeGreaterThanOrEqual(24);

      const res = await login(password);
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');
    });

    test('replaces the password of an existing admin without printing a provided one', async () => {
      const first = await login('not-the-password');
      expect(first.status).toBe(401);

      const password = 'a-provided-password-1234';
      const result = runScript({ ADMIN_PASSWORD: password });
      expect(result.status).toBe(0);
      expect(result.stdout).not.toContain(password);

      const res = await login(password);
      expect(res.status).toBe(200);
    });

    test('rejects a short password and leaves the account unchanged', async () => {
      const result = runScript({ ADMIN_PASSWORD: 'short' });
      expect(result.status).not.toBe(0);

      const res = await login('a-provided-password-1234');
      expect(res.status).toBe(200);
    });
  });
}
