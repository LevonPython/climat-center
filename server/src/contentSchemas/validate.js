const Ajv = require('ajv');

const { ALL_BLOCKS, schemaKey } = require('./registry');

const ajv = new Ajv({
  allErrors: true,
  allowUnionTypes: true
});

for (const b of ALL_BLOCKS) {
  ajv.addSchema(b.jsonSchema, b.jsonSchema.$id);
}

const VALIDATORS = new Map();

function getValidator(page_name, section_name) {
  const key = schemaKey(page_name, section_name);
  const cached = VALIDATORS.get(key);
  if (cached) return cached;

  const block = ALL_BLOCKS.find((x) => x.schemaKey === key);
  if (!block) return null;

  const validate = ajv.getSchema(block.jsonSchema.$id);
  if (!validate) return null;
  VALIDATORS.set(key, validate);
  return validate;
}

function validateContentJson(page_name, section_name, content_json) {
  const validate = getValidator(page_name, section_name);
  if (!validate) {
    return {
      ok: false,
      kind: 'unknown_block',
      message: `No schema registered for ${page_name}/${section_name}`
    };
  }

  const ok = validate(content_json);
  if (ok) return { ok: true };

  return {
    ok: false,
    kind: 'schema_validation_failed',
    message: 'Schema validation failed',
    errors: validate.errors || []
  };
}

module.exports = { validateContentJson };

