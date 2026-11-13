const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');

const { query } = require('../config/db');
const { triggerRevalidate } = require('../config/revalidateClient');
const { verifyToken, requireAnyRole } = require('../middleware/auth');
const { multilingual } = require('../middleware/validate');
const { localizedColumns } = require('../services/localization');

const servicesRouter = express.Router();

const TITLE_FIELDS = localizedColumns('title');
const DESCRIPTION_FIELDS = localizedColumns('description');
const STRUCTURE_FIELDS = [
  'page_id', 'category', ...['menu_title', 'pill_title'].flatMap(localizedColumns),
  'show_in_menu', 'show_in_pills', 'sort_order'
];
const STRUCTURE_DEFAULTS = { category: 'service', show_in_menu: true, show_in_pills: false, sort_order: 0 };

const structureValidators = () => [
  body('page_id').optional({ nullable: true }).isUUID(),
  body('category').optional().isIn(['service', 'fault']),
  ...['menu_title', 'pill_title'].flatMap(multilingual),
  body('show_in_menu').optional().isBoolean().toBoolean(),
  body('show_in_pills').optional().isBoolean().toBoolean(),
  body('sort_order').optional().isInt({ min: 0 }).toInt()
];

servicesRouter.get(
  '/',
  queryValidator('type').optional().isString().trim().notEmpty().toLowerCase().isIn(['install', 'repair', 'service']),
  queryValidator('includeInactive').optional().isBoolean().toBoolean(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid query', details: errors.array() } });
      }

      const { type, includeInactive } = req.query;
      const where = [];
      const params = [];

      if (type) {
        params.push(type);
        where.push(`type = $${params.length}`);
      }

      if (!includeInactive) {
        where.push('is_active = TRUE');
      }

      const sql = `
        SELECT *
        FROM services
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY sort_order, created_at DESC
      `;

      const result = await query(sql, params);
      return res.json({ ok: true, services: result.rows });
    } catch (err) {
      return next(err);
    }
  }
);

servicesRouter.post(
  '/',
  verifyToken,
  requireAnyRole(['admin', 'editor']),
  body('type').isString().trim().notEmpty().toLowerCase().isIn(['install', 'repair', 'service']),
  ...TITLE_FIELDS.map((field) => body(field).optional({ nullable: true }).isString().trim()),
  body().custom((_, { req }) => {
    const hasAnyTitle = TITLE_FIELDS.some((field) => typeof req.body[field] === 'string' && req.body[field].trim().length > 0);
    if (!hasAnyTitle) throw new Error('At least one title is required');
    return true;
  }),
  ...multilingual('description'),
  body('price').optional({ nullable: true }).isInt({ min: 0 }).toInt(),
  body('image_url').optional({ nullable: true }).isString(),
  body('is_active').optional().isBoolean().toBoolean(),
  ...structureValidators(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid payload', details: errors.array() } });
      }

      const valueOf = (field) => req.body[field] ?? STRUCTURE_DEFAULTS[field] ?? null;
      const row = {
        type: req.body.type,
        ...Object.fromEntries(TITLE_FIELDS.map((field) => [field, req.body[field] || null])),
        ...Object.fromEntries([...DESCRIPTION_FIELDS, 'price', 'image_url', ...STRUCTURE_FIELDS].map((field) => [field, valueOf(field)])),
        is_active: req.body.is_active ?? true
      };
      // Column names come from the lists above, never from the request.
      const columns = Object.keys(row);
      const result = await query(
        `INSERT INTO services (${columns.join(', ')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`,
        Object.values(row)
      );

      // Fire-and-forget: services page is statically regenerated on the Next.js side.
      triggerRevalidate('services');
      return res.status(201).json({ ok: true, service: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

servicesRouter.put(
  '/:id',
  verifyToken,
  requireAnyRole(['admin', 'editor']),
  param('id').isUUID(),
  body('type').optional().isString().trim().notEmpty().toLowerCase().isIn(['install', 'repair', 'service']),
  ...['title', 'description'].flatMap(multilingual),
  body('price').optional({ nullable: true }).isInt({ min: 0 }).toInt(),
  body('image_url').optional({ nullable: true }).isString(),
  body('is_active').optional().isBoolean().toBoolean(),
  ...structureValidators(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid payload', details: errors.array() } });
      }

      const { id } = req.params;
      const fields = ['type', ...TITLE_FIELDS, ...DESCRIPTION_FIELDS, 'price', 'image_url', 'is_active', ...STRUCTURE_FIELDS];
      const sets = [];
      const params = [];

      for (const f of fields) {
        if (Object.prototype.hasOwnProperty.call(req.body, f)) {
          params.push(req.body[f]);
          sets.push(`${f} = $${params.length}`);
        }
      }

      if (sets.length === 0) {
        return res.status(400).json({ ok: false, error: { message: 'No fields to update' } });
      }

      params.push(id);
      const result = await query(
        `
        UPDATE services
        SET ${sets.join(', ')}
        WHERE id = $${params.length}
        RETURNING *
      `,
        params
      );

      if (result.rowCount === 0) return res.status(404).json({ ok: false, error: { message: 'Not found' } });
      // Fire-and-forget: services page is statically regenerated on the Next.js side.
      triggerRevalidate('services');
      return res.json({ ok: true, service: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

// Soft-delete
servicesRouter.delete(
  '/:id',
  verifyToken,
  requireAnyRole(['admin']),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid id', details: errors.array() } });
      }

      const { id } = req.params;
      const result = await query('UPDATE services SET is_active = FALSE WHERE id = $1 RETURNING *', [id]);
      if (result.rowCount === 0) return res.status(404).json({ ok: false, error: { message: 'Not found' } });
      // Fire-and-forget: services page is statically regenerated on the Next.js side.
      triggerRevalidate('services');
      return res.json({ ok: true, service: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

// Permanent delete (hard delete).
servicesRouter.delete(
  '/:id/permanent',
  verifyToken,
  requireAnyRole(['admin']),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid id', details: errors.array() } });
      }

      const { id } = req.params;
      const result = await query('DELETE FROM services WHERE id = $1 RETURNING *', [id]);
      if (result.rowCount === 0) return res.status(404).json({ ok: false, error: { message: 'Not found' } });
      triggerRevalidate('services');
      return res.json({ ok: true, service: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = { servicesRouter };

