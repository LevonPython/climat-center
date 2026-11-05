const express = require('express');
const { body, param, query: queryValidator } = require('express-validator');

const { requireRole } = require('../../middleware/auth');
const { asyncRoute, multilingual, validateRequest } = require('../../middleware/validate');
const { pageRepository } = require('../../repositories/pageRepository');
const pageService = require('../../services/pageService');
const sectionService = require('../../services/sectionService');

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/;
const PAGE_TYPES = ['home', 'service', 'fault', 'listing', 'article', 'city', 'gallery', 'static'];

const pageFieldValidators = (slugChain) => [
  slugChain.matches(SLUG_PATTERN).withMessage('Use lowercase letters, numbers, hyphens and slashes.'),
  body('parent_id').optional({ nullable: true }).isUUID(),
  body('status').optional().isIn(['published', 'hidden']),
  body('sort_order').optional().isInt({ min: 0 }).toInt(),
  ...['title', 'meta_title', 'meta_description'].flatMap(multilingual),
  ...['ru', 'en', 'hy'].map((lang) => body(`needs_review_${lang}`).optional().isBoolean().toBoolean())
];

const adminPagesRouter = express.Router();

adminPagesRouter.get(
  '/',
  queryValidator('type').optional().isIn(PAGE_TYPES),
  queryValidator('status').optional().isIn(['published', 'hidden']),
  validateRequest,
  asyncRoute(async (req, res) => {
    const { type, status } = req.query;
    res.json({ ok: true, pages: await pageRepository.list({ type, status }) });
  })
);

adminPagesRouter.post(
  '/',
  body('type').isIn(PAGE_TYPES),
  ...pageFieldValidators(body('slug').isString()),
  validateRequest,
  asyncRoute(async (req, res) => {
    res.status(201).json({ ok: true, page: await pageService.createPage(req.body) });
  })
);

adminPagesRouter.get(
  '/:id',
  param('id').isUUID(),
  validateRequest,
  asyncRoute(async (req, res) => {
    res.json({ ok: true, page: await pageService.getPageForAdmin(req.params.id) });
  })
);

adminPagesRouter.put(
  '/:id',
  param('id').isUUID(),
  body('type').optional().isIn(PAGE_TYPES),
  ...pageFieldValidators(body('slug').optional().isString()),
  validateRequest,
  asyncRoute(async (req, res) => {
    res.json({ ok: true, page: await pageService.updatePage(req.params.id, req.body) });
  })
);

adminPagesRouter.delete(
  '/:id',
  requireRole('admin'),
  param('id').isUUID(),
  validateRequest,
  asyncRoute(async (req, res) => {
    await pageService.deletePage(req.params.id);
    res.json({ ok: true });
  })
);

adminPagesRouter.post(
  '/:id/sections',
  param('id').isUUID(),
  body('block_type').isString().notEmpty(),
  body('content_json').optional().isObject(),
  body('is_visible').optional().isBoolean().toBoolean(),
  validateRequest,
  asyncRoute(async (req, res) => {
    const section = await sectionService.createSection(req.params.id, req.body, req.user.id);
    res.status(201).json({ ok: true, section });
  })
);

adminPagesRouter.put(
  '/:id/sections/order',
  param('id').isUUID(),
  body('ids').isArray({ min: 1 }),
  body('ids.*').isUUID(),
  validateRequest,
  asyncRoute(async (req, res) => {
    await sectionService.reorderSections(req.params.id, req.body.ids);
    res.json({ ok: true });
  })
);

const adminSectionsRouter = express.Router();

adminSectionsRouter.put(
  '/:id',
  param('id').isUUID(),
  body('content_json').optional().isObject(),
  body('is_visible').optional().isBoolean().toBoolean(),
  validateRequest,
  asyncRoute(async (req, res) => {
    const section = await sectionService.updateSection(req.params.id, req.body, req.user.id);
    res.json({ ok: true, section });
  })
);

adminSectionsRouter.delete(
  '/:id',
  requireRole('admin'),
  param('id').isUUID(),
  validateRequest,
  asyncRoute(async (req, res) => {
    await sectionService.deleteSection(req.params.id);
    res.json({ ok: true });
  })
);

adminSectionsRouter.get(
  '/:id/versions',
  param('id').isUUID(),
  validateRequest,
  asyncRoute(async (req, res) => {
    res.json({ ok: true, versions: await sectionService.listSectionVersions(req.params.id) });
  })
);

module.exports = { adminPagesRouter, adminSectionsRouter };
