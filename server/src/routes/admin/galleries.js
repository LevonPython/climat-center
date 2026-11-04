const express = require('express');
const { body, param, query: queryValidator } = require('express-validator');

const { asyncRoute, multilingual, safeLink, validateRequest } = require('../../middleware/validate');
const { galleryRepository } = require('../../repositories/galleryRepository');
const galleryService = require('../../services/galleryService');

const COLLECTIONS = ['brands', 'certificates', 'works'];

const itemValidators = () => [
  ...multilingual('title'),
  safeLink('link_url'),
  body('sort_order').optional().isInt({ min: 0 }).toInt(),
  body('is_visible').optional().isBoolean().toBoolean()
];

const adminGalleriesRouter = express.Router();

adminGalleriesRouter.get(
  '/',
  queryValidator('collection').optional().isIn(COLLECTIONS),
  validateRequest,
  asyncRoute(async (req, res) => {
    res.json({ ok: true, items: await galleryRepository.listWithMedia({ collection: req.query.collection }) });
  })
);

adminGalleriesRouter.post(
  '/',
  body('collection').isIn(COLLECTIONS),
  body('media_id').isUUID(),
  ...itemValidators(),
  validateRequest,
  asyncRoute(async (req, res) => {
    res.status(201).json({ ok: true, item: await galleryService.createItem(req.body) });
  })
);

adminGalleriesRouter.put(
  '/order',
  body('ids').isArray({ min: 1 }),
  body('ids.*').isUUID(),
  validateRequest,
  asyncRoute(async (req, res) => {
    await galleryRepository.reorder(req.body.ids);
    res.json({ ok: true });
  })
);

adminGalleriesRouter.put(
  '/:id',
  param('id').isUUID(),
  body('media_id').optional().isUUID(),
  ...itemValidators(),
  validateRequest,
  asyncRoute(async (req, res) => {
    res.json({ ok: true, item: await galleryService.updateItem(req.params.id, req.body) });
  })
);

adminGalleriesRouter.delete(
  '/:id',
  param('id').isUUID(),
  validateRequest,
  asyncRoute(async (req, res) => {
    await galleryService.deleteItem(req.params.id);
    res.json({ ok: true });
  })
);

module.exports = { adminGalleriesRouter };
