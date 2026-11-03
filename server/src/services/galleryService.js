const { httpError } = require('../config/httpError');
const { galleryRepository } = require('../repositories/galleryRepository');

async function requireItem(id) {
  const item = await galleryRepository.findById(id);
  if (!item) throw httpError(404, 'Not found');
  return item;
}

async function createItem(values) {
  const sort_order = await galleryRepository.nextSortOrder(values.collection);
  return galleryRepository.insert({ ...values, sort_order });
}

async function updateItem(id, values) {
  await requireItem(id);
  return galleryRepository.update(id, values);
}

async function deleteItem(id) {
  await requireItem(id);
  await galleryRepository.remove(id);
}

module.exports = { createItem, deleteItem, updateItem };
