/** Strip everything except digits, +, spaces, parentheses, and dashes. */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d+\s()-]/g, '');
}

/** Armenian numbers: country code 374 followed by 8 digits. */
export function isValidArmenianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return /^374\d{8}$/.test(digits);
}
