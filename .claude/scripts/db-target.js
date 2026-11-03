#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.join(__dirname, '..', '..');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

// Same precedence as server/scripts/*: a shell DATABASE_URL beats server/.env.
// Parsed rather than loaded so no other server/.env value leaks into this process.
function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL !== undefined) return process.env.DATABASE_URL;
  const envPath = path.join(ROOT, 'server', '.env');
  if (!fs.existsSync(envPath)) return null;
  return dotenv.parse(fs.readFileSync(envPath)).DATABASE_URL || null;
}

function describeTarget(url) {
  const parsed = new URL(url);
  const isLocal = LOCAL_HOSTS.has(parsed.hostname);
  return {
    isLocal,
    database: parsed.pathname.replace(/^\//, ''),
    provider: isLocal ? 'local' : parsed.hostname.split('.').slice(-2).join('.')
  };
}

function main() {
  const url = resolveDatabaseUrl();
  if (!url) {
    console.error('DATABASE_URL is empty in the shell, or missing from server/.env');
    process.exit(2);
  }

  let target;
  try {
    target = describeTarget(url);
  } catch {
    console.error('DATABASE_URL is not a valid URL');
    process.exit(2);
  }

  console.log(`${target.isLocal ? 'LOCAL' : 'REMOTE'} database=${target.database} provider=${target.provider}`);
  if (process.argv.includes('--require-local') && !target.isLocal) {
    console.error('Refusing: this operation needs explicit confirmation on a remote database.');
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { ROOT, resolveDatabaseUrl, describeTarget };
