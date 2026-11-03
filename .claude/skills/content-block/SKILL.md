---
name: content-block
description: Add or change a CMS content block across the server registry, admin registry, seed, and public page. Use when adding editable text to a page, changing block fields, or when the two content schema registries may have drifted.
---

# Content blocks

A block is defined twice, and nothing in the test suite notices when the two copies disagree. The parity check at the end of this workflow is the only guard, so it always runs.

## Add a block

1. **Server registry**: `server/src/contentSchemas/registry.js`, in `ALL_BLOCKS`:
   ```js
   defineBlock('home', 'promo', [
     { key: 'title', multilingual: true },
     { key: 'phone' }
   ]),
   ```
2. **Admin registry**: `admin/src/contentSchemas/registry.ts`, in `ALL_BLOCK_DEFS`, with the same keys plus UI metadata:
   ```ts
   defineBlock({
     page_name: 'home',
     section_name: 'promo',
     title: 'Home / Promo',
     groups: [{ id: 'main', label: 'Main', fieldKeys: ['title', 'phone'] }],
     fields: [
       { key: 'title', label: 'Title', kind: 'string', multilingual: true },
       { key: 'phone', label: 'Phone', kind: 'phone' }
     ]
   }),
   ```
3. **Seed**: add a default row in `server/scripts/seed.js`. It only reaches databases that don't have the row yet. Existing databases get it from the admin form or the `db-content-reset` skill.
4. **Public page**: read it in `getStaticProps` from `content.pages?.home?.promo`, pass `value ?? null`, and render `value ?? t('key')`. The API has no fallback between languages, so `t()` is always needed.
5. **New page only**: add its path to `pathsForEvent` in `client/pages/api/revalidate.ts`.
6. **Tests**: extend `server/tests/content.test.js` if behaviour changes, and run `node .claude/scripts/test-server.js`.
7. **Parity**: `node .claude/scripts/check-schema-parity.js`

## Change an existing block

- **Add a field**: edit both registries. Existing rows are fine, because the editor fills the new key with `null`.
- **Remove or rename a field**: edit both registries and move the stored data in a migration (see the `db-migration` skill). Otherwise the editor keeps the stale key and blocks every save.
  ```sql
  UPDATE content_blocks
  SET content_json = (content_json - 'old_ru' - 'old_en' - 'old_am')
    || jsonb_strip_nulls(jsonb_build_object(
         'new_ru', content_json->'old_ru',
         'new_en', content_json->'old_en',
         'new_am', content_json->'old_am'))
  WHERE page_name = 'home' AND section_name = 'promo';
  ```
  Tell the user that older entries in the block's version history keep the old keys and can no longer be restored.
- **`required: true`**: this only requires the key to exist. `null` passes, so don't use it to force editors to fill a value in.

## What the parity check compares

`check-schema-parity.js` loads both registries and compares block keys, expanded field keys and `required` keys. It exits non-zero on any difference. UI-only metadata (`label`, `kind`, `groups`) exists only in admin and isn't compared.

A difference is never "expected": fix the registry that is wrong, not the check.
