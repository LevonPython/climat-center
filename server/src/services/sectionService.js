const { withClient } = require('../config/db');
const { httpError } = require('../config/httpError');
const { triggerRevalidatePaths } = require('../config/revalidateClient');
const { getBlockType } = require('../contentSchemas/blockTypes');
const { validateBlockType } = require('../contentSchemas/validate');
const { pageRepository } = require('../repositories/pageRepository');
const { sectionRepository } = require('../repositories/sectionRepository');
const { sanitizeContent } = require('./contentSanitizer');
const { pagePath, requirePage } = require('./pageService');

function prepareContent(blockType, content) {
  const check = validateBlockType(blockType, content);
  if (!check.ok) {
    throw Object.assign(httpError(400, check.message), {
      details: { kind: check.kind, errors: check.errors || [] }
    });
  }
  return sanitizeContent(getBlockType(blockType).fields, content);
}

async function requireSection(id) {
  const section = await sectionRepository.findById(id);
  if (!section || !section.page_id) throw httpError(404, 'Not found');
  return section;
}

async function refreshPage(pageId) {
  const page = await pageRepository.findById(pageId);
  if (page) triggerRevalidatePaths([pagePath(page.slug)]);
}

async function saveWithVersion(userId, save) {
  return withClient(async (client) => {
    await client.query('BEGIN');
    try {
      const section = await save(client);
      await sectionRepository.insertVersion(section.id, userId, section.content_json, client);
      await client.query('COMMIT');
      return section;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}

async function createSection(pageId, { block_type, content_json, is_visible }, userId) {
  await requirePage(pageId);
  const content = prepareContent(block_type, content_json || {});
  const section = await saveWithVersion(userId, async (client) => {
    const sort_order = await sectionRepository.nextSortOrder(pageId, client);
    return sectionRepository.insert({ page_id: pageId, block_type, content_json: content, sort_order, is_visible }, client);
  });
  await refreshPage(pageId);
  return section;
}

async function updateSection(id, { content_json, is_visible }, userId) {
  const existing = await requireSection(id);
  let section;
  if (content_json === undefined) {
    section = await sectionRepository.update(id, { is_visible });
  } else {
    const content = prepareContent(existing.block_type, content_json);
    section = await saveWithVersion(userId, (client) =>
      sectionRepository.update(id, { content_json: content, is_visible }, client)
    );
  }
  await refreshPage(existing.page_id);
  return section;
}

async function deleteSection(id) {
  const section = await requireSection(id);
  await sectionRepository.remove(id);
  await refreshPage(section.page_id);
}

async function reorderSections(pageId, ids) {
  await requirePage(pageId);
  const existing = await sectionRepository.listForPage(pageId);
  const known = new Set(existing.map((section) => section.id));
  if (ids.length !== known.size || !ids.every((id) => known.has(id))) {
    throw httpError(400, 'The order must list every section of the page once.');
  }
  await sectionRepository.reorder(ids);
  await refreshPage(pageId);
}

async function listSectionVersions(id) {
  await requireSection(id);
  return sectionRepository.listVersions(id);
}

module.exports = { createSection, deleteSection, listSectionVersions, reorderSections, updateSection };
