import { assetUrl } from './assets';

const DEFAULT_LOCALE = 'hy';
const FILE_PATH = /^\/(uploads|sites)\//;
const IMAGE_FILE = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;

// The server sanitizes rich text on save. Here it only needs links to stay in the visitor's language.
export function prepareRichText(html: string, locale: string): string {
  return html
    .replace(/\s(src|href)="(\/uploads\/[^"]*)"/g, (_all, attr: string, url: string) => ` ${attr}="${assetUrl(url)}"`)
    .replace(/\shref="(\/[^"]*)"/g, (all, url: string) => {
      if (locale === DEFAULT_LOCALE || FILE_PATH.test(url) || url.startsWith('//')) return all;
      return ` href="/${locale}${url === '/' ? '' : url}"`;
    });
}

export function isImageLink(href: string | null): boolean {
  return !!href && IMAGE_FILE.test(href);
}

const VIDEO_HOSTS = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|rutube\.ru|vk\.com)\//;

// Only known video sites may be embedded in a frame.
export function isEmbeddableVideo(url: string | null | undefined): boolean {
  return !!url && VIDEO_HOSTS.test(url);
}
