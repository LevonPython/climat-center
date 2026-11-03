const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

// Load env from server/.env for scripts
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MIN_PASSWORD_LENGTH = 12;

function describeTarget(databaseUrl) {
  const { hostname } = new URL(databaseUrl);
  if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)) return 'LOCAL';
  return `REMOTE (${hostname.split('.').slice(-2).join('.')})`;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const target = describeTarget(databaseUrl);
  const username = process.env.ADMIN_USERNAME || 'admin';
  const providedPassword = process.env.ADMIN_PASSWORD;
  if (providedPassword && providedPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  const password = providedPassword || crypto.randomBytes(24).toString('base64url');
  const passwordHash = await bcrypt.hash(password, 10);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      `
      INSERT INTO users (username, password_hash, role)
      VALUES ($1, $2, 'admin')
      ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'
    `,
      [username, passwordHash]
    );
  } finally {
    await client.end();
  }

  console.log(`Admin "${username}" password set on ${target} database.`);
  if (!providedPassword) console.log(`Password: ${password}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
