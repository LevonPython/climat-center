const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load env from server/.env for scripts
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const id = file;
      const already = await client.query('SELECT 1 FROM _migrations WHERE id = $1', [id]);
      if (already.rowCount > 0) continue;

      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      console.log(`Applying migration: ${file}`);
      await client.query(sql);
      await client.query('INSERT INTO _migrations (id) VALUES ($1)', [id]);
    }

    await client.query('COMMIT');
    console.log('Migrations complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
