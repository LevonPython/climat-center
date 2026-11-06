import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_URL = process.env.E2E_API_URL || 'http://localhost:5000';
export const ADMIN_URL = process.env.E2E_ADMIN_URL || 'http://localhost:5173';
export const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

// Tests that send requests or edit content write to the database, so they never run against a deployed site.
export const IS_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE_URL);

export const LANGUAGES = ['hy', 'ru', 'en'] as const;

export const pathFor = (lang: string, slug: string): string => {
  const prefix = lang === 'hy' ? '' : `/${lang}`;
  return slug === 'home' ? prefix || '/' : `${prefix}/${slug}`;
};

export async function apiToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API_URL}/api/auth/login`, { data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
  expect(response.ok()).toBe(true);
  return (await response.json()).token;
}

export async function signIn(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('admin-locale', 'en'));
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel('Username').fill(ADMIN_USERNAME);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(`${ADMIN_URL}/`);
}
