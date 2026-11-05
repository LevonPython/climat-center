import { telHref } from '../lib/contactPhone';

describe('telHref', () => {
  test.each([
    ['+(374) 94 00-00-00', 'tel:+37494000000'],
    ['+374 10 123456', 'tel:+37410123456'],
    ['094 00 00 00', 'tel:094000000']
  ])('turns %s into a phone link', (phone, expected) => {
    expect(telHref(phone)).toBe(expected);
  });
});
