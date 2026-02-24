export type Lang = 'ru' | 'en' | 'am';

export type FieldKind = 'string' | 'text' | 'url' | 'email' | 'phone';

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  multilingual?: boolean;
  required?: boolean;
  help?: string;
};

export type BlockGroup = {
  id: string;
  label: string;
  fieldKeys: string[];
};

export type BlockUiDef = {
  page_name: string;
  section_name: string;
  title: string;
  description?: string;
  groups: BlockGroup[];
  fields: FieldDef[];
};

export type JsonSchema = {
  $id: string;
  type: 'object';
  additionalProperties: false;
  properties: Record<string, { type: Array<'string' | 'null'> }>;
  required?: string[];
};

export type BlockDef = BlockUiDef & {
  schemaKey: string;
  allowedKeys: string[];
  jsonSchema: JsonSchema;
};

export function schemaKey(page_name: string, section_name: string) {
  return `${page_name}/${section_name}`;
}

const ALL_LANGS: Lang[] = ['ru', 'en', 'am'];

function expandFieldKeys(field: FieldDef): string[] {
  if (!field.multilingual) return [field.key];
  return ALL_LANGS.map((l) => `${field.key}_${l}`);
}

function buildAllowedKeys(fields: FieldDef[]): string[] {
  const out: string[] = [];
  for (const f of fields) out.push(...expandFieldKeys(f));
  // Ensure uniqueness and stable ordering
  return Array.from(new Set(out));
}

function buildJsonSchema(id: string, fields: FieldDef[]): JsonSchema {
  const properties: JsonSchema['properties'] = {};
  const required: string[] = [];

  for (const f of fields) {
    const keys = expandFieldKeys(f);
    for (const k of keys) {
      properties[k] = { type: ['string', 'null'] };
      if (f.required) required.push(k);
    }
  }

  return {
    $id: id,
    type: 'object',
    additionalProperties: false,
    properties,
    ...(required.length ? { required } : {})
  };
}

function defineBlock(ui: BlockUiDef): BlockDef {
  const key = schemaKey(ui.page_name, ui.section_name);
  const allowedKeys = buildAllowedKeys(ui.fields);
  const jsonSchema = buildJsonSchema(`content-block:${key}`, ui.fields);
  return { ...ui, schemaKey: key, allowedKeys, jsonSchema };
}

export const ALL_BLOCK_DEFS: BlockDef[] = [
  defineBlock({
    page_name: 'home',
    section_name: 'hero',
    title: 'Home / Hero',
    description: 'Hero section text shown on the home page.',
    groups: [
      { id: 'hero', label: 'Hero', fieldKeys: ['title', 'subtitle', 'cta'] }
    ],
    fields: [
      { key: 'title', label: 'Title', kind: 'string', multilingual: true },
      { key: 'subtitle', label: 'Subtitle', kind: 'text', multilingual: true },
      { key: 'cta', label: 'CTA button text', kind: 'string', multilingual: true }
    ]
  }),

  defineBlock({
    page_name: 'home',
    section_name: 'contacts',
    title: 'Home / Contacts',
    description: 'Basic contact details (legacy / optional).',
    groups: [{ id: 'contacts', label: 'Contacts', fieldKeys: ['phone', 'email'] }],
    fields: [
      { key: 'phone', label: 'Phone', kind: 'phone' },
      { key: 'email', label: 'Email', kind: 'email' }
    ]
  }),

  defineBlock({
    page_name: 'global',
    section_name: 'contacts',
    title: 'Global / Contacts',
    description: 'Contacts used across the site (phone/email + localized hours/address).',
    groups: [
      { id: 'main', label: 'Main', fieldKeys: ['phone', 'email'] },
      { id: 'details', label: 'Localized details', fieldKeys: ['hours', 'address'] }
    ],
    fields: [
      { key: 'phone', label: 'Phone', kind: 'phone' },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'hours', label: 'Working hours', kind: 'text', multilingual: true },
      { key: 'address', label: 'Address', kind: 'text', multilingual: true }
    ]
  }),

  defineBlock({
    page_name: 'global',
    section_name: 'social',
    title: 'Global / Social',
    description: 'Social links shown on the contacts page.',
    groups: [
      {
        id: 'links',
        label: 'Links',
        fieldKeys: ['whatsapp_url', 'telegram_url', 'facebook_url', 'instagram_url']
      }
    ],
    fields: [
      { key: 'whatsapp_url', label: 'WhatsApp URL', kind: 'url' },
      { key: 'telegram_url', label: 'Telegram URL', kind: 'url' },
      { key: 'facebook_url', label: 'Facebook URL', kind: 'url' },
      { key: 'instagram_url', label: 'Instagram URL', kind: 'url' }
    ]
  }),

  defineBlock({
    page_name: 'about',
    section_name: 'page',
    title: 'About / Page',
    description: 'Main About page copy and CTA.',
    groups: [
      { id: 'header', label: 'Header', fieldKeys: ['title', 'subtitle'] },
      { id: 'sections', label: 'Sections', fieldKeys: ['section1Title', 'section1Body', 'section2Title', 'section2Body', 'section3Title', 'section3Body'] },
      { id: 'facts', label: 'Facts', fieldKeys: ['factsTitle', 'fact1Title', 'fact1Desc', 'fact2Title', 'fact2Desc', 'fact3Title', 'fact3Desc'] },
      { id: 'cta', label: 'Call to action', fieldKeys: ['ctaTitle', 'ctaSubtitle', 'call', 'contacts'] }
    ],
    fields: [
      { key: 'title', label: 'Title', kind: 'string', multilingual: true },
      { key: 'subtitle', label: 'Subtitle', kind: 'text', multilingual: true },

      { key: 'section1Title', label: 'Section 1 title', kind: 'string', multilingual: true },
      { key: 'section1Body', label: 'Section 1 body', kind: 'text', multilingual: true },
      { key: 'section2Title', label: 'Section 2 title', kind: 'string', multilingual: true },
      { key: 'section2Body', label: 'Section 2 body', kind: 'text', multilingual: true },
      { key: 'section3Title', label: 'Section 3 title', kind: 'string', multilingual: true },
      { key: 'section3Body', label: 'Section 3 body', kind: 'text', multilingual: true },

      { key: 'factsTitle', label: 'Facts title', kind: 'string', multilingual: true },
      { key: 'fact1Title', label: 'Fact 1 title', kind: 'string', multilingual: true },
      { key: 'fact1Desc', label: 'Fact 1 description', kind: 'text', multilingual: true },
      { key: 'fact2Title', label: 'Fact 2 title', kind: 'string', multilingual: true },
      { key: 'fact2Desc', label: 'Fact 2 description', kind: 'text', multilingual: true },
      { key: 'fact3Title', label: 'Fact 3 title', kind: 'string', multilingual: true },
      { key: 'fact3Desc', label: 'Fact 3 description', kind: 'text', multilingual: true },

      { key: 'ctaTitle', label: 'CTA title', kind: 'string', multilingual: true },
      { key: 'ctaSubtitle', label: 'CTA subtitle', kind: 'text', multilingual: true },
      { key: 'call', label: 'CTA primary button', kind: 'string', multilingual: true },
      { key: 'contacts', label: 'CTA secondary button', kind: 'string', multilingual: true }
    ]
  }),

  defineBlock({
    page_name: 'contacts',
    section_name: 'page',
    title: 'Contacts / Page',
    description: 'Contacts page header and social section copy.',
    groups: [
      { id: 'header', label: 'Header', fieldKeys: ['title', 'subtitle'] },
      { id: 'social', label: 'Social section', fieldKeys: ['socialTitle', 'socialSubtitle'] }
    ],
    fields: [
      { key: 'title', label: 'Title', kind: 'string', multilingual: true },
      { key: 'subtitle', label: 'Subtitle', kind: 'text', multilingual: true },
      { key: 'socialTitle', label: 'Social title', kind: 'string', multilingual: true },
      { key: 'socialSubtitle', label: 'Social subtitle', kind: 'text', multilingual: true }
    ]
  })
];

const INDEX = new Map<string, BlockDef>(ALL_BLOCK_DEFS.map((b) => [b.schemaKey, b]));

export function getBlockDef(page_name: string, section_name: string): BlockDef | null {
  return INDEX.get(schemaKey(page_name, section_name)) || null;
}

