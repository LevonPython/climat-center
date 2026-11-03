const { httpError } = require('../config/httpError');
const { navRepository } = require('../repositories/navRepository');

async function requireItem(id) {
  const item = await navRepository.findById(id);
  if (!item) throw httpError(404, 'Not found');
  return item;
}

function assertHasTarget(page_id, url) {
  if (!page_id && !url) throw httpError(400, 'Choose a page or enter a link.');
}

async function createItem(values) {
  assertHasTarget(values.page_id, values.url);
  return navRepository.insert(values);
}

async function updateItem(id, values) {
  const existing = await requireItem(id);
  const page_id = values.page_id === undefined ? existing.page_id : values.page_id;
  const url = values.url === undefined ? existing.url : values.url;
  assertHasTarget(page_id, url);
  return navRepository.update(id, values);
}

async function deleteItem(id) {
  await requireItem(id);
  await navRepository.remove(id);
}

module.exports = { createItem, deleteItem, updateItem };
