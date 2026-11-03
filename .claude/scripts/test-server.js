#!/usr/bin/env node
// Server suites TRUNCATE every table, and skip silently without DATABASE_URL.
// This runner always gives them a real, disposable database.
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { ROOT, resolveDatabaseUrl, describeTarget } = require('./db-target');

const TEST_DATABASE = 'climat_center_test';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function buildTestUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.pathname = `/${TEST_DATABASE}`;
  return url.toString();
}

async function ensureTestDatabase(baseUrl) {
  const client = new Client({ connectionString: baseUrl });
  await client.connect();
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DATABASE]);
    if (existing.rowCount > 0) return;
    await client.query(`CREATE DATABASE ${TEST_DATABASE}`);
    console.log(`Created database ${TEST_DATABASE}`);
  } finally {
    await client.end();
  }
}

async function main() {
  const baseUrl = resolveDatabaseUrl();
  if (!baseUrl) fail('DATABASE_URL is empty in the shell, or missing from server/.env');
  if (!describeTarget(baseUrl).isLocal) fail('Refusing: server tests TRUNCATE tables and only run on a local database.');

  const testUrl = buildTestUrl(baseUrl);
  const target = describeTarget(testUrl);
  if (!target.isLocal || !target.database.endsWith('_test')) fail('Refusing: test database must be local and end in _test.');

  await ensureTestDatabase(baseUrl);

  const result = spawnSync('npm', ['run', 'test', '-w', 'server', '--', ...process.argv.slice(2)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testUrl, JWT_SECRET: process.env.JWT_SECRET || 'test_secret' }
  });
  process.exit(typeof result.status === 'number' ? result.status : 1);
}

main().catch((err) => fail(`Could not prepare the test database: ${err.code || err.message}`));
