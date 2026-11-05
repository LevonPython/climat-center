import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { ADMIN_PASSWORD, ADMIN_URL, ADMIN_USERNAME, API_URL, IS_LOCAL } from './helpers';

const SLUG = 'o-kompanii-centr-klimata';

test.skip(!IS_LOCAL || !ADMIN_PASSWORD, 'Set E2E_ADMIN_PASSWORD and run against a local stack.');

async function apiToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API_URL}/api/auth/login`, { data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
  expect(response.ok()).toBe(true);
  return (await response.json()).token;
}

async function signIn(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('admin-locale', 'en'));
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel('Username').fill(ADMIN_USERNAME);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(`${ADMIN_URL}/`);
}

test('a title changed in the admin shows on the public page', async ({ page, request }) => {
  const token = await apiToken(request);
  const list = await request.get(`${API_URL}/api/admin/pages`, { headers: { Authorization: `Bearer ${token}` } });
  const { pages } = (await list.json()) as { pages: { id: string; slug: string; title_ru: string }[] };
  const target = pages.find((item) => item.slug === SLUG);
  if (!target) throw new Error(`Page ${SLUG} is not imported`);

  const editTitle = async (title: string) => {
    await page.goto(`${ADMIN_URL}/pages/${target.id}`);
    await page.getByRole('button', { name: 'Русский', exact: true }).first().click();
    await page.getByLabel('Title', { exact: true }).fill(title);
    const saved = page.waitForResponse((res) => res.request().method() !== 'GET' && res.url().includes('/api/admin/pages'));
    await page.getByRole('button', { name: 'Save', exact: true }).first().click();
    expect((await saved).ok()).toBe(true);
  };

  await signIn(page);
  const changed = `E2E ${Date.now()}`;
  try {
    await editTitle(changed);
    await page.goto(`/ru/${SLUG}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(changed);
  } finally {
    await editTitle(target.title_ru);
  }
});

test('interface text changed in the admin shows on the public page', async ({ page, request }) => {
  const headers = { Authorization: `Bearer ${await apiToken(request)}` };
  const changed = `E2E ${Date.now()}`;
  const url = `${API_URL}/api/admin/translations/layout.faults`;
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  expect((await request.put(url, { headers, data: { value_en: changed } })).ok()).toBe(true);
  try {
    await page.goto('/en/kontakty');
    await expect(page.getByRole('complementary').getByRole('heading', { name: changed })).toBeVisible();
    await page.getByRole('complementary').getByRole('link', { name: 'Bad smell?' }).click();
    await expect(page).toHaveURL(/nepriyatnyy-zapah/);
    await expect(page.getByRole('complementary').getByRole('heading', { name: changed })).toBeVisible();
    expect(pageErrors).toEqual([]);
  } finally {
    await request.delete(url, { headers });
  }
});

test('a list keeps its two columns when its text is edited', async ({ page, request }) => {
  const headers = { Authorization: `Bearer ${await apiToken(request)}` };
  const { pages } = (await (await request.get(`${API_URL}/api/admin/pages`, { headers })).json()) as { pages: { id: string; slug: string }[] };
  const target = pages.find((item) => item.slug === 'usluga/remont-kondicionerov');
  if (!target) throw new Error('The repair page is not imported');
  const detail = (await (await request.get(`${API_URL}/api/admin/pages/${target.id}`, { headers })).json()) as { page: { sections: { id: string; content_json: Record<string, string> }[] } };
  const section = detail.page.sections.find((item) => item.content_json.body_en?.includes('two-columns'));
  if (!section) throw new Error('The two-column list is not imported');

  await signIn(page);
  try {
    await page.goto(`${ADMIN_URL}/pages/${target.id}`);
    await page.getByRole('button', { name: `Edit: ${section.content_json.heading_en}` }).click();
    await page.getByRole('button', { name: 'English', exact: true }).last().click();
    const text = page.getByRole('textbox', { name: 'Text', exact: true });
    await text.click();
    await text.press('ControlOrMeta+End');
    await text.pressSequentially(' E2E');

    const saved = page.waitForResponse((res) => res.request().method() === 'PUT' && res.url().includes(`/api/admin/sections/${section.id}`));
    await page.getByRole('button', { name: 'Save', exact: true }).last().click();
    const response = await saved;
    expect(response.ok()).toBe(true);
    const body = ((await response.json()) as { section: { content_json: { body_en: string } } }).section.content_json.body_en;
    expect(body).toContain('E2E');
    expect(body).toContain('<ul class="two-columns">');
  } finally {
    await request.put(`${API_URL}/api/admin/sections/${section.id}`, { headers, data: { content_json: section.content_json } });
  }
});

test('a request from the popup reaches the admin with its page and kinds of work', async ({ page, request }) => {
  const name = `E2E popup ${Date.now()}`;

  await page.goto('/en/usluga/remont-kondicionerov');
  await page.getByRole('banner').getByRole('button', { name: /request/i }).click();
  const popup = page.getByRole('dialog', { name: 'Online request' });
  await popup.getByLabel('Name').fill(name);
  await popup.getByLabel('Phone').fill('+37491000000');
  await popup.getByLabel('Repair').check();
  await popup.getByLabel('Cleaning').check();
  await popup.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(popup.getByRole('status')).toContainText('Request sent');

  const token = await apiToken(request);
  const list = await request.get(`${API_URL}/api/bookings`, { headers: { Authorization: `Bearer ${token}` } });
  const { bookings } = (await list.json()) as { bookings: { user_name: string; work_types: string[]; source_page: string }[] };
  const booking = bookings.find((item) => item.user_name === name);

  expect(booking?.work_types).toEqual(['repair', 'cleaning']);
  expect(booking?.source_page).toContain('/usluga/remont-kondicionerov');
});
