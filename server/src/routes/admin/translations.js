const express = require('express');
const { body, param } = require('express-validator');

const { httpError } = require('../../config/httpError');
const { asyncRoute, validateRequest } = require('../../middleware/validate');
const { translationRepository } = require('../../repositories/translationRepository');

const KEY_PATTERN = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;

const adminTranslationsRouter = express.Router();

adminTranslationsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    res.json({ ok: true, translations: await translationRepository.list() });
  })
);

adminTranslationsRouter.put(
  '/:key',
  param('key').matches(KEY_PATTERN),
  body('value_ru').optional({ nullable: true }).isString(),
  body('value_en').optional({ nullable: true }).isString(),
  body('value_hy').optional({ nullable: true }).isString(),
  validateRequest,
  asyncRoute(async (req, res) => {
    const translation = await translationRepository.upsert({ ...req.body, key: req.params.key });
    res.json({ ok: true, translation });
  })
);

adminTranslationsRouter.delete(
  '/:key',
  param('key').matches(KEY_PATTERN),
  validateRequest,
  asyncRoute(async (req, res) => {
    const removed = await translationRepository.removeByKey(req.params.key);
    if (!removed) throw httpError(404, 'Not found');
    res.json({ ok: true });
  })
);

module.exports = { adminTranslationsRouter };
