const { sanitizeContent, sanitizeRichText } = require('../src/services/contentSanitizer');
const { resolveLangContent } = require('../src/services/localization');
const { getBlockType } = require('../src/contentSchemas/blockTypes');

describe('resolveLangContent', () => {
  test('maps the requested language and drops the others', () => {
    expect(resolveLangContent({ title_hy: 'Ա', title_ru: 'Б', phone: '1' }, 'hy')).toEqual({ title: 'Ա', phone: '1' });
  });

  test('resolves inside lists', () => {
    const content = { items: [{ title_en: 'One', title_hy: 'Մեկ', image_url: 'a.png' }] };
    expect(resolveLangContent(content, 'en')).toEqual({ items: [{ title: 'One', image_url: 'a.png' }] });
  });

  test('has no fallback between languages', () => {
    expect(resolveLangContent({ title_ru: 'Б' }, 'hy')).toEqual({});
  });
});

describe('sanitizeRichText', () => {
  test.each([
    ['<p>ok</p><script>alert(1)</script>', '<p>ok</p>'],
    ['<img src="x.png" onerror="alert(1)">', '<img src="x.png" />'],
    ['<a href="javascript:alert(1)">x</a>', '<a>x</a>'],
    ['<p style="color:red">x</p>', '<p>x</p>'],
    ['<iframe src="https://evil.example"></iframe>', '']
  ])('removes the unsafe part of %s', (input, expected) => {
    expect(sanitizeRichText(input)).toBe(expected);
  });

  test('keeps normal formatting, tables and links', () => {
    const html = '<h2>T</h2><ul><li><strong>a</strong></li></ul><table><tbody><tr><td>1</td></tr></tbody></table><a href="https://x.example">x</a>';
    expect(sanitizeRichText(html)).toBe(html);
  });
});

describe('sanitizeContent', () => {
  test('cleans rich text in every language and inside lists, and leaves plain fields alone', () => {
    const dirty = '<p>a</p><script>x</script>';
    const content = {
      heading_hy: '<b>kept as typed</b>',
      items: [{ question_hy: '<b>q</b>', answer_hy: dirty, answer_ru: dirty }]
    };
    expect(sanitizeContent(getBlockType('faq').fields, content)).toEqual({
      heading_hy: '<b>kept as typed</b>',
      items: [{ question_hy: '<b>q</b>', answer_hy: '<p>a</p>', answer_ru: '<p>a</p>' }]
    });
  });
});
