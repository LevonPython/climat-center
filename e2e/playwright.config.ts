import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // A dev server compiles pages on first request, which is slow when tests run side by side.
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000'
  }
});
