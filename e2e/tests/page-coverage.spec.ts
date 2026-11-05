import { expect, test } from '@playwright/test';
import { API_URL, LANGUAGES, pathFor } from './helpers';

// Everything that came across from the old site, in all three languages.
const HIDDEN_UNTIL_CONFIRMED = ['actions', 'pokupki-v-kredit', 'politika-konfidencialnosti', 'polzovatelskoe-soglashenie', 'vakansiya'];
const RUSSIA_ONLY = /Москв|Подмоск|МКАД|Moscow|Մոսկվա|\d\s?(?:руб|₽)/;

test('every published page opens in every language with no Russian locations or prices', async ({ request }) => {
  test.setTimeout(600_000);
  const response = await request.get(`${API_URL}/api/pages/slugs`);
  const { pages } = (await response.json()) as { pages: { slug: string }[] };
  expect(pages.length).toBeGreaterThanOrEqual(60);

  const problems: string[] = [];
  for (const { slug } of pages) {
    for (const lang of LANGUAGES) {
      const path = pathFor(lang, slug);
      const page = await request.get(path);
      const html = await page.text();
      if (page.status() !== 200) problems.push(`${path}: ${page.status()}`);
      if (RUSSIA_ONLY.test(html)) problems.push(`${path}: ${html.match(RUSSIA_ONLY)?.[0]}`);
    }
  }
  expect(problems).toEqual([]);
});

test('pages waiting for confirmation stay hidden', async ({ request }) => {
  for (const slug of HIDDEN_UNTIL_CONFIRMED) {
    for (const lang of LANGUAGES) {
      const path = pathFor(lang, slug);
      expect((await request.get(path)).status(), path).toBe(404);
    }
  }
});

test('an unknown address is a 404', async ({ request }) => {
  expect((await request.get('/no-such-page')).status()).toBe(404);
});
