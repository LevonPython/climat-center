---
name: db-content-reset
description: Reset and re-seed Postgres content blocks when the admin Content page is empty or partial, the content API returns no blocks, or seeding doesn't fix missing content because it never overwrites existing rows.
---

# Content reset

## What it destroys

`npm run reset:content -w server` runs `TRUNCATE` on `content_blocks` and `content_block_versions`, then re-seeds. **All editor changes and all version history in the target database are lost.** The script has no production guard and uses whatever `DATABASE_URL` resolves to.

## 1. Check the target

```bash
node .claude/scripts/db-target.js --require-local
```

- Exit 0 (`LOCAL`): continue. If the user didn't ask for a reset themselves, tell them local content edits will be lost before you run it.
- Non-zero (`REMOTE`): **stop.** Name the target and continue only if the user explicitly confirms a reset of that database.

## 2. Pick the least destructive fix

If `content_blocks` has no rows at all, a plain seed is enough and deletes nothing:

```bash
npm run migrate -w server
npm run seed -w server
```

If rows exist but are empty or partial, do the full reset:

```bash
npm run migrate -w server
npm run reset:content -w server
```

## 3. Verify

Run from the repo root:

```bash
node -e "require('dotenv').config({path:'server/.env'}); const {Client}=require('pg'); (async()=>{const c=new Client({connectionString:process.env.DATABASE_URL}); await c.connect(); const r=await c.query('select page_name, section_name from content_blocks order by page_name, section_name'); console.log(r.rows); await c.end();})().catch(e=>{console.error(e.code||e.message); process.exit(1);});"
```

Every block in `server/src/contentSchemas/registry.js` should be listed. If the API is running, `curl -s localhost:5000/api/content/hy` should return non-empty `pages`.
