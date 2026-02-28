const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');

const { query } = require('../config/db');
const { triggerRevalidate } = require('../config/revalidateClient');
const { verifyToken, requireAnyRole } = require('../middleware/auth');

const servicesRouter = express.Router();

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
        ORDER BY created_at DESC
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
  body('title_en').optional({ nullable: true }).isString(),
  body('title_ru').optional({ nullable: true }).isString(),
  body('title_am').optional({ nullable: true }).isString(),
  body('description_en').optional({ nullable: true }).isString(),
  body('description_ru').optional({ nullable: true }).isString(),
  body('description_am').optional({ nullable: true }).isString(),
  body('price').optional({ nullable: true }).isInt({ min: 0 }).toInt(),
  body('image_url').optional({ nullable: true }).isString(),
  body('is_active').optional().isBoolean().toBoolean(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid payload', details: errors.array() } });
      }

      const {
        type,
        title_en,
        title_ru,
        title_am,
        description_en,
        description_ru,
        description_am,
        price,
        image_url,
        is_active
      } = req.body;

      const result = await query(
        `
        INSERT INTO services
          (type, title_en, title_ru, title_am, description_en, description_ru, description_am, price, image_url, is_active)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10, TRUE))
        RETURNING *
      `,
        [type, title_en, title_ru, title_am, description_en, description_ru, description_am, price, image_url, is_active]
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
  body('title_en').optional({ nullable: true }).isString(),
  body('title_ru').optional({ nullable: true }).isString(),
  body('title_am').optional({ nullable: true }).isString(),
  body('description_en').optional({ nullable: true }).isString(),
  body('description_ru').optional({ nullable: true }).isString(),
  body('description_am').optional({ nullable: true }).isString(),
  body('price').optional({ nullable: true }).isInt({ min: 0 }).toInt(),
  body('image_url').optional({ nullable: true }).isString(),
  body('is_active').optional().isBoolean().toBoolean(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid payload', details: errors.array() } });
      }

      const { id } = req.params;
      const fields = ['type', 'title_en', 'title_ru', 'title_am', 'description_en', 'description_ru', 'description_am', 'price', 'image_url', 'is_active'];
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

module.exports = { servicesRouter };

