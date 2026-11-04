const { withClient } = require('../config/db');
const { httpError } = require('../config/httpError');
const { mediaRepository } = require('../repositories/mediaRepository');
const { deleteFile, storeFile } = require('./fileStorage');

function fileKind(file) {
  return file.mimetype.startsWith('image/') ? 'image' : 'document';
}

function fileValues(file, url) {
  return {
    url,
    filename: file.originalname,
    mime_type: file.mimetype,
    size_bytes: file.size,
    kind: fileKind(file)
  };
}

async function requireAsset(id) {
  const asset = await mediaRepository.findById(id);
  if (!asset) throw httpError(404, 'Not found');
  return asset;
}

async function createAsset(file, userId) {
  const url = await storeFile(file);
  return mediaRepository.insert({ ...fileValues(file, url), uploaded_by: userId });
}

async function updateAsset(id, values) {
  await requireAsset(id);
  return mediaRepository.update(id, values);
}

async function replaceAssetFile(id, file) {
  const existing = await requireAsset(id);
  // Every saved reference moves to the new file, and a PDF can't stand in for a picture.
  if (fileKind(file) !== existing.kind) throw httpError(400, 'Choose a file of the same kind.');
  const url = await storeFile(file);
  const asset = await withClient(async (client) => {
    await client.query('BEGIN');
    try {
      const updated = await mediaRepository.update(id, fileValues(file, url), client);
      await mediaRepository.replaceUrlReferences(existing.url, url, client);
      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
  await deleteFile(existing.url);
  return asset;
}

async function deleteAsset(id) {
  const asset = await requireAsset(id);
  const usages = await mediaRepository.countUsages(asset);
  if (usages.galleries + usages.services + usages.content > 0) {
    throw Object.assign(httpError(409, 'This file is still used on the site. Remove it there first.'), {
      details: usages
    });
  }
  await mediaRepository.remove(id);
  await deleteFile(asset.url);
}

module.exports = { createAsset, deleteAsset, replaceAssetFile, updateAsset };
