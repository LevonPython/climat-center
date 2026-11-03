#!/usr/bin/env node
// Usage: node .claude/scripts/check-schema-parity.js [--root <dir>]
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

function readRoot() {
  const index = process.argv.indexOf('--root');
  return index === -1 ? path.join(__dirname, '..', '..') : path.resolve(process.argv[index + 1]);
}

function loadTypeScriptModule(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  });
  const mod = new Module(file);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod._compile(outputText, file);
  return mod.exports;
}

function difference(a, b) {
  const other = new Set(b);
  return a.filter((item) => !other.has(item));
}

function compareList(label, key, serverList, adminList) {
  const onlyServer = difference(serverList, adminList);
  const onlyAdmin = difference(adminList, serverList);
  const out = [];
  if (onlyServer.length) out.push(`${key}: ${label} only in server: ${onlyServer.join(', ')}`);
  if (onlyAdmin.length) out.push(`${key}: ${label} only in admin: ${onlyAdmin.join(', ')}`);
  return out;
}

function main() {
  const root = readRoot();
  const server = require(path.join(root, 'server/src/contentSchemas/registry.js')).ALL_BLOCKS;
  const admin = loadTypeScriptModule(path.join(root, 'admin/src/contentSchemas/registry.ts')).ALL_BLOCK_DEFS;

  const serverByKey = new Map(server.map((block) => [block.schemaKey, block]));
  const adminByKey = new Map(admin.map((block) => [block.schemaKey, block]));
  const problems = [];

  for (const key of new Set([...serverByKey.keys(), ...adminByKey.keys()])) {
    const s = serverByKey.get(key);
    const a = adminByKey.get(key);
    if (!s || !a) {
      problems.push(`${key}: block only in ${s ? 'server' : 'admin'}`);
      continue;
    }
    problems.push(...compareList('field', key, s.allowedKeys, a.allowedKeys));
    problems.push(...compareList('required field', key, s.jsonSchema.required || [], a.jsonSchema.required || []));
  }

  if (problems.length) {
    console.error(`Schema registries differ:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`Schema registries match: ${serverByKey.size} blocks.`);
}

main();
