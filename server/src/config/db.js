const { Pool } = require('pg');

let pool;

function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  pool = new Pool({ connectionString });
  pool.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Unexpected PG pool error', err);
  });
  return pool;
}

async function query(text, params) {
  return await getPool().query(text, params);
}

async function withClient(fn) {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

async function closePool() {
  if (!pool) return;
  const p = pool;
  pool = undefined;
  await p.end();
}

module.exports = {
  getPool,
  query,
  withClient,
  closePool
};

