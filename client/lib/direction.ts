// Arabic is written right to left; every other locale of the site left to right.
export function textDirection(locale: string | undefined): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

// The page's direction as the document renders it, for code that moves things on screen.
export function isRightToLeft(node: Element | null = typeof document === 'undefined' ? null : document.documentElement): boolean {
  return node?.closest('[dir]')?.getAttribute('dir') === 'rtl';
}
