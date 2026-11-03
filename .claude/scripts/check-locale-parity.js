#!/usr/bin/env node
// Usage: node .claude/scripts/check-locale-parity.js [--root <dir>]
const fs = require('fs');
const path = require('path');

const LOCALES = ['am', 'en', 'ru'];
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const T_CALL = /\bt\(\s*['"`]([^'"`$]+)['"`]/g;
const SOURCE_FILE = /\.tsx?$/;
const APPS = [
  { name: 'client', catalogue: 'client/public/locales', sources: ['client/pages', 'client/components', 'client/lib'] },
  { name: 'admin', catalogue: 'admin/public/locales', sources: ['admin/src'] }
];

function readRoot() {
  const index = process.argv.indexOf('--root');
  return index === -1 ? path.join(__dirname, '..', '..') : path.resolve(process.argv[index + 1]);
}

function flatten(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) =>
    child && typeof child === 'object' && !Array.isArray(child) ? flatten(child, `${prefix}${key}.`) : [`${prefix}${key}`]
  );
}

function listSourceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return SOURCE_FILE.test(entry.name) ? [full] : [];
  });
}

function findUsedKeys(root, sources) {
  const used = new Map();
  for (const dir of sources) {
    for (const file of listSourceFiles(path.join(root, dir))) {
      for (const match of fs.readFileSync(file, 'utf8').matchAll(T_CALL)) {
        if (!used.has(match[1])) used.set(match[1], path.relative(root, file));
      }
    }
  }
  return used;
}

// A used key may name a leaf, an object read with returnObjects, or a plural base.
function isDefined(key, known) {
  if (known.has(key)) return true;
  return [...known].some((candidate) => candidate.startsWith(`${key}.`) || candidate.replace(PLURAL_SUFFIX, '') === key);
}

function isUsed(key, used) {
  const base = key.replace(PLURAL_SUFFIX, '');
  return [...used.keys()].some((name) => name === key || name === base || key.startsWith(`${name}.`));
}

function checkApp(root, app) {
  const problems = [];
  const keysByLocale = Object.fromEntries(
    LOCALES.map((locale) => {
      const file = path.join(root, app.catalogue, locale, 'common.json');
      return [locale, new Set(flatten(JSON.parse(fs.readFileSync(file, 'utf8'))))];
    })
  );
  const allKeys = new Set(LOCALES.flatMap((locale) => [...keysByLocale[locale]]));

  for (const locale of LOCALES) {
    const missing = [...allKeys].filter((key) => !keysByLocale[locale].has(key));
    if (missing.length) problems.push(`${app.name}/${locale} is missing: ${missing.join(', ')}`);
  }

  const used = findUsedKeys(root, app.sources);
  for (const [key, file] of used) {
    if (!isDefined(key, allKeys)) problems.push(`${app.name}: ${file} uses undefined key "${key}"`);
  }

  const unused = [...allKeys].filter((key) => !isUsed(key, used));
  return { problems, total: allKeys.size, unused };
}

function main() {
  const root = readRoot();
  const results = APPS.map((app) => ({ app, ...checkApp(root, app) }));
  const problems = results.flatMap((result) => result.problems);

  for (const { app, total, unused } of results) {
    console.log(`${app.name}: ${total} keys in ${LOCALES.length} locales`);
    if (unused.length) {
      const sample = unused.slice(0, 10).join(', ');
      console.log(`  warning: ${unused.length} keys not found as literal t() calls (may be dynamic): ${sample}`);
    }
  }

  if (problems.length) {
    console.error(`Locale problems:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log('Locale catalogues match.');
}

main();
