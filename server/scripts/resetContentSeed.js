const path = require('path');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');

// Load env from server/.env for scripts
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function resetContentTables() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE content_block_versions, content_blocks CASCADE');
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

async function main() {
  await resetContentTables();
  const seedPath = path.join(__dirname, 'seed.js');
  const res = spawnSync(process.execPath, [seedPath], { stdio: 'inherit' });
  process.exit(typeof res.status === 'number' ? res.status : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

