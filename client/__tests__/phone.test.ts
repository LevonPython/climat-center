import { isValidArmenianPhone, sanitizePhoneInput } from '../lib/phone';

describe('isValidArmenianPhone', () => {
  describe('valid numbers', () => {
    test.each([
      ['+37499123456', 'plain international format'],
      ['+374 99 123 456', 'spaces between groups'],
      ['+374-99-123-456', 'dashes between groups'],
      ['+374(99)123456', 'parentheses around operator code'],
      ['37499123456', 'digits only, no plus'],
      ['+374 94 00-00-00', 'our contact number']
    ])('%s — %s', (phone) => {
      expect(isValidArmenianPhone(phone)).toBe(true);
    });
  });

  describe('invalid numbers', () => {
    test.each([
      ['', 'empty string'],
      ['+374', 'country code only'],
      ['+37499123', 'too short (7 digits after code)'],
      ['+7 (495) 182-83-84', 'Russian number'],
      ['+1 800 555 0100', 'US number'],
      ['not-a-number', 'non-numeric string'],
      ['+37499 12 345 678', 'too long (9 digits after code)'],
      ['0374 99 123 456', 'wrong leading digit']
    ])('%s — %s', (phone) => {
      expect(isValidArmenianPhone(phone)).toBe(false);
    });
  });
});

describe('sanitizePhoneInput', () => {
  test('keeps digits', () => {
    expect(sanitizePhoneInput('374991234')).toBe('374991234');
  });

  test('keeps + prefix', () => {
    expect(sanitizePhoneInput('+374991234')).toBe('+374991234');
  });

  test('keeps spaces, parentheses, and dashes', () => {
    expect(sanitizePhoneInput('+374 (99) 123-456')).toBe('+374 (99) 123-456');
  });

  test('strips letters', () => {
    expect(sanitizePhoneInput('+374abc99')).toBe('+37499');
  });

  test('strips punctuation characters that are not phone separators', () => {
    expect(sanitizePhoneInput('+374.99/123')).toBe('+37499123');
  });

  test('returns empty string unchanged', () => {
    expect(sanitizePhoneInput('')).toBe('');
  });
});
