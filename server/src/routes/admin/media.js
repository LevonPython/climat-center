const express = require('express');
const { param, query: queryValidator } = require('express-validator');

const { httpError } = require('../../config/httpError');
const { requireRole } = require('../../middleware/auth');
const { acceptMediaFile } = require('../../middleware/upload');
const { asyncRoute, multilingual, validateRequest } = require('../../middleware/validate');
const { mediaRepository } = require('../../repositories/mediaRepository');
const { localizedColumns } = require('../../services/localization');
const mediaService = require('../../services/mediaService');

function requireFile(req) {
  if (!req.file) throw httpError(400, 'Missing file');
  return req.file;
}

const adminMediaRouter = express.Router();

adminMediaRouter.get(
  '/',
  queryValidator('kind').optional().isIn(['image', 'document']),
  queryValidator('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  queryValidator('offset').optional().isInt({ min: 0 }).toInt(),
  validateRequest,
  asyncRoute(async (req, res) => {
    const limit = req.query.limit ?? 50;
    const offset = req.query.offset ?? 0;
    const assets = await mediaRepository.listPage({ kind: req.query.kind, limit, offset });
    res.json({ ok: true, assets, limit, offset });
  })
);

adminMediaRouter.post(
  '/',
  acceptMediaFile,
  asyncRoute(async (req, res) => {
    res.status(201).json({ ok: true, asset: await mediaService.createAsset(requireFile(req), req.user.id) });
  })
);

adminMediaRouter.put(
  '/:id',
  param('id').isUUID(),
  ...multilingual('alt'),
  validateRequest,
  asyncRoute(async (req, res) => {
    const alts = Object.fromEntries(localizedColumns('alt').map((key) => [key, req.body[key]]));
    res.json({ ok: true, asset: await mediaService.updateAsset(req.params.id, alts) });
  })
);

adminMediaRouter.put(
  '/:id/file',
  param('id').isUUID(),
  validateRequest,
  acceptMediaFile,
  asyncRoute(async (req, res) => {
    res.json({ ok: true, asset: await mediaService.replaceAssetFile(req.params.id, requireFile(req)) });
  })
);

adminMediaRouter.delete(
  '/:id',
  requireRole('admin'),
  param('id').isUUID(),
  validateRequest,
  asyncRoute(async (req, res) => {
    await mediaService.deleteAsset(req.params.id);
    res.json({ ok: true });
  })
);

module.exports = { adminMediaRouter };
