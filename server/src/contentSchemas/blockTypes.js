const { buildAllowedKeys, buildJsonSchema } = require('./registry');

const text = (key, label) => ({ key, label, kind: 'string', multilingual: true });
const longText = (key, label) => ({ key, label, kind: 'text', multilingual: true });
const richText = (key, label) => ({ key, label, kind: 'rich_text', multilingual: true });
const image = (key = 'image_url', label = 'Image') => ({ key, label, kind: 'image' });
const list = (key, label, fields) => ({ key, label, kind: 'list', fields });
const link = (key, label) => ({ key, label, kind: 'link' });
const heading = text('heading', 'Heading');

function defineBlockType(type, label, description, fields) {
  return {
    type,
    label,
    description,
    fields,
    allowedKeys: buildAllowedKeys(fields),
    jsonSchema: buildJsonSchema(`block-type:${type}`, fields)
  };
}

const ALL_BLOCK_TYPES = [
  defineBlockType('intro_banner', 'Intro banner', 'Page title with promo cards.', [
    heading,
    text('subheading', 'Subheading'),
    longText('intro_text', 'Introduction'),
    list('promos', 'Promo cards', [text('label', 'Label'), text('price', 'Price'), image()])
  ]),
  defineBlockType('rich_text', 'Text', 'Heading with formatted text.', [heading, richText('body', 'Text')]),
  defineBlockType('icon_features', 'Icon features', 'Short points, each with an icon.', [
    heading,
    list('items', 'Points', [image('icon_url', 'Icon'), text('title', 'Title'), longText('description', 'Description'), link('link_url', 'Link')])
  ]),
  defineBlockType('work_cards', 'Work cards', 'Cards describing the kinds of work.', [
    heading,
    list('items', 'Cards', [text('title', 'Title'), longText('description', 'Description'), image()])
  ]),
  defineBlockType('image_text', 'Image with text', 'A picture with labels next to formatted text.', [
    heading,
    image(),
    { key: 'image_side', label: 'Picture side', kind: 'select', options: ['left', 'right'] },
    list('labels', 'Labels on the picture', [text('text', 'Text')]),
    richText('body', 'Text')
  ]),
  defineBlockType('steps', 'Steps', 'Numbered stages of the work.', [
    heading,
    list('items', 'Steps', [text('title', 'Title'), longText('description', 'Description'), image()])
  ]),
  defineBlockType('price_cards', 'Price cards', 'Prices as cards. An empty price shows "price on request".', [
    heading,
    list('items', 'Cards', [text('title', 'Title'), text('price', 'Price')])
  ]),
  defineBlockType('price_list', 'Price list', 'Prices as rows. An empty price shows "price on request". With a group title, only the first two rows show until the visitor opens the rest.', [
    heading,
    text('group_title', 'Group title'),
    text('group_price', 'Group price'),
    list('items', 'Rows', [text('title', 'Title'), text('price', 'Price')])
  ]),
  defineBlockType('advantages', 'Advantages', 'Numbered reasons to choose the company.', [
    heading,
    list('items', 'Advantages', [image('icon_url', 'Icon'), longText('text', 'Text')])
  ]),
  defineBlockType('tools', 'Tools', 'Equipment used for the work.', [
    heading,
    list('items', 'Tools', [text('title', 'Title'), longText('description', 'Description'), image()])
  ]),
  defineBlockType('gallery', 'Gallery', 'Pictures from a gallery collection.', [
    heading,
    { key: 'collection', label: 'Collection', kind: 'select', options: ['brands', 'certificates', 'works'] }
  ]),
  defineBlockType('faq', 'Questions and answers', 'A list of questions with answers.', [
    heading,
    list('items', 'Questions', [text('question', 'Question'), richText('answer', 'Answer')])
  ]),
  defineBlockType('error_codes', 'Error codes', 'Error codes grouped by brand.', [
    heading,
    list('items', 'Brands', [text('brand', 'Brand'), richText('codes', 'Codes')])
  ]),
  defineBlockType('listing', 'Service list', 'Links to services or faults.', [
    heading,
    { key: 'category', label: 'Category', kind: 'select', options: ['service', 'fault'] }
  ]),
  defineBlockType('request_form', 'Request form', 'Name and phone form that creates a booking.', [
    heading,
    text('button_label', 'Button text'),
    { key: 'layout', label: 'Form layout', kind: 'select', options: ['row', 'split'] }
  ]),
  defineBlockType('contacts_strip', 'Contacts', 'Address, hours, email and phone from the site settings.', [heading]),
  defineBlockType('service_banner', 'Banner with picture', 'Picture with a heading, short points and a button.', [
    heading,
    image('image_url', 'Picture'),
    list('options', 'Points', [text('text', 'Text')]),
    text('button_label', 'Button text')
  ]),
  defineBlockType('callout', 'Highlight', 'A highlighted heading with points and a button. Add a picture to show it beside them, or an icon to each point.', [
    heading,
    image(),
    list('items', 'Points', [image('icon_url', 'Icon'), text('text', 'Text')]),
    text('button_label', 'Button text')
  ]),
  defineBlockType('video', 'Video', 'A video from YouTube or Rutube, with a heading.', [
    heading,
    { key: 'video_url', label: 'Video address', kind: 'url' }
  ]),
  defineBlockType('photos', 'Photos', 'A row of pictures that open larger.', [
    heading,
    list('items', 'Pictures', [image(), text('caption', 'Caption')])
  ]),
  defineBlockType('products', 'Products', 'Product cards with pictures, a price and details.', [
    heading,
    list('items', 'Products', [
      text('title', 'Title'),
      list('images', 'Pictures', [image()]),
      text('price', 'Price'),
      richText('details', 'Details')
    ])
  ]),
  defineBlockType('signs', 'Warning signs', 'Short signs with icons, and advice below them.', [
    heading,
    list('items', 'Signs', [image('icon_url', 'Icon'), text('title', 'Title')]),
    richText('body', 'Text')
  ]),
  defineBlockType('map', 'Map', 'A map of the address in the site settings.', [heading])
];

const INDEX = new Map(ALL_BLOCK_TYPES.map((b) => [b.type, b]));

function getBlockType(type) {
  return INDEX.get(type) || null;
}

function describeBlockTypes() {
  return ALL_BLOCK_TYPES.map(({ type, label, description, fields }) => ({ type, label, description, fields }));
}

module.exports = { ALL_BLOCK_TYPES, describeBlockTypes, getBlockType };
