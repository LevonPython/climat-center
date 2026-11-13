export type Lang = 'hy' | 'ru' | 'en' | 'ar';
export const LANGS: Lang[] = ['hy', 'ru', 'en', 'ar'];
export const LANGUAGE_NAMES: Record<Lang, string> = { hy: 'Հայերեն', ru: 'Русский', en: 'English', ar: 'العربية' };

export type Localized<Base extends string, Value> = Record<`${Base}_${Lang}`, Value>;

export function localizedKeys<Base extends string>(base: Base): `${Base}_${Lang}`[] {
  return LANGS.map((lang) => `${base}_${lang}` as const);
}

export function pickLocalized<Base extends string, Source extends Localized<Base, unknown>>(
  base: Base,
  source: Source
): { [Key in `${Base}_${Lang}`]: Source[Key] } {
  return Object.fromEntries(localizedKeys(base).map((key) => [key, source[key]])) as { [Key in `${Base}_${Lang}`]: Source[Key] };
}

export function emptyLocalized<Base extends string, Value>(base: Base, value: Value): Localized<Base, Value> {
  return Object.fromEntries(localizedKeys(base).map((key) => [key, value])) as Localized<Base, Value>;
}

// Arabic is typed right to left; the other languages left to right.
export function textDirection(lang: Lang): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export type FieldKind = 'string' | 'text' | 'url' | 'link' | 'email' | 'phone' | 'rich_text' | 'image' | 'select' | 'list';

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  multilingual?: boolean;
  required?: boolean;
  help?: string;
  options?: string[];
  fields?: FieldDef[];
};

export type BlockGroup = {
  id: string;
  label: string;
  fieldKeys: string[];
};

export type BlockTypeDef = {
  type: string;
  label: string;
  description: string;
  fields: FieldDef[];
};

export type SiteBlockDef = {
  page_name: string;
  section_name: string;
  title: string;
  description?: string;
  groups: BlockGroup[];
  fields: FieldDef[];
};

export type Schemas = {
  block_types: BlockTypeDef[];
  site_blocks: SiteBlockDef[];
};

export type Content = Record<string, unknown>;
