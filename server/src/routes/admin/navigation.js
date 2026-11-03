const express = require('express');
const { body, param, query: queryValidator } = require('express-validator');

const { asyncRoute, multilingual, safeLink, validateRequest } = require('../../middleware/validate');
const { navRepository } = require('../../repositories/navRepository');
const navService = require('../../services/navService');

const LOCATIONS = ['topbar', 'header', 'footer', 'mobile', 'cities'];

const itemValidators = () => [
  body('page_id').optional({ nullable: true }).isUUID(),
  safeLink('url'),
  ...multilingual('label'),
  body('sort_order').optional().isInt({ min: 0 }).toInt(),
  body('is_visible').optional().isBoolean().toBoolean()
];

const adminNavigationRouter = express.Router();

adminNavigationRouter.get(
  '/',
  queryValidator('location').optional().isIn(LOCATIONS),
  validateRequest,
  asyncRoute(async (req, res) => {
    res.json({ ok: true, items: await navRepository.list({ location: req.query.location }) });
  })
);

adminNavigationRouter.post(
  '/',
  body('location').isIn(LOCATIONS),
  ...itemValidators(),
  validateRequest,
  asyncRoute(async (req, res) => {
    res.status(201).json({ ok: true, item: await navService.createItem(req.body) });
  })
);

adminNavigationRouter.put(
  '/order',
  body('ids').isArray({ min: 1 }),
  body('ids.*').isUUID(),
  validateRequest,
  asyncRoute(async (req, res) => {
    await navRepository.reorder(req.body.ids);
    res.json({ ok: true });
  })
);

adminNavigationRouter.put(
  '/:id',
  param('id').isUUID(),
  body('location').optional().isIn(LOCATIONS),
  ...itemValidators(),
  validateRequest,
  asyncRoute(async (req, res) => {
    res.json({ ok: true, item: await navService.updateItem(req.params.id, req.body) });
  })
);

adminNavigationRouter.delete(
  '/:id',
  param('id').isUUID(),
  validateRequest,
  asyncRoute(async (req, res) => {
    await navService.deleteItem(req.params.id);
    res.json({ ok: true });
  })
);

module.exports = { adminNavigationRouter };
