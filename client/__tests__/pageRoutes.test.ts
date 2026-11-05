const mockApiFetch = jest.fn();
jest.mock('../lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiBaseUrl: () => 'https://api.example'
}));
jest.mock('next-i18next/serverSideTranslations', () => ({
  serverSideTranslations: jest.fn(async () => ({ _nextI18Next: { initialI18nStore: { hy: { common: {} } } } }))
}));
jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('next/router', () => ({ useRouter: () => ({ locale: 'hy', asPath: '/' }) }));
jest.mock('../components/PageView', () => ({ PageView: () => null }));

import { getStaticPaths, getStaticProps } from '../pages/[...slug]';
import { getStaticProps as getHomeProps } from '../pages/index';

const PAGE = { slug: 'usluga/remont', type: 'service', title: 'Ա', meta_title: null, meta_description: null, breadcrumbs: [], sections: [] };
const SITE_RESPONSE = { ok: true, settings: {}, nav: {}, services: {}, galleries: {} };

function routeApi(pageResponse: unknown) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/api/site/')) return SITE_RESPONSE;
    if (path.startsWith('/api/translations/')) return { ok: true, translations: {} };
    if (path.startsWith('/api/pages/')) return pageResponse;
    throw new Error(`Unexpected call: ${path}`);
  });
}

describe('content page route', () => {
  beforeEach(() => mockApiFetch.mockReset());

  test('generates pages on first view, so a build never needs the API', async () => {
    expect(await (getStaticPaths as () => Promise<unknown>)()).toEqual({ paths: [], fallback: 'blocking' });
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  test('loads a page by its full address, in the language asked for', async () => {
    routeApi({ ok: true, page: PAGE });
    const result = (await (getStaticProps as any)({ locale: 'ru', params: { slug: ['usluga', 'remont'] } })) as any;
    expect(mockApiFetch).toHaveBeenCalledWith('/api/pages/ru/usluga/remont');
    expect(result.props.page).toEqual(PAGE);
    expect(result.props.site).toEqual({ settings: {}, nav: {}, services: {}, galleries: {} });
    expect(result.revalidate).toBe(60);
  });

  test('a hidden or missing page is a 404, and is rechecked later', async () => {
    routeApi({ ok: false, error: { message: 'Not found', status: 404 } });
    const result = await (getStaticProps as any)({ locale: 'hy', params: { slug: ['nope'] } });
    expect(result).toEqual({ notFound: true, revalidate: 60 });
  });

  test('a page with no text in this language is a 404 rather than a blank page', async () => {
    routeApi({ ok: true, page: { ...PAGE, title: null } });
    const result = await (getStaticProps as any)({ locale: 'en', params: { slug: ['usluga', 'remont'] } });
    expect(result).toEqual({ notFound: true, revalidate: 60 });
  });

  test('an API failure throws, so the last good copy of the page stays up', async () => {
    routeApi({ ok: false, error: { message: 'Internal Server Error', status: 500 } });
    await expect((getStaticProps as any)({ locale: 'hy', params: { slug: ['usluga', 'remont'] } })).rejects.toThrow();
  });

  test('the home page has one address, so /home is a 404', async () => {
    routeApi({ ok: true, page: PAGE });
    const result = await (getStaticProps as any)({ locale: 'hy', params: { slug: ['home'] } });
    expect(result).toEqual({ notFound: true, revalidate: 60 });
  });
});

describe('home page route', () => {
  const originalPhase = process.env.NEXT_PHASE;
  beforeEach(() => mockApiFetch.mockReset());
  afterEach(() => {
    process.env.NEXT_PHASE = originalPhase;
  });

  test('a refresh during an API failure throws, keeping the last good page', async () => {
    delete process.env.NEXT_PHASE;
    mockApiFetch.mockRejectedValue(new TypeError('fetch failed'));
    await expect((getHomeProps as any)({ locale: 'hy' })).rejects.toThrow();
  });

  test('a build survives the API being down', async () => {
    process.env.NEXT_PHASE = 'phase-production-build';
    mockApiFetch.mockRejectedValue(new TypeError('fetch failed'));
    const result = (await (getHomeProps as any)({ locale: 'hy' })) as any;
    expect(result.props.page).toBeNull();
    expect(result.props.site).toBeNull();
  });

  test('loads the page stored as home', async () => {
    delete process.env.NEXT_PHASE;
    routeApi({ ok: true, page: { ...PAGE, slug: 'home', type: 'home' } });
    const result = (await (getHomeProps as any)({ locale: 'hy' })) as any;
    expect(mockApiFetch).toHaveBeenCalledWith('/api/pages/hy/home');
    expect(result.props.page.type).toBe('home');
  });
});
