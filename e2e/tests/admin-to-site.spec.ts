import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { ADMIN_PASSWORD, ADMIN_URL, API_URL, IS_LOCAL, apiToken, signIn } from './helpers';

const SLUG = 'o-kompanii-centr-klimata';

test.skip(!IS_LOCAL || !ADMIN_PASSWORD, 'Set E2E_ADMIN_PASSWORD and run against a local stack.');
// These tests change content every page shares, so they stay in one file and run one at a time.

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


// Changes that touch every page reach the rendered site within the 60-second refresh.
const SITE_REFRESH = { timeout: 90_000, intervals: [2_000, 5_000] };
const PICTURE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');


async function saving(page: Page, path: string, action: () => Promise<void>): Promise<void> {
  const response = page.waitForResponse((res) => res.request().method() !== 'GET' && res.url().includes(path));
  await action();
  expect((await response).ok()).toBe(true);
}

async function publicSite(request: APIRequestContext) {
  return (await (await request.get(`${API_URL}/api/site/hy`)).json()) as {
    nav: Record<string, { label: string; href: string }[]>;
    services: Record<string, { title: string; menu_title: string | null }[]>;
    galleries: Record<string, { id: string }[]>;
    settings: { contacts: { phone: string } };
  };
}

test.describe('creating, editing and deleting in the admin', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await signIn(page);
  });

  test('a page is created, filled, published, trimmed and deleted', async ({ page }) => {
    const id = Date.now();
    const [slug, title, text] = [`e2e-page-${id}`, `E2E page ${id}`, `E2E text ${id}`];
    const site = await page.context().newPage();
    const visit = async () => {
      const response = await site.goto(`/${slug}`);
      return response?.status() === 200 ? (await site.locator('main').innerText()) : `status ${response?.status()}`;
    };

    await page.goto(`${ADMIN_URL}/pages`);
    await page.getByRole('button', { name: 'New page' }).click();
    await page.getByLabel('Address').fill(slug);
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Create page' }).click();
    await page.waitForURL(/\/pages\/[0-9a-f-]{36}$/);

    await page.getByLabel('Type of the new section').selectOption({ label: 'Text' });
    await saving(page, '/sections', () => page.getByRole('button', { name: 'Add section' }).click());
    await page.getByRole('textbox', { name: 'Text' }).click();
    await page.keyboard.type(text);
    await saving(page, '/api/admin/sections/', () => page.getByRole('button', { name: 'Save', exact: true }).last().click());
    await page.getByLabel('Status').selectOption('published');
    await saving(page, '/api/admin/pages/', () => page.getByRole('button', { name: 'Save', exact: true }).first().click());

    await expect.poll(visit).toContain(text);
    await expect(site.getByRole('heading', { level: 1 })).toHaveText(title);

    await saving(page, '/api/admin/sections/', () => page.getByRole('button', { name: 'Hide: Text' }).click());
    await expect.poll(visit).not.toContain(text);
    await expect(site.getByRole('heading', { level: 1 })).toHaveText(title);

    await saving(page, '/api/admin/sections/', () => page.getByRole('button', { name: 'Delete: Text' }).click());
    await expect(page.getByText('This page has no sections yet.')).toBeVisible();

    await page.goto(`${ADMIN_URL}/pages`);
    await saving(page, '/api/admin/pages/', () => page.getByRole('button', { name: `Delete: ${title}` }).click());
    await expect.poll(visit).toBe('status 404');
  });

  test('a menu link is added, renamed, hidden and deleted', async ({ page, request }) => {
    const label = `E2E link ${Date.now()}`;
    const renamed = `${label} renamed`;
    const footer = async () => (await publicSite(request)).nav.footer.map((item) => item.label);

    await page.goto(`${ADMIN_URL}/navigation`);
    await page.getByRole('group', { name: 'Menu' }).getByRole('button', { name: 'Footer' }).click();
    await page.getByRole('button', { name: 'Add item' }).click();
    await page.getByLabel('Menu text').fill(label);
    await page.getByLabel('Link', { exact: true }).check();
    await page.getByLabel('Link address').fill('/booking');
    await saving(page, '/api/admin/navigation', () => page.getByRole('button', { name: 'Save', exact: true }).click());
    expect(await footer()).toContain(label);

    const site = await page.context().newPage();
    await expect
      .poll(async () => {
        await site.goto('/');
        return site.getByRole('contentinfo').getByRole('link', { name: label }).count();
      }, SITE_REFRESH)
      .toBe(1);

    await page.getByRole('button', { name: `Edit: ${label}` }).click();
    await page.getByLabel('Menu text').fill(renamed);
    await saving(page, '/api/admin/navigation/', () => page.getByRole('button', { name: 'Save', exact: true }).click());
    expect(await footer()).toContain(renamed);

    await saving(page, '/api/admin/navigation/', () => page.getByRole('button', { name: `Hide: ${renamed}` }).click());
    expect(await footer()).not.toContain(renamed);

    await saving(page, '/api/admin/navigation/', () => page.getByRole('button', { name: `Delete: ${renamed}` }).click());
    await expect(page.getByText(renamed)).toHaveCount(0);
  });

  test('a service is added, edited, hidden and deleted', async ({ page, request }) => {
    const title = `E2E service ${Date.now()}`;
    const menuTitle = `${title} menu`;
    const listed = async () => (await publicSite(request)).services.service?.map((item) => item.menu_title) || [];
    const placement = page.locator('details').filter({ hasText: 'Where it appears on the site' });
    const setMenuText = async (text: string) => {
      if (!(await placement.evaluate((element) => (element as HTMLDetailsElement).open))) await placement.locator('summary').click();
      await page.getByLabel('Text in the side menu').fill(text);
    };

    await page.goto(`${ADMIN_URL}/services`);
    await page.getByLabel('Title', { exact: true }).fill(title);
    await setMenuText(menuTitle);
    await saving(page, '/api/services', () => page.getByRole('button', { name: 'Save', exact: true }).click());
    expect(await listed()).toContain(menuTitle);

    const row = page.getByRole('row').filter({ hasText: title });
    await row.getByRole('button', { name: 'Edit' }).click();
    await setMenuText(`${menuTitle} 2`);
    await saving(page, '/api/services/', () => page.getByRole('button', { name: 'Save', exact: true }).click());
    expect(await listed()).toContain(`${menuTitle} 2`);

    await saving(page, '/api/services/', () => row.getByRole('button', { name: 'Hide' }).click());
    expect(await listed()).not.toContain(`${menuTitle} 2`);

    await saving(page, '/permanent', () => row.getByRole('button', { name: 'Delete' }).click());
    await expect(row).toHaveCount(0);
  });

  test('a file is uploaded, described, replaced, shown in a gallery and deleted', async ({ page, request }) => {
    const name = `e2e-${Date.now()}.png`;
    const works = async () => (await publicSite(request)).galleries.works?.length || 0;
    const before = await works();

    await page.goto(`${ADMIN_URL}/media`);
    await saving(page, '/api/admin/media', () => page.locator('input[type="file"]').first().setInputFiles({ name, mimeType: 'image/png', buffer: PICTURE }));
    await page.getByRole('button', { name, exact: true }).click();
    await page.getByLabel('Picture description').fill('E2E picture');
    await saving(page, '/api/admin/media/', () => page.getByRole('button', { name: 'Save', exact: true }).click());
    await saving(page, '/file', () => page.locator('input[type="file"]').nth(1).setInputFiles({ name, mimeType: 'image/png', buffer: PICTURE }));

    await page.goto(`${ADMIN_URL}/galleries`);
    await page.getByRole('group', { name: 'Gallery' }).getByRole('button', { name: 'Our works' }).click();
    await page.getByRole('button', { name: 'Add pictures' }).click();
    await saving(page, '/api/admin/galleries', () => page.getByRole('dialog').getByRole('button', { name, exact: true }).click());
    await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
    expect(await works()).toBe(before + 1);

    await saving(page, '/api/admin/galleries/', () => page.getByRole('button', { name: /^Hide: / }).last().click());
    expect(await works()).toBe(before);
    await saving(page, '/api/admin/galleries/', () => page.getByRole('button', { name: /^Remove from gallery: / }).last().click());

    await page.goto(`${ADMIN_URL}/media`);
    await page.getByRole('button', { name, exact: true }).click();
    await saving(page, '/api/admin/media/', () => page.getByRole('button', { name: 'Delete', exact: true }).click());
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  });

  test('a contact detail changed in the settings reaches the site', async ({ page, request }) => {
    const original = (await publicSite(request)).settings.contacts.phone;
    const changed = '+374 99 000000';
    const setPhone = async (phone: string) => {
      await page.goto(`${ADMIN_URL}/settings`);
      await page.getByRole('button', { name: 'Contacts', exact: true }).click();
      await page.getByLabel('Phone', { exact: true }).fill(phone);
      await saving(page, '/api/content', () => page.getByRole('button', { name: 'Save', exact: true }).click());
    };

    try {
      await setPhone(changed);
      expect((await publicSite(request)).settings.contacts.phone).toBe(changed);
    } finally {
      await setPhone(original);
    }
  });

  test('editing an imported article keeps its picture links and tooltips', async ({ page, request }) => {
    const headers = { Authorization: `Bearer ${await apiToken(request)}` };
    const { pages } = await (await request.get(`${API_URL}/api/admin/pages`, { headers })).json();
    const target = pages.find((item: { slug: string }) => item.slug === 'kak-ustanovit-kondicioner-svoimi-rukami-poshagovaya-instrukciya');
    const { page: full } = await (await request.get(`${API_URL}/api/admin/pages/${target.id}`, { headers })).json();
    const index = full.sections.findIndex((item: { content_json: { body_ru?: string } }) => /<a [^>]*title=[^>]*><img/.test(item.content_json.body_ru || ''));
    const section = full.sections[index];
    const count = (html: string, pattern: RegExp) => (html.match(pattern) || []).length;
    const original = section.content_json.body_ru as string;

    try {
      await page.goto(`${ADMIN_URL}/pages/${target.id}`);
      await page.locator('main button[aria-expanded]').nth(index).click();
      await page.getByRole('button', { name: 'Русский', exact: true }).last().click();
      await page.locator('.ProseMirror[lang="ru"]').click();
      await page.keyboard.press('Control+End');
      await page.keyboard.type(' E2E');
      await saving(page, '/api/admin/sections/', () => page.getByRole('button', { name: 'Save', exact: true }).last().click());

      const saved = (await (await request.get(`${API_URL}/api/admin/pages/${target.id}`, { headers })).json()).page.sections[index].content_json.body_ru as string;
      expect(saved).toContain('E2E');
      expect(count(saved, /<a [^>]*><img/g)).toBe(count(original, /<a [^>]*><img/g));
      expect(count(saved, /<a [^>]*title=/g)).toBe(count(original, /<a [^>]*title=/g));
      expect(count(saved, /target="_blank"|nofollow/g)).toBe(0);
    } finally {
      await request.put(`${API_URL}/api/admin/sections/${section.id}`, { headers, data: { content_json: section.content_json } });
    }
  });
});
