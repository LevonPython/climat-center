---
paths:
  - "server/src/contentSchemas/**"
  - "admin/src/contentSchemas/**"
  - "admin/src/components/BlockEditor.tsx"
  - "admin/src/components/FieldEditor.tsx"
  - "server/src/routes/content.js"
  - "server/scripts/seed.js"
---

# Content block schemas

For adding or changing a block use the `content-block` skill.

## One source
Definitions live only on the server. The admin builds its forms from `GET /api/admin/schemas`, so there is nothing to keep in sync.
- `server/src/contentSchemas/registry.js`: site blocks keyed by `(page_name, section_name)`, such as contacts, branding and the older fixed pages.
- `server/src/contentSchemas/blockTypes.js`: types of page sections, with repeatable lists, images and rich text.
- A section's look can follow its data instead of a setting. `callout` shows a picture beside its points, or beside the heading when it has none, and shows icons when points have them. `icon_features` turns into a row of links when an item has a link.
- `server/src/contentSchemas/validate.js` validates both with AJV on save.

## Labels
Labels are written in English on the server. The admin translates them by their exact text from `admin/public/locales/{hy,ru,en}/schema.json`. A new or changed label must be added to all three, and `admin/__tests__/schemaLabels.test.ts` fails until it is.

## Fields
- `multilingual: true` expands `key` to one key per language: `key_ru`, `key_en`, `key_hy`, `key_ar`.
- `kind` picks the form control: `string`, `text`, `url`, `link`, `email`, `phone`, `rich_text`, `image`, `select` or `list`. `url` is an outside web address, and `link` also allows a page on this site, `tel:` and `mailto:`.
- Values are `string | null`, a `list` is an array of objects, and a `select` must be one of `options`. Schemas use `additionalProperties: false`, so unknown keys are rejected.
- Each `fieldKeys` entry in a site block's `groups` must name a real field, and every field must be in a group. A server test checks this.

## Changes that affect stored data
Stored `content_json` is only validated when it is saved or restored.
- Removing or renaming a field blocks the next save of existing rows: the editor keeps the stale key and validation rejects it. Move the data in a migration. Old rows in `content_block_versions` keep the old keys, so they can no longer be restored.
- `required` only means the key must be present. `null` passes, and the editor fills missing keys with `null`, so it does not force an editor to enter a value.
- Seeds use `ON CONFLICT ... DO NOTHING`, so a new default in `seed.js` never reaches an existing row.

## Imported content
`server/scripts/content/` is the one-off pipeline from climatecentr.ru: crawl, extract to tracked JSON in `server/content/`, translate, import. It reuses the same validation, sanitizer and version history as the admin. Changing a section type's fields can break `contentData.test.js`, because the tracked JSON must still validate. Any change to extracted text changes its key in `translations/{hy,en}.json`.

## Reads
`GET /api/content/:lang` maps `title_hy` to `title`, with no fallback between languages. A missing value is absent from the response, so pages must fall back to `t()`.
