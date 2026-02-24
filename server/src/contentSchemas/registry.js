const ALL_LANGS = ['ru', 'en', 'am'];

function schemaKey(page_name, section_name) {
  return `${page_name}/${section_name}`;
}

function expandFieldKeys(field) {
  if (!field.multilingual) return [field.key];
  return ALL_LANGS.map((l) => `${field.key}_${l}`);
}

function buildAllowedKeys(fields) {
  const out = [];
  for (const f of fields) out.push(...expandFieldKeys(f));
  return Array.from(new Set(out));
}

function buildJsonSchema(id, fields) {
  const properties = {};
  const required = [];

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

function defineBlock(page_name, section_name, fields) {
  const key = schemaKey(page_name, section_name);
  return {
    page_name,
    section_name,
    schemaKey: key,
    allowedKeys: buildAllowedKeys(fields),
    jsonSchema: buildJsonSchema(`content-block:${key}`, fields)
  };
}

// NOTE: Keep in sync with admin schema registry.
const ALL_BLOCKS = [
  defineBlock('home', 'hero', [
    { key: 'title', multilingual: true },
    { key: 'subtitle', multilingual: true },
    { key: 'cta', multilingual: true }
  ]),
  defineBlock('home', 'contacts', [{ key: 'phone' }, { key: 'email' }]),
  defineBlock('global', 'contacts', [
    { key: 'phone' },
    { key: 'email' },
    { key: 'hours', multilingual: true },
    { key: 'address', multilingual: true }
  ]),
  defineBlock('global', 'social', [
    { key: 'whatsapp_url' },
    { key: 'telegram_url' },
    { key: 'facebook_url' },
    { key: 'instagram_url' }
  ]),
  defineBlock('about', 'page', [
    { key: 'title', multilingual: true },
    { key: 'subtitle', multilingual: true },
    { key: 'section1Title', multilingual: true },
    { key: 'section1Body', multilingual: true },
    { key: 'section2Title', multilingual: true },
    { key: 'section2Body', multilingual: true },
    { key: 'section3Title', multilingual: true },
    { key: 'section3Body', multilingual: true },
    { key: 'factsTitle', multilingual: true },
    { key: 'fact1Title', multilingual: true },
    { key: 'fact1Desc', multilingual: true },
    { key: 'fact2Title', multilingual: true },
    { key: 'fact2Desc', multilingual: true },
    { key: 'fact3Title', multilingual: true },
    { key: 'fact3Desc', multilingual: true },
    { key: 'ctaTitle', multilingual: true },
    { key: 'ctaSubtitle', multilingual: true },
    { key: 'call', multilingual: true },
    { key: 'contacts', multilingual: true }
  ]),
  defineBlock('contacts', 'page', [
    { key: 'title', multilingual: true },
    { key: 'subtitle', multilingual: true },
    { key: 'socialTitle', multilingual: true },
    { key: 'socialSubtitle', multilingual: true }
  ])
];

const INDEX = new Map(ALL_BLOCKS.map((b) => [b.schemaKey, b]));

function getBlockDef(page_name, section_name) {
  return INDEX.get(schemaKey(page_name, section_name)) || null;
}

module.exports = { ALL_BLOCKS, getBlockDef, schemaKey };

