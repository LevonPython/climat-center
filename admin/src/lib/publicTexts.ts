import ar from '../../../client/public/locales/ar/common.json';
import en from '../../../client/public/locales/en/common.json';
import hy from '../../../client/public/locales/hy/common.json';
import ru from '../../../client/public/locales/ru/common.json';
import { LANGS, type Lang } from '../contentSchemas/types';

export type PublicText = { key: string; defaults: Record<Lang, string> };

function flatten(catalogue: object, prefix = ''): [string, string][] {
  return Object.entries(catalogue).flatMap(([key, value]): [string, string][] =>
    value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, String(value)]]
  );
}

const CATALOGUES: Record<Lang, Map<string, string>> = {
  hy: new Map(flatten(hy)),
  ru: new Map(flatten(ru)),
  en: new Map(flatten(en)),
  ar: new Map(flatten(ar))
};

// The public site's own catalogue is the list of its labels, so this screen can't drift from it.
export const PUBLIC_TEXTS: PublicText[] = [...new Set(LANGS.flatMap((lang) => [...CATALOGUES[lang].keys()]))].sort().map((key) => ({
  key,
  defaults: Object.fromEntries(LANGS.map((lang) => [lang, CATALOGUES[lang].get(key) || ''])) as Record<Lang, string>
}));
