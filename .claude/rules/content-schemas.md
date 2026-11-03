---
paths:
  - "server/src/contentSchemas/**"
  - "admin/src/contentSchemas/**"
  - "server/src/routes/content.js"
  - "admin/src/pages/ContentPage.tsx"
  - "server/scripts/seed.js"
---

# Content block schemas

For adding or changing a block use the `content-block` skill.

## Two registries, one contract
Update both, every time, then run `node .claude/scripts/check-schema-parity.js`. Nothing in the test suite catches drift.
- `server/src/contentSchemas/registry.js`: AJV validation on save.
- `admin/src/contentSchemas/registry.ts`: form rendering and client-side validation. Adds `label`, `kind`, `help`, `groups`, `title`, `description`.

## Fields
- Blocks are keyed by `(page_name, section_name)`.
- `multilingual: true` expands `key` to `key_ru`, `key_en`, `key_hy`.
- Values are `string | null`. Schemas use `additionalProperties: false`, so unknown keys are rejected.

## Changes that affect stored data
Stored `content_json` is only validated when it is saved or restored.
- Removing or renaming a field blocks the next save of existing rows: the editor keeps the stale key and validation rejects it. Move the data in a migration. Old rows in `content_block_versions` keep the old keys, so they can no longer be restored.
- `required` only means the key must be present. `null` passes, and the editor fills missing keys with `null`, so it does not force an editor to enter a value.
- Seeds use `ON CONFLICT ... DO NOTHING`, so a new default in `seed.js` never reaches an existing row.

## Reads
`GET /api/content/:lang` maps `title_hy` to `title`, with no fallback between languages. A missing value is absent from the response, so pages must fall back to `t()`.
