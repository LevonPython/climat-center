import en from '../../../client/public/locales/en/common.json';
import hy from '../../../client/public/locales/hy/common.json';
import ru from '../../../client/public/locales/ru/common.json';
import type { Lang } from '../contentSchemas/types';

export type PublicText = { key: string; defaults: Record<Lang, string> };

function flatten(catalogue: object, prefix = ''): [string, string][] {
  return Object.entries(catalogue).flatMap(([key, value]): [string, string][] =>
    value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, String(value)]]
  );
}

const HY = new Map(flatten(hy));
const RU = new Map(flatten(ru));
const EN = new Map(flatten(en));

// The public site's own catalogue is the list of its labels, so this screen can't drift from it.
export const PUBLIC_TEXTS: PublicText[] = [...new Set([...HY.keys(), ...RU.keys(), ...EN.keys()])].sort().map((key) => ({
  key,
  defaults: { hy: HY.get(key) || '', ru: RU.get(key) || '', en: EN.get(key) || '' }
}));
