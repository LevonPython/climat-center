const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Keep CI logs clean; the tests will be skipped by callers.
    return null;
  }
  return url;
}

async function runMigrations(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const already = await client.query('SELECT 1 FROM _migrations WHERE id = $1', [file]);
    if (already.rowCount > 0) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await client.query(sql);
    await client.query('INSERT INTO _migrations (id) VALUES ($1)', [file]);
  }
}

async function truncateAll(client) {
  await client.query('TRUNCATE TABLE quiz_submissions CASCADE');
  await client.query('TRUNCATE TABLE bookings CASCADE');
  await client.query('TRUNCATE TABLE services CASCADE');
  await client.query('TRUNCATE TABLE content_blocks CASCADE');
  await client.query('TRUNCATE TABLE users CASCADE');
}

async function ensureAdminUser(client, username, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  await client.query(
    `
    INSERT INTO users (username, password_hash, role)
    VALUES ($1, $2, 'admin')
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'
  `,
    [username, passwordHash]
  );
}

async function withTestDb(fn) {
  const url = requireDatabaseUrl();
  if (!url) return await fn(null);
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

module.exports = {
  requireDatabaseUrl,
  withTestDb,
  runMigrations,
  truncateAll,
  ensureAdminUser
};

