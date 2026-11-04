const { describeBlockTypes } = require('../../server/src/contentSchemas/blockTypes');
const { describeSiteBlocks } = require('../../server/src/contentSchemas/registry');

function collect(fields: any[]): string[] {
  return fields.flatMap((field) => [field.label, ...(field.help ? [field.help] : []), ...(field.options || []), ...collect(field.fields || [])]);
}

const labels: string[] = [
  ...describeBlockTypes().flatMap((block: any) => [block.label, block.description, ...collect(block.fields)]),
  ...describeSiteBlocks().flatMap((block: any) => [
    block.title,
    block.description,
    ...block.groups.map((group: any) => group.label),
    ...collect(block.fields)
  ])
];

describe('schema labels', () => {
  test.each(['hy', 'ru', 'en'])('every label from the server is translated in %s', (locale) => {
    const catalogue = require(`../public/locales/${locale}/schema.json`);
    expect([...new Set(labels)].filter((label) => !catalogue[label])).toEqual([]);
  });

  test('the catalogues hold no label the server no longer sends', () => {
    const known = new Set(labels);
    const catalogue = require('../public/locales/hy/schema.json');
    expect(Object.keys(catalogue).filter((label) => !known.has(label))).toEqual([]);
  });
});
