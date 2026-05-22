import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  CONTACT_PHONE_WHATSAPP
} from '../lib/contactPhone';

describe('contactPhone constants', () => {
  test('CONTACT_EMAIL is valid email format', () => {
    expect(CONTACT_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
  test('CONTACT_PHONE_DISPLAY is formatted for display', () => {
    expect(CONTACT_PHONE_DISPLAY).toBe('+(374) 94 00-00-00');
  });

  test('CONTACT_PHONE_TEL starts with + and contains only digits after it', () => {
    expect(CONTACT_PHONE_TEL).toMatch(/^\+\d+$/);
  });

  test('CONTACT_PHONE_TEL matches display number digits', () => {
    const displayDigits = CONTACT_PHONE_DISPLAY.replace(/\D/g, '');
    const telDigits = CONTACT_PHONE_TEL.replace(/\D/g, '');
    expect(telDigits).toBe(displayDigits);
  });

  test('CONTACT_PHONE_WHATSAPP is digits only (no plus)', () => {
    expect(CONTACT_PHONE_WHATSAPP).toMatch(/^\d+$/);
  });

  test('CONTACT_PHONE_WHATSAPP digits match TEL digits', () => {
    const telDigits = CONTACT_PHONE_TEL.replace(/\D/g, '');
    expect(CONTACT_PHONE_WHATSAPP).toBe(telDigits);
  });
});
