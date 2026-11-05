// Phone numbers are typed by hand in the admin, so spaces and brackets are expected.
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}
