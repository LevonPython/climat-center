const { galleryRepository } = require('../repositories/galleryRepository');
const { navRepository } = require('../repositories/navRepository');
const { sectionRepository } = require('../repositories/sectionRepository');
const { serviceRepository } = require('../repositories/serviceRepository');
const { translationRepository } = require('../repositories/translationRepository');
const { resolveLangContent } = require('./localization');
const { pagePath } = require('./pageService');

function toNavItem(item, lang) {
  return {
    id: item.id,
    label: item[`label_${lang}`] ?? null,
    href: item.page_slug ? pagePath(item.page_slug) : item.url
  };
}

function toServiceItem(service, lang) {
  return {
    id: service.id,
    category: service.category,
    title: service[`title_${lang}`] ?? null,
    menu_title: service[`menu_title_${lang}`] ?? null,
    pill_title: service[`pill_title_${lang}`] ?? null,
    show_in_menu: service.show_in_menu,
    show_in_pills: service.show_in_pills,
    href: service.page_slug ? pagePath(service.page_slug) : null
  };
}

function toGalleryItem(item, lang) {
  return {
    id: item.id,
    url: item.url,
    title: item[`title_${lang}`] ?? null,
    alt: item[`alt_${lang}`] ?? null,
    link_url: item.link_url
  };
}

function groupBy(items, key) {
  const groups = {};
  for (const item of items) {
    (groups[item[key]] = groups[item[key]] || []).push(item);
  }
  return groups;
}

function mapGroups(groups, mapper) {
  return Object.fromEntries(Object.entries(groups).map(([key, items]) => [key, items.map(mapper)]));
}

async function getSite(lang) {
  const [blocks, navItems, services, galleryItems] = await Promise.all([
    sectionRepository.listSiteBlocks(),
    navRepository.listVisibleWithPages(),
    serviceRepository.listActiveWithPages(),
    galleryRepository.listWithMedia({ visibleOnly: true })
  ]);

  return {
    settings: Object.fromEntries(blocks.map((b) => [b.section_name, resolveLangContent(b.content_json, lang)])),
    nav: mapGroups(groupBy(navItems, 'location'), (item) => toNavItem(item, lang)),
    services: mapGroups(groupBy(services, 'category'), (service) => toServiceItem(service, lang)),
    galleries: mapGroups(groupBy(galleryItems, 'collection'), (item) => toGalleryItem(item, lang))
  };
}

async function getTranslations(lang) {
  const rows = await translationRepository.list();
  return Object.fromEntries(
    rows.filter((row) => row[`value_${lang}`] !== null).map((row) => [row.key, row[`value_${lang}`]])
  );
}

module.exports = { getSite, getTranslations };
