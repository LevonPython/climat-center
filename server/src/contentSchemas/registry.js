const ALL_LANGS = ['ru', 'en', 'hy'];

// These fields are rendered as href or iframe src on the public site, so script URLs must never get in.
const SAFE_LINK_PATTERN = '^$|^(/(?!/)|https?://|mailto:|tel:)';
const WEB_ADDRESS_PATTERN = '^$|^https?://';

function schemaKey(page_name, section_name) {
  return `${page_name}/${section_name}`;
}

function expandFieldKeys(field) {
  if (!field.multilingual) return [field.key];
  return ALL_LANGS.map((l) => `${field.key}_${l}`);
}

function fieldSchema(field) {
  if (field.kind === 'list') {
    return { type: 'array', items: buildJsonSchema(undefined, field.fields) };
  }
  if (field.kind === 'select') {
    return { enum: [...field.options, null] };
  }
  if (field.kind === 'link') return { type: ['string', 'null'], pattern: SAFE_LINK_PATTERN };
  if (field.kind === 'url') return { type: ['string', 'null'], pattern: WEB_ADDRESS_PATTERN };
  return { type: ['string', 'null'] };
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
      properties[k] = fieldSchema(f);
      if (f.required) required.push(k);
    }
  }

  return {
    ...(id ? { $id: id } : {}),
    type: 'object',
    additionalProperties: false,
    properties,
    ...(required.length ? { required } : {})
  };
}

function defineBlock(page_name, section_name, { title, description, groups }, fields) {
  const key = schemaKey(page_name, section_name);
  return {
    page_name,
    section_name,
    title,
    description,
    groups,
    fields,
    schemaKey: key,
    allowedKeys: buildAllowedKeys(fields),
    jsonSchema: buildJsonSchema(`content-block:${key}`, fields)
  };
}

const text = (key, label) => ({ key, label, kind: 'string', multilingual: true });
const longText = (key, label) => ({ key, label, kind: 'text', multilingual: true });
const url = (key, label) => ({ key, label, kind: 'url' });
const image = (key, label) => ({ key, label, kind: 'image' });
const phone = { key: 'phone', label: 'Phone', kind: 'phone' };
const email = { key: 'email', label: 'Email', kind: 'email' };

// The admin builds its forms from these definitions through GET /api/admin/schemas.
const ALL_BLOCKS = [
  defineBlock(
    'home',
    'hero',
    {
      title: 'Home page: main banner',
      description: 'Text in the banner at the top of the home page.',
      groups: [{ id: 'hero', label: 'Banner', fieldKeys: ['title', 'subtitle', 'cta'] }]
    },
    [text('title', 'Title'), longText('subtitle', 'Subtitle'), text('cta', 'Button text')]
  ),
  defineBlock(
    'home',
    'contacts',
    {
      title: 'Home page: contacts',
      description: 'Phone and email on the home page.',
      groups: [{ id: 'contacts', label: 'Contacts', fieldKeys: ['phone', 'email'] }]
    },
    [phone, email]
  ),
  defineBlock(
    'global',
    'contacts',
    {
      title: 'Contacts',
      description: 'Phone, email, working hours and address used across the site.',
      groups: [
        { id: 'main', label: 'Phone and email', fieldKeys: ['phone', 'email'] },
        { id: 'details', label: 'Hours and address', fieldKeys: ['hours', 'address'] }
      ]
    },
    [phone, email, longText('hours', 'Working hours'), longText('address', 'Address')]
  ),
  defineBlock(
    'global',
    'social',
    {
      title: 'Social links',
      description: 'Links to the company pages and messengers.',
      groups: [{ id: 'links', label: 'Links', fieldKeys: ['whatsapp_url', 'telegram_url', 'facebook_url', 'instagram_url'] }]
    },
    [
      url('whatsapp_url', 'WhatsApp link'),
      url('telegram_url', 'Telegram link'),
      url('facebook_url', 'Facebook link'),
      url('instagram_url', 'Instagram link')
    ]
  ),
  defineBlock(
    'global',
    'branding',
    {
      title: 'Logo and company name',
      description: 'Company name, tagline, logo and the main banner picture.',
      groups: [
        { id: 'text', label: 'Text', fieldKeys: ['site_name', 'tagline'] },
        { id: 'images', label: 'Images', fieldKeys: ['logo_url', 'hero_image_url'] }
      ]
    },
    [text('site_name', 'Company name'), text('tagline', 'Tagline'), image('logo_url', 'Logo'), image('hero_image_url', 'Main banner picture')]
  ),
  defineBlock(
    'global',
    'header',
    {
      title: 'Site header',
      description: 'Short promises and the button shown at the top of every page.',
      groups: [{ id: 'main', label: 'Header', fieldKeys: ['hours_text', 'arrival_text', 'free_visit_text', 'cta_label'] }]
    },
    [
      text('hours_text', 'Working hours'),
      text('arrival_text', 'Arrival promise'),
      text('free_visit_text', 'Free visit note'),
      text('cta_label', 'Button text')
    ]
  ),
  defineBlock(
    'global',
    'footer',
    {
      title: 'Site footer',
      description: 'Text shown at the bottom of every page.',
      groups: [{ id: 'main', label: 'Footer', fieldKeys: ['copyright', 'disclaimer'] }]
    },
    [text('copyright', 'Copyright'), longText('disclaimer', 'Disclaimer')]
  ),
  defineBlock(
    'about',
    'page',
    {
      title: 'About page',
      description: 'Text of the About page.',
      groups: [
        { id: 'header', label: 'Top of the page', fieldKeys: ['title', 'subtitle'] },
        {
          id: 'sections',
          label: 'Sections',
          fieldKeys: ['section1Title', 'section1Body', 'section2Title', 'section2Body', 'section3Title', 'section3Body']
        },
        { id: 'facts', label: 'Facts', fieldKeys: ['factsTitle', 'fact1Title', 'fact1Desc', 'fact2Title', 'fact2Desc', 'fact3Title', 'fact3Desc'] },
        { id: 'cta', label: 'Call to action', fieldKeys: ['ctaTitle', 'ctaSubtitle', 'call', 'contacts'] }
      ]
    },
    [
      text('title', 'Title'),
      longText('subtitle', 'Subtitle'),
      text('section1Title', 'Section 1 title'),
      longText('section1Body', 'Section 1 text'),
      text('section2Title', 'Section 2 title'),
      longText('section2Body', 'Section 2 text'),
      text('section3Title', 'Section 3 title'),
      longText('section3Body', 'Section 3 text'),
      text('factsTitle', 'Facts title'),
      text('fact1Title', 'Fact 1 title'),
      longText('fact1Desc', 'Fact 1 description'),
      text('fact2Title', 'Fact 2 title'),
      longText('fact2Desc', 'Fact 2 description'),
      text('fact3Title', 'Fact 3 title'),
      longText('fact3Desc', 'Fact 3 description'),
      text('ctaTitle', 'Call to action title'),
      longText('ctaSubtitle', 'Call to action subtitle'),
      text('call', 'Main button'),
      text('contacts', 'Second button')
    ]
  ),
  defineBlock(
    'contacts',
    'page',
    {
      title: 'Contacts page',
      description: 'Text of the Contacts page.',
      groups: [
        { id: 'header', label: 'Top of the page', fieldKeys: ['title', 'subtitle'] },
        { id: 'social', label: 'Social section', fieldKeys: ['socialTitle', 'socialSubtitle'] }
      ]
    },
    [text('title', 'Title'), longText('subtitle', 'Subtitle'), text('socialTitle', 'Social section title'), longText('socialSubtitle', 'Social section subtitle')]
  )
];

const INDEX = new Map(ALL_BLOCKS.map((b) => [b.schemaKey, b]));

function getBlockDef(page_name, section_name) {
  return INDEX.get(schemaKey(page_name, section_name)) || null;
}

function describeSiteBlocks() {
  return ALL_BLOCKS.map(({ page_name, section_name, title, description, groups, fields }) => ({
    page_name,
    section_name,
    title,
    description,
    groups,
    fields
  }));
}

module.exports = {
  ALL_BLOCKS,
  ALL_LANGS,
  buildAllowedKeys,
  buildJsonSchema,
  describeSiteBlocks,
  expandFieldKeys,
  getBlockDef,
  schemaKey
};
