---
name: db-content-reset
description: Resets and re-seeds Postgres content blocks when admin content is empty, seed does not overwrite existing rows, or content-related jobs fail. Use when user asks to revert/seed DB or when failures are caused by missing/empty content_blocks.
---

# DB Content Reset (revert + seed)

## What this is for

Use this workflow when:
- Admin **Content** page shows empty/partial fields even though blocks exist
- `npm run seed -w server` doesn't fix it because seed uses `ON CONFLICT ... DO NOTHING`
- Any job fails due to missing/empty `content_blocks` data (content API returns 0 blocks, or blocks have `{}` / missing keys)

This **deletes** content data in:
- `content_blocks`
- `content_block_versions`

## Default fix (recommended)

Run migrations, then hard reset + reseed content:

```bash
npm run migrate -w server
npm run reset:content -w server
```

## Less destructive option (only when tables are empty)

If `content_blocks` is empty (no rows), a plain seed is enough:

```bash
npm run seed -w server
```

## Quick verification

After reset, confirm blocks exist:

```bash
node -e "require('dotenv').config({path:'server/.env'}); const {Client}=require('pg'); (async()=>{const c=new Client({connectionString:process.env.DATABASE_URL}); await c.connect(); const r=await c.query('select page_name, section_name from content_blocks order by page_name, section_name'); console.log(r.rows); await c.end();})().catch(e=>{console.error(e); process.exit(1);});"
```

