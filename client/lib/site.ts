import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { apiFetch } from './api';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextI18nextConfig = require('../next-i18next.config');

export type NavItem = { id: string; label: string | null; href: string };

export type SiteService = {
  id: string;
  category: 'service' | 'fault';
  title: string | null;
  menu_title: string | null;
  pill_title: string | null;
  show_in_menu: boolean;
  show_in_pills: boolean;
  href: string | null;
};

export type GalleryItem = { id: string; url: string; title: string | null; alt: string | null; link_url: string | null };

export type SiteSettings = {
  contacts?: { phone?: string | null; email?: string | null; hours?: string | null; address?: string | null };
  social?: { whatsapp_url?: string | null; telegram_url?: string | null; facebook_url?: string | null; instagram_url?: string | null };
  branding?: { site_name?: string | null; tagline?: string | null; logo_url?: string | null; hero_image_url?: string | null };
  header?: { hours_text?: string | null; arrival_text?: string | null; free_visit_text?: string | null; cta_label?: string | null };
  footer?: { copyright?: string | null; disclaimer?: string | null };
};

export type SiteData = {
  settings: SiteSettings;
  nav: Partial<Record<'topbar' | 'header' | 'footer' | 'mobile' | 'cities', NavItem[]>>;
  services: Partial<Record<'service' | 'fault', SiteService[]>>;
  galleries: Partial<Record<'brands' | 'certificates' | 'works', GalleryItem[]>>;
};

export type PageSection = { id: string; block_type: string; content: Record<string, any> };

export type PublicPage = {
  slug: string;
  type: string;
  title: string | null;
  meta_title: string | null;
  meta_description: string | null;
  breadcrumbs: { href: string; title: string | null }[];
  sections: PageSection[];
};

export const ISR_SECONDS = 60;

type I18nProps = Awaited<ReturnType<typeof serverSideTranslations>>;

function setDeep(target: Record<string, any>, key: string, value: string): void {
  const parts = key.split('.');
  let node = target;
  for (const part of parts.slice(0, -1)) {
    node[part] = typeof node[part] === 'object' && node[part] !== null ? { ...node[part] } : {};
    node = node[part];
  }
  node[parts[parts.length - 1]] = value;
}

// Text changed in the admin wins over the bundled catalogue, which stays as the fallback.
export function applyTextOverrides(props: I18nProps, lang: string, overrides: Record<string, string>): I18nProps {
  const store = props._nextI18Next?.initialI18nStore;
  if (!store?.[lang]?.common) return props;
  const common = { ...store[lang].common };
  for (const [key, value] of Object.entries(overrides)) setDeep(common, key, value);
  return {
    ...props,
    _nextI18Next: { ...props._nextI18Next!, initialI18nStore: { ...store, [lang]: { ...store[lang], common } } }
  };
}

export async function loadSite(lang: string): Promise<SiteData> {
  const resp = await apiFetch<SiteData>(`/api/site/${lang}`);
  if (!resp.ok) throw new Error(`Site data failed: ${resp.error?.message}`);
  const { settings, nav, services, galleries } = resp;
  return { settings, nav, services, galleries };
}

async function loadTextOverrides(lang: string): Promise<Record<string, string>> {
  const resp = await apiFetch<{ translations: Record<string, string> }>(`/api/translations/${lang}`);
  return resp.ok ? resp.translations : {};
}

// Everything every page needs. Throws when the API fails, so a regenerating page keeps its last good copy.
export async function loadCommonProps(lang: string) {
  const [site, overrides, i18n] = await Promise.all([
    loadSite(lang),
    loadTextOverrides(lang),
    serverSideTranslations(lang, ['common'], nextI18nextConfig)
  ]);
  return { site, ...applyTextOverrides(i18n, lang, overrides) };
}

// For pages that must still render without the API, such as the booking form.
export async function loadCommonPropsSafely(lang: string) {
  try {
    return await loadCommonProps(lang);
  } catch {
    return { site: null, ...(await serverSideTranslations(lang, ['common'], nextI18nextConfig)) };
  }
}

export async function loadPage(slug: string, lang: string): Promise<PublicPage | null> {
  const resp = await apiFetch<{ page: PublicPage }>(`/api/pages/${lang}/${slug}`);
  if (resp.ok) return resp.page;
  if (resp.error?.status === 404) return null;
  throw new Error(`Page failed: ${resp.error?.message}`);
}

export async function loadPublishedSlugs(): Promise<string[]> {
  const resp = await apiFetch<{ pages: { slug: string }[] }>('/api/pages/slugs');
  if (!resp.ok) throw new Error(`Slugs failed: ${resp.error?.message}`);
  return resp.pages.map((page) => page.slug);
}

export function isProductionBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}
