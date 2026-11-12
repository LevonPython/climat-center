---
name: content-block
description: Add or change a CMS content block or page section type on the server, with its admin labels, seed and public rendering. Use when adding editable text to a page or changing block fields.
---

# Content blocks

Definitions live only on the server, and the admin builds its forms from them through `GET /api/admin/schemas`. There are two kinds:
- **Site blocks** in `server/src/contentSchemas/registry.js`: one per site, keyed by `(page_name, section_name)`, such as contacts and branding.
- **Section types** in `server/src/contentSchemas/blockTypes.js`: added to pages any number of times, with lists, images and rich text.

## Add a site block

1. **Registry**: add to `ALL_BLOCKS`:
   ```js
   defineBlock(
     'home',
     'promo',
     {
       title: 'Home page: promotion',
       description: 'Promotion shown on the home page.',
       groups: [{ id: 'main', label: 'Promotion', fieldKeys: ['title', 'phone'] }]
     },
     [text('title', 'Title'), phone]
   ),
   ```
2. **Labels**: add every new label to `admin/public/locales/{hy,ru,en}/schema.json`, in real Armenian and Russian.
3. **Seed**: add a default row in `server/scripts/seed.js` if the page needs one. It only reaches databases that don't have the row yet, and the admin can also create it on first save.
4. **Public page**: read it in `getStaticProps` from `content.pages?.home?.promo`, pass `value ?? null`, and render `value ?? t('key')`. The API has no fallback between languages, so `t()` is always needed.
5. **New page only**: nothing to do. Pages come from the admin and the catch-all route renders them.
6. **Tests**: extend `server/tests/content.test.js` if behaviour changes, then run `node .claude/scripts/test-server.js` and `npm run test -w admin`. `schemaLabels.test.ts` fails if a label has no translation.

## Add a section type

1. **Definition**: add to `ALL_BLOCK_TYPES` in `blockTypes.js` with `defineBlockType(type, label, description, fields)`.
2. **Labels**: as above.
3. **Public site**: render the new type wherever the site renders page sections.

## Change an existing block

- **Add a field**: edit the definition and add its label. Existing rows are fine, because the editor fills the new key with `null`.
- **Remove or rename a field**: edit the definition and move the stored data in a migration (see the `db-migration` skill). Otherwise the editor keeps the stale key and blocks every save.
  ```sql
  UPDATE content_blocks
  SET content_json = (content_json - 'old_ru' - 'old_en' - 'old_hy' - 'old_ar')
    || jsonb_strip_nulls(jsonb_build_object(
         'new_ru', content_json->'old_ru',
         'new_en', content_json->'old_en',
         'new_hy', content_json->'old_hy',
         'new_ar', content_json->'old_ar'))
  WHERE page_name = 'home' AND section_name = 'promo';
  ```
  Tell the user that older entries in the block's version history keep the old keys and can no longer be restored.
- **`required: true`**: this only requires the key to exist. `null` passes, so don't use it to force editors to fill a value in.
