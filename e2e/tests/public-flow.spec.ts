import { test, expect } from '@playwright/test';

test('public flow: home -> services -> booking page opens', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /услуги/i })).toBeVisible();

  await page.getByRole('link', { name: /услуги/i }).click();
  await expect(page.getByRole('heading', { name: /услуги/i })).toBeVisible();

  await page.getByRole('link', { name: /записаться/i }).first().click();
  await expect(page.getByRole('heading', { name: /оставьте заявку/i })).toBeVisible();
});

