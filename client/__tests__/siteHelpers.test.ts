import { parseEmphasis } from '../lib/emphasis';
import { isEmbeddableVideo, isImageLink, prepareRichText } from '../lib/richText';
import { buildRobots, buildSitemap, localizedUrl } from '../lib/seo';
import { applyTextOverrides } from '../lib/site';

jest.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: jest.fn() }));
jest.mock('../lib/api', () => ({ apiFetch: jest.fn(), apiBaseUrl: () => 'https://api.example' }));

describe('parseEmphasis', () => {
  test('splits out the highlighted part of a heading', () => {
    expect(parseEmphasis('Наши **преимущества**')).toEqual([
      { text: 'Наши ', emphasized: false },
      { text: 'преимущества', emphasized: true }
    ]);
  });

  test('a heading without marks stays whole', () => {
    expect(parseEmphasis('Ремонт')).toEqual([{ text: 'Ремонт', emphasized: false }]);
  });
});

describe('prepareRichText', () => {
  test('keeps site links in the language being read', () => {
    expect(prepareRichText('<a href="/usluga/remont">x</a>', 'ru')).toBe('<a href="/ru/usluga/remont">x</a>');
    expect(prepareRichText('<a href="/">x</a>', 'en')).toBe('<a href="/en">x</a>');
  });

  test('Armenian is the default language, so its links have no prefix', () => {
    expect(prepareRichText('<a href="/usluga/remont">x</a>', 'hy')).toBe('<a href="/usluga/remont">x</a>');
  });

  test('leaves outside links alone', () => {
    const html = '<a href="https://example.com/a">x</a><a href="mailto:a@b.am">y</a><a href="tel:+374">z</a>';
    expect(prepareRichText(html, 'ru')).toBe(html);
  });

  test('points local uploads at the API, in every language', () => {
    expect(prepareRichText('<img src="/uploads/a.png" />', 'hy')).toBe('<img src="https://api.example/uploads/a.png" />');
    expect(prepareRichText('<a href="/uploads/a.png"><img src="/uploads/a.png" /></a>', 'ru')).toBe('<a href="https://api.example/uploads/a.png"><img src="https://api.example/uploads/a.png" /></a>');
  });

  test('stored files on Vercel Blob are left as they are', () => {
    const html = '<img src="https://x.public.blob.vercel-storage.com/a.png" />';
    expect(prepareRichText(html, 'ru')).toBe(html);
  });
});

describe('isImageLink', () => {
  test.each([
    ['/uploads/a.jpg', true],
    ['https://blob/a.WEBP', true],
    ['/usluga/remont', false],
    [null, false]
  ])('%s -> %s', (href, expected) => {
    expect(isImageLink(href)).toBe(expected);
  });
});

describe('isEmbeddableVideo', () => {
  test.each([
    ['https://www.youtube.com/embed/abc', true],
    ['https://rutube.ru/play/embed/abc', true],
    ['https://vk.com/video_ext.php?oid=1', true],
    ['https://evil.example/youtube.com/embed/abc', false],
    ['http://www.youtube.com/embed/abc', false],
    ['javascript:alert(1)', false],
    [null, false]
  ])('%s -> %s', (url, expected) => {
    expect(isEmbeddableVideo(url)).toBe(expected);
  });
});

describe('search engine files', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SITE_URL;
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://site.example/';
  });
  afterAll(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalUrl;
  });

  test('Armenian has no prefix and the others do', () => {
    expect(localizedUrl('/kontakty', 'hy')).toBe('https://site.example/kontakty');
    expect(localizedUrl('/kontakty', 'ru')).toBe('https://site.example/ru/kontakty');
    expect(localizedUrl('/', 'hy')).toBe('https://site.example');
    expect(localizedUrl('/', 'en')).toBe('https://site.example/en');
  });

  test('the sitemap lists each page in all three languages, linked to each other', () => {
    const xml = buildSitemap(['/kontakty']);
    expect(xml.match(/<url>/g)).toHaveLength(3);
    expect(xml).toContain('<loc>https://site.example/ru/kontakty</loc>');
    expect(xml.match(/hreflang="hy"/g)).toHaveLength(3);
  });

  test('robots points at the sitemap and keeps crawlers out of the API', () => {
    expect(buildRobots()).toContain('Sitemap: https://site.example/sitemap.xml');
    expect(buildRobots()).toContain('Disallow: /api/');
  });
});

describe('applyTextOverrides', () => {
  const props = () => ({
    _nextI18Next: {
      initialI18nStore: { hy: { common: { nav: { quiz: 'Հարցում', booking: 'Գրանցում' }, brand: 'Կենտրոն' } } },
      initialLocale: 'hy',
      ns: ['common'],
      userConfig: null
    }
  });

  test('admin text wins, and the rest stays', () => {
    const out = applyTextOverrides(props() as never, 'hy', { 'nav.quiz': 'Արագ հարցում', brand: 'Նոր' });
    const common = out._nextI18Next?.initialI18nStore.hy.common as Record<string, any>;
    expect(common.nav).toEqual({ quiz: 'Արագ հարցում', booking: 'Գրանցում' });
    expect(common.brand).toBe('Նոր');
  });

  test('does not change the catalogue it was given', () => {
    const input = props();
    applyTextOverrides(input as never, 'hy', { 'nav.quiz': 'Նոր' });
    expect(input._nextI18Next.initialI18nStore.hy.common.nav.quiz).toBe('Հարցում');
  });

  test('a key the catalogue never had still works', () => {
    const out = applyTextOverrides(props() as never, 'hy', { 'layout.fresh.label': 'Նոր' });
    expect((out._nextI18Next?.initialI18nStore.hy.common as Record<string, any>).layout.fresh.label).toBe('Նոր');
  });
});
