const express = require('express');
const { param } = require('express-validator');

const { asyncRoute, validateRequest } = require('../middleware/validate');
const { LANGS } = require('../services/localization');
const { getPublishedPage } = require('../services/pageService');
const { getSite, getTranslations } = require('../services/siteService');
const { pageRepository } = require('../repositories/pageRepository');

const langParam = param('lang').isIn(LANGS);

const siteRouter = express.Router();

siteRouter.get(
  '/:lang',
  langParam,
  validateRequest,
  asyncRoute(async (req, res) => {
    res.json({ ok: true, lang: req.params.lang, ...(await getSite(req.params.lang)) });
  })
);

const translationsRouter = express.Router();

translationsRouter.get(
  '/:lang',
  langParam,
  validateRequest,
  asyncRoute(async (req, res) => {
    res.json({ ok: true, lang: req.params.lang, translations: await getTranslations(req.params.lang) });
  })
);

const pagesRouter = express.Router();

pagesRouter.get(
  '/slugs',
  asyncRoute(async (req, res) => {
    res.json({ ok: true, pages: await pageRepository.listPublishedSlugs() });
  })
);

// The slug may contain slashes, such as usluga/remont-kondicionerov.
pagesRouter.get(
  '/:lang/*',
  langParam,
  validateRequest,
  asyncRoute(async (req, res) => {
    res.json({ ok: true, page: await getPublishedPage(req.params[0], req.params.lang) });
  })
);

module.exports = { pagesRouter, siteRouter, translationsRouter };
