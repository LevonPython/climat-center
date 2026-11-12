---
name: i18n-sync
description: Add, rename or remove UI translation strings across the client catalogue (hy, en, ru, ar) and the admin catalogue (hy, en, ru). Use when a change adds user-facing text, when a translation is missing, or when keys may have drifted.
---

# Translations

## Which catalogue

| Text appears in | Files |
|---|---|
| Public site | `client/public/locales/{hy,en,ru,ar}/common.json` |
| Admin panel | `admin/public/locales/{hy,en,ru}/common.json` |

They are independent. A string used in both apps goes in both. Text that editors change belongs in a content block instead (see the `content-block` skill).

## Add a string

1. Add the key to every file of the right catalogue, in the same position, under the existing section (`booking.*`, `services.*`, and so on).
2. Write real translations. `hy` is the default locale, so it must be real Armenian. If you are unsure of a translation, say so in your report rather than leaving a placeholder.
3. Use it through `t('section.key')` from `useTranslation`. Prefer literal keys so the check can see them.
4. Run the check.

```bash
node .claude/scripts/check-locale-parity.js
```

## Rename or remove a string

1. Search for every use, including dynamic ones built from a prefix: `grep -rn "section.key" client admin --include=*.ts --include=*.tsx --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist`
2. Update every locale file and the code.
3. Update test mock maps. `client/__tests__/` tests such as `BookingForm.test.tsx` hardcode keys in their `t` mock.
4. Run the check and the affected workspace's tests.

## Writing the strings

- Confirmations stay plain and non-technical, such as "Request sent".
- Interpolate with `{{name}}` rather than joining translated fragments.
- Russian plurals need `_one`, `_few`, `_many`, `_other`.
- Keep Armenian and Russian natural rather than literal, and check that long strings still fit at 360px.

## What the check reports

- **Errors (exit 1)**: a key missing from a locale, or a literal `t('key')` in the code with no matching key. Fix these.
- **Warnings**: keys with no literal `t()` call. Many are read dynamically, such as `serviceTypes.*`, so confirm with grep before deleting anything.
