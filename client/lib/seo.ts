const DEFAULT_LOCALE = 'hy';
export const LOCALES = ['hy', 'ru', 'en'] as const;

export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : 'http://localhost:3000';
}

export function localizedUrl(path: string, locale: string): string {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const clean = path === '/' ? '' : path;
  return `${siteOrigin()}${prefix}${clean}`;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildSitemap(paths: string[]): string {
  const entries = paths.flatMap((path) =>
    LOCALES.map((locale) => {
      const alternates = LOCALES.map(
        (other) => `<xhtml:link rel="alternate" hreflang="${other}" href="${escapeXml(localizedUrl(path, other))}"/>`
      ).join('');
      return `<url><loc>${escapeXml(localizedUrl(path, locale))}</loc>${alternates}</url>`;
    })
  );
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>`;
}

export function buildRobots(): string {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteOrigin()}/sitemap.xml\n`;
}
