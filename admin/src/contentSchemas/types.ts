export type Lang = 'hy' | 'ru' | 'en';
export const LANGS: Lang[] = ['hy', 'ru', 'en'];

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
