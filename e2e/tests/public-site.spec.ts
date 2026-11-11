import { expect, test } from '@playwright/test';
import { API_URL, IS_LOCAL } from './helpers';

const REPAIR = '/en/usluga/remont-kondicionerov';
const PHONE = '+37491000000';

test('home opens in Armenian and keeps the page when the language changes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hy');
  await expect(page.locator('h1').first()).toContainText(/[Ա-և]/);

  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.goto(REPAIR);
  await page.getByRole('button', { name: 'RU', exact: true }).click();
  await expect(page).toHaveURL(/\/ru\/usluga\/remont-kondicionerov$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
});

test('longer Armenian words are not cut off on the home page', async ({ page }) => {
  await page.goto('/');
  const clipped = await page.getByRole('main').evaluate((main) =>
    [...main.querySelectorAll<HTMLElement>('*')]
      .filter((el) => !el.classList.contains('sr-only') && getComputedStyle(el).overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 2)
      .map((el) => el.textContent?.trim().slice(0, 50))
  );
  expect(clipped).toEqual([]);
});

test('a large logo file keeps the logo at its header size', async ({ page, request }) => {
  const { settings } = await (await request.get(`${API_URL}/api/site/en`)).json();
  const stored: string = settings.branding.logo_url;
  const logoUrl = stored.startsWith('/uploads/') ? `${API_URL}${stored}` : stored;
  await page.route(logoUrl, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254"><rect width="1254" height="1254" fill="#00adef"/></svg>' })
  );

  await page.goto('/en');
  const logo = page.getByRole('banner').locator(`img[src="${logoUrl}"]`);
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1254);
  const box = await logo.boundingBox();
  expect(box?.height).toBe(92);
});

test('the top bar links can be read on its blue background', async ({ page }) => {
  await page.goto('/en');
  const link = page.getByRole('link', { name: 'Our work', exact: true }).first();
  await expect(link).toHaveCSS('color', 'rgb(255, 255, 255)');
});

test('the hero and brands appear only where the original has them', async ({ page }) => {
  const heroButton = page.getByRole('navigation', { name: 'Services and maintenance' }).getByRole('link', { name: 'Repair', exact: true });
  const brands = page.getByRole('group', { name: 'Brands we service' });

  await page.goto('/en');
  await expect(heroButton).toBeVisible();
  await expect(brands).toBeVisible();

  await page.goto(REPAIR);
  await expect(heroButton).toBeVisible();
  await expect(brands).toHaveCount(0);

  for (const path of ['/en/uslugi/uslugi-i-servis', '/en/kak-chasto-nuzhno-provodit-tehosmotr-kondicionera', '/en/nashi-raboty', '/en/kontakty', '/en/booking']) {
    await page.goto(path);
    await expect(heroButton, path).toHaveCount(0);
  }
});

test('a service page opens at its breadcrumbs, and home at the top', async ({ page }) => {
  await page.goto(REPAIR);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(200);
  const top = await page.getByRole('navigation', { name: 'You are here' }).evaluate((nav) => Math.round(nav.getBoundingClientRect().top));
  expect(Math.abs(top)).toBeLessThanOrEqual(2);

  await page.goto('/en');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('the two home offers sit side by side', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('main').locator('h1 + div img').first()).toBeVisible();
  const [first, second] = await page.getByRole('main').locator('h1 + div img').evaluateAll((images) => images.map((image) => Math.round(image.getBoundingClientRect().top)));
  expect(first).toBe(second);
});

test('the listing shows blue tiles in two columns', async ({ page }) => {
  await page.goto('/en/uslugi/uslugi-i-servis');
  const tile = page.getByRole('main').getByRole('link', { name: /repair/i }).first();
  await expect(tile).toHaveCSS('background-color', 'rgb(0, 173, 239)');
  await expect(tile).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(tile).toBeVisible();
  const lefts = await page.getByRole('main').locator('ul').first().locator('a').evaluateAll((links) => new Set(links.map((link) => Math.round(link.getBoundingClientRect().left))).size);
  expect(lefts).toBe(2);
});

test('the works gallery has three columns', async ({ page }) => {
  await page.goto('/en/nashi-raboty');
  const pictures = page.getByRole('main').getByRole('button', { name: /Show picture/ });
  await expect(pictures.first()).toBeVisible();
  const lefts = await pictures.evaluateAll((buttons) => new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().left))).size);
  expect(lefts).toBe(3);
});

test('the works gallery loads resized pictures, not the full files', async ({ page }) => {
  test.skip(IS_LOCAL, 'Local uploads are stored on the API, not in the Blob store.');
  await page.goto('/en/nashi-raboty');
  const picture = page.getByRole('main').getByRole('button', { name: /Show picture/ }).first().locator('img');
  await expect(picture).toBeVisible();
  await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.currentSrc)).toContain('/_next/image');
  await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
});

test('a service opens from the hero with its breadcrumbs and prices', async ({ page }) => {
  await page.goto('/en');
  await page.getByRole('navigation', { name: 'Services and maintenance' }).getByRole('link', { name: 'Repair', exact: true }).click();

  await expect(page).toHaveURL(/\/en\/usluga\/remont-kondicionerov$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('repair');
  await expect(page.getByRole('navigation', { name: 'You are here' }).getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(page.getByText('Price on request').first()).toBeVisible();
});

test('the sidebar links every service and fault', async ({ page }) => {
  await page.goto(REPAIR);
  const sidebar = page.getByRole('complementary');
  await expect(sidebar.getByRole('link', { name: 'Air conditioner cleaning' })).toBeVisible();
  await sidebar.getByRole('link', { name: 'Bad smell?' }).click();
  await expect(page).toHaveURL(/\/en\/usluga\/nepriyatnyy-zapah-iz-kondicionera$/);
});

test('the works gallery opens a picture and closes it again', async ({ page }) => {
  await page.goto('/en/nashi-raboty');
  await page.getByRole('button', { name: 'Show picture 1', exact: true }).click();

  const viewer = page.getByRole('dialog', { name: 'Picture' });
  await expect(viewer.locator('img')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
});

test('an FAQ answer opens when its question is clicked', async ({ page }) => {
  await page.goto('/en/usluga/dozapravka-kondicionerov');
  const question = page.locator('summary', { hasText: 'Does an air conditioner need regular freon recharging?' });
  const answer = page.getByText('In a sealed system, freon is not used up');

  await expect(answer).toBeHidden();
  await question.click();
  await expect(answer).toBeVisible();
});

test('the request popup asks for valid details first', async ({ page }) => {
  await page.goto(REPAIR);
  await page.getByRole('banner').getByRole('button', { name: /request/i }).click();
  const popup = page.getByRole('dialog', { name: 'Online request' });

  await popup.getByLabel('Name').fill('E2E');
  await popup.getByLabel('Phone').fill('+1234');
  await popup.getByLabel('Phone').blur();
  await expect(popup.getByText('Enter a valid phone number starting with +374.')).toBeVisible();

  await popup.getByLabel('Phone').fill(PHONE);
  await popup.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(popup.getByText('Choose at least one kind of work.')).toBeVisible();

  await popup.getByRole('button', { name: 'Close' }).click();
  await expect(popup).toBeHidden();
});

test('the inline form sends a request', async ({ page }) => {
  test.skip(!IS_LOCAL, 'Sending requests writes to the database.');
  await page.goto('/en');

  const form = page.getByRole('main').locator('form').first();
  await form.getByLabel('Name').fill('E2E inline form');
  await form.getByLabel('Phone').fill(PHONE);
  await form.getByRole('button').click();
  await expect(page.getByRole('status')).toContainText('Request sent');
});

test('booking and quiz keep working', async ({ page }) => {
  await page.goto('/en/booking');
  await expect(page.getByRole('main').getByLabel('Phone')).toBeVisible();

  await page.goto('/en/quiz');
  await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible();
});

test('the old addresses redirect', async ({ request }) => {
  for (const [from, to] of [
    ['/about', '/o-kompanii-centr-klimata'],
    ['/contacts', '/kontakty'],
    ['/services', '/uslugi/uslugi-i-servis']
  ]) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBeGreaterThanOrEqual(300);
    expect(response.status(), from).toBeLessThan(400);
    expect(response.headers().location, from).toContain(to);
  }
});

test('search engines get a sitemap, translated titles and language links', async ({ page, request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/usluga/remont-kondicionerov');
  expect(sitemap).toContain('/en/usluga/remont-kondicionerov');
  expect(sitemap).not.toContain('politika-konfidencialnosti');

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Sitemap: .*sitemap\.xml/);

  await page.goto(REPAIR);
  await expect(page).toHaveTitle(/Yerevan/);
  await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveAttribute('href', /\/ru\/usluga\/remont-kondicionerov$/);
});
