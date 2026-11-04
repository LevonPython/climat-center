const { httpError } = require('../config/httpError');
const { triggerRevalidatePaths } = require('../config/revalidateClient');
const { pageRepository } = require('../repositories/pageRepository');
const { sectionRepository } = require('../repositories/sectionRepository');
const { resolveLangContent } = require('./localization');

const HOME_SLUG = 'home';
const RESERVED_FIRST_SEGMENTS = new Set(['api', 'booking', 'quiz', 'uploads', 'sitemap.xml', 'robots.txt', '_next']);

function pagePath(slug) {
  return slug === HOME_SLUG ? '/' : `/${slug}`;
}

function assertSlugAllowed(slug) {
  if (RESERVED_FIRST_SEGMENTS.has(slug.split('/')[0])) {
    throw httpError(400, 'This address is already used by the site.');
  }
}

async function requirePage(id) {
  const page = await pageRepository.findById(id);
  if (!page) throw httpError(404, 'Not found');
  return page;
}

async function assertNoParentCycle(id, parentId) {
  if (!parentId) return;
  if (parentId === id) throw httpError(400, 'A page cannot be its own parent.');
  const ancestors = await pageRepository.findAncestors(parentId);
  if (ancestors.some((ancestor) => ancestor.id === id)) {
    throw httpError(400, 'A page cannot be placed under its own subpage.');
  }
}

async function createPage(values) {
  assertSlugAllowed(values.slug);
  const page = await pageRepository.insert(values);
  triggerRevalidatePaths([pagePath(page.slug)]);
  return page;
}

async function updatePage(id, values) {
  const existing = await requirePage(id);
  if (values.slug) assertSlugAllowed(values.slug);
  if (existing.slug === HOME_SLUG && values.slug && values.slug !== HOME_SLUG) {
    throw httpError(400, 'The home page address cannot change.');
  }
  await assertNoParentCycle(id, values.parent_id);

  const page = await pageRepository.update(id, values);
  triggerRevalidatePaths([...new Set([pagePath(existing.slug), pagePath(page.slug)])]);
  return page;
}

async function deletePage(id) {
  const page = await requirePage(id);
  if (page.slug === HOME_SLUG) throw httpError(400, 'The home page cannot be deleted.');
  await pageRepository.remove(id);
  triggerRevalidatePaths([pagePath(page.slug)]);
}

async function getPageForAdmin(id) {
  const page = await requirePage(id);
  const sections = await sectionRepository.listForPage(id);
  return { ...page, sections };
}

function toLocalizedPage(page, lang) {
  return {
    slug: page.slug,
    title: page[`title_${lang}`] ?? null,
    meta_title: page[`meta_title_${lang}`] ?? null,
    meta_description: page[`meta_description_${lang}`] ?? null
  };
}

async function getPublishedPage(slug, lang) {
  const page = await pageRepository.findBySlug(slug);
  if (!page || page.status !== 'published') throw httpError(404, 'Not found');

  const [ancestors, sections] = await Promise.all([
    pageRepository.findAncestors(page.id),
    sectionRepository.listForPage(page.id, { visibleOnly: true })
  ]);

  return {
    ...toLocalizedPage(page, lang),
    type: page.type,
    updated_at: page.updated_at,
    breadcrumbs: ancestors
      .filter((ancestor) => ancestor.status === 'published')
      .reverse()
      .map((ancestor) => ({ href: pagePath(ancestor.slug), title: ancestor[`title_${lang}`] ?? null })),
    sections: sections.map((section) => ({
      id: section.id,
      block_type: section.block_type,
      content: resolveLangContent(section.content_json, lang)
    }))
  };
}

module.exports = {
  HOME_SLUG,
  createPage,
  deletePage,
  getPageForAdmin,
  getPublishedPage,
  pagePath,
  requirePage,
  updatePage
};
