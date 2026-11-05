import type { FieldDef } from '../src/contentSchemas/types';
import { makeEmptyDraft, normalizeContent, stableStringify, validateDraft } from '../src/contentSchemas/utils';
import { moveItem } from '../src/lib/order';
import { buildPageTree, descendantIds, localized, type Page } from '../src/lib/pages';
import { PUBLIC_TEXTS } from '../src/lib/publicTexts';
import { ApiError, errorText } from '../src/lib/request';

jest.mock('../src/api', () => ({ apiFetch: jest.fn() }));

const fields: FieldDef[] = [
  { key: 'heading', label: 'Heading', kind: 'string', multilingual: true },
  { key: 'website', label: 'Website', kind: 'url' },
  { key: 'collection', label: 'Collection', kind: 'select', options: ['brands', 'works'] },
  {
    key: 'items',
    label: 'Items',
    kind: 'list',
    fields: [
      { key: 'title', label: 'Title', kind: 'string', multilingual: true },
      { key: 'link', label: 'Link', kind: 'url' }
    ]
  }
];

const page = (id: string, parent_id: string | null, extra: Partial<Page> = {}) => ({ id, parent_id, slug: id, ...extra }) as Page;

describe('content helpers', () => {
  test('an empty draft has a key per language and an empty list', () => {
    expect(makeEmptyDraft(fields)).toEqual({
      heading_hy: null,
      heading_ru: null,
      heading_en: null,
      website: null,
      collection: null,
      items: []
    });
  });

  test('normalizing fills missing keys inside list items too', () => {
    const out = normalizeContent(fields, { items: [{ title_hy: 'Ա' }] });
    expect(out.items).toEqual([{ title_hy: 'Ա', title_ru: null, title_en: null, link: null }]);
  });

  test('a saved block missing keys does not look edited', () => {
    const a = normalizeContent(fields, { heading_hy: 'x' });
    const b = normalizeContent(fields, { heading_hy: 'x', items: [] });
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  test('valid content has no issues', () => {
    expect(validateDraft(fields, normalizeContent(fields, { website: 'https://a.am', collection: 'works' }))).toEqual([]);
  });

  test('reports a bad value inside a list item with its position', () => {
    const issues = validateDraft(fields, { items: [{ link: 'https://ok.am' }, { link: 'javascript:alert(1)' }] });
    expect(issues).toEqual([{ path: 'items[1].link', code: 'invalidUrl' }]);
  });

  test('reports unknown keys, wrong types and options outside the list', () => {
    const codes = validateDraft(fields, { stale: 'x', heading_hy: 5, collection: 'nope', items: 'not a list' }).map((issue) => issue.code);
    expect(codes.sort()).toEqual(['invalidOption', 'notList', 'notText', 'unknownKey']);
  });

  test('a link field takes a site path, but not a script', () => {
    const linkFields: FieldDef[] = [{ key: 'link_url', label: 'Link', kind: 'link' }];
    expect(validateDraft(linkFields, { link_url: '/usluga/remont' })).toEqual([]);
    expect(validateDraft(linkFields, { link_url: 'javascript:alert(1)' })).toEqual([{ path: 'link_url', code: 'invalidLink' }]);
    expect(validateDraft(linkFields, { link_url: '//evil.example' })).toEqual([{ path: 'link_url', code: 'invalidLink' }]);
  });

  test('a list set to null is rejected, because the server would refuse it', () => {
    expect(validateDraft(fields, { items: null })).toEqual([{ path: 'items', code: 'notList' }]);
  });
});

describe('page helpers', () => {
  test('the tree lists children under their parent with their depth', () => {
    const rows = buildPageTree([page('child', 'root'), page('other', null), page('root', null), page('leaf', 'child')]);
    expect(rows.map((row) => [row.id, row.depth])).toEqual([
      ['other', 0],
      ['root', 0],
      ['child', 1],
      ['leaf', 2]
    ]);
  });

  test('a page whose parent is gone still shows at the top level', () => {
    expect(buildPageTree([page('orphan', 'missing')]).map((row) => row.depth)).toEqual([0]);
  });

  test('finds every descendant, so a page cannot move under its own subpage', () => {
    const pages = [page('a', null), page('b', 'a'), page('c', 'b'), page('d', null)];
    expect([...descendantIds(pages, 'a')].sort()).toEqual(['b', 'c']);
  });

  test('prefers the requested language, then any language with a value', () => {
    expect(localized({ title_hy: 'Հ', title_ru: 'Р' }, 'title', 'ru')).toBe('Р');
    expect(localized({ title_hy: 'Հ', title_ru: '  ' }, 'title', 'ru')).toBe('Հ');
    expect(localized({}, 'title', 'ru')).toBe('');
  });
});

describe('moveItem', () => {
  test('swaps with the neighbour and leaves the input alone', () => {
    const input = ['a', 'b', 'c'];
    expect(moveItem(input, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(input).toEqual(['a', 'b', 'c']);
  });

  test('ignores a move past either end', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});

describe('errorText', () => {
  const t = ((key: string) => key) as any;

  test('uses a plain message per status, then the screen fallback', () => {
    expect(errorText(t, new ApiError('Invalid token', 401), 'fallback')).toBe('errors.session');
    expect(errorText(t, new ApiError('nope', 403), 'fallback')).toBe('errors.forbidden');
    expect(errorText(t, new ApiError('Bad response (413)', 413), 'fallback')).toBe('errors.tooLarge');
    expect(errorText(t, new ApiError('Internal Server Error', 500), 'fallback')).toBe('fallback');
  });

  test('lets a screen name its own message for a status', () => {
    expect(errorText(t, new ApiError('Already exists', 409), 'fallback', { 409: 'pages.addressTaken' })).toBe('pages.addressTaken');
  });

  test('a failed connection gets its own message', () => {
    expect(errorText(t, new TypeError('Failed to fetch'), 'fallback')).toBe('errors.network');
  });
});

describe('public texts', () => {
  test('every label of the public site is listed with its text in all languages', () => {
    const brand = PUBLIC_TEXTS.find((text) => text.key === 'nav.booking');
    expect(brand?.defaults.hy).toBeTruthy();
    expect(brand?.defaults.ru).toBeTruthy();
    expect(brand?.defaults.en).toBeTruthy();
    expect(PUBLIC_TEXTS.every((text) => /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/.test(text.key))).toBe(true);
  });
});
