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
