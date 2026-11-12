import { useQuery } from '@tanstack/react-query';
import { LANGS, type Lang, type Localized } from '../contentSchemas/types';
import { request } from './request';

export const PAGE_TYPES = ['home', 'service', 'fault', 'listing', 'article', 'city', 'gallery', 'static'] as const;
export type PageType = (typeof PAGE_TYPES)[number];
export type PageStatus = 'published' | 'hidden';

export type Page = {
  id: string;
  slug: string;
  type: PageType;
  parent_id: string | null;
  status: PageStatus;
  sort_order: number;
} & Localized<'title', string | null> &
  Localized<'meta_title', string | null> &
  Localized<'meta_description', string | null> &
  Localized<'needs_review', boolean>;

export type PageRow = Page & { depth: number };

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/;
export const HOME_SLUG = 'home';

export function usePages(enabled = true) {
  return useQuery({
    queryKey: ['pages'],
    enabled,
    queryFn: async () => (await request<{ pages: Page[] }>('/api/admin/pages')).pages
  });
}

export function buildPageTree(pages: Page[]): PageRow[] {
  const known = new Set(pages.map((page) => page.id));
  const childrenOf = (parentId: string | null) =>
    pages.filter((page) => (page.parent_id && known.has(page.parent_id) ? page.parent_id : null) === parentId);
  const seen = new Set<string>();

  function walk(parentId: string | null, depth: number): PageRow[] {
    return childrenOf(parentId).flatMap((page) => {
      if (seen.has(page.id)) return [];
      seen.add(page.id);
      return [{ ...page, depth }, ...walk(page.id, depth + 1)];
    });
  }

  return walk(null, 0);
}

export function descendantIds(pages: Page[], id: string): Set<string> {
  const found = new Set<string>();
  function collect(parentId: string) {
    for (const page of pages) {
      if (page.parent_id === parentId && !found.has(page.id)) {
        found.add(page.id);
        collect(page.id);
      }
    }
  }
  collect(id);
  return found;
}

// Prefers the requested language, then whichever language has a value.
export function localized(record: object, base: string, lang: string): string {
  const values = record as Record<string, unknown>;
  const order = [lang, ...LANGS.filter((candidate: Lang) => candidate !== lang)];
  for (const candidate of order) {
    const value = values[`${base}_${candidate}`];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}
