import { expect, test } from '@playwright/test';

const WIDEST_ARMENIAN_PAGES = [
  '/',
  '/usluga/remont-kondicionerov',
  '/usluga/ustanovka-kondicionerov',
  '/usluga/prodazha-kondicionerov',
  '/uslugi/uslugi-i-servis',
  '/uslugi/neispravnosti',
  '/kody-oshibok-kondicionerov',
  '/kak-vybrat-split-sistemu-dlya-kvartiry',
  '/nashi-raboty',
  '/kontakty',
  '/o-kompanii-centr-klimata',
  '/booking',
  '/quiz'
];

test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

for (const path of WIDEST_ARMENIAN_PAGES) {
  test(`${path} fits a 360 px screen in Armenian`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('the mobile bar opens the menu, services and contacts', async ({ page }) => {
  await page.goto('/en');
  const bar = page.getByRole('banner');

  await bar.getByRole('button', { name: 'Menu' }).tap();
  await expect(bar.getByRole('navigation', { name: 'Main menu' }).getByRole('link').first()).toBeVisible();

  await bar.getByRole('button', { name: 'Services' }).tap();
  await expect(bar.getByRole('navigation', { name: 'Services' }).getByRole('link', { name: 'Air conditioner repair' })).toBeVisible();
  await expect(bar.getByRole('navigation', { name: 'Main menu' })).toBeHidden();
});

test('the service menu lives in the mobile panel, not under the page', async ({ page }) => {
  await page.goto('/en/kontakty');
  await expect(page.getByRole('complementary').getByRole('link', { name: 'Air conditioner cleaning' })).toBeHidden();
});

test('the works gallery is one column wide', async ({ page }) => {
  await page.goto('/en/nashi-raboty');
  const pictures = page.getByRole('main').getByRole('button', { name: /Show picture/ });
  await expect(pictures.first()).toBeVisible();
  const lefts = await pictures.evaluateAll((buttons) => new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().left))).size);
  expect(lefts).toBe(1);
});

test('the floating button calls the company', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('link', { name: 'Call us' })).toHaveAttribute('href', /^tel:/);
});

test('the request popup fits the screen and scrolls to its button', async ({ page }) => {
  await page.goto('/en');
  const bar = page.getByRole('banner');
  await bar.getByRole('button', { name: 'Contact details' }).tap();
  await bar.getByRole('button', { name: /request/i }).tap();

  const popup = page.getByRole('dialog', { name: 'Online request' });
  const send = popup.getByRole('button', { name: 'Send', exact: true });
  await send.scrollIntoViewIfNeeded();
  await expect(send).toBeInViewport();
});
