const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');

const { query } = require('../config/db');
const { verifyToken, requireAnyRole } = require('../middleware/auth');

const bookingsRouter = express.Router();

const WORK_TYPES = ['repair', 'install', 'purchase', 'cleaning', 'other'];

bookingsRouter.post(
  '/',
  body('user_name').isString().trim().notEmpty(),
  body('phone').isString().trim().notEmpty(),
  body('service_id').optional({ nullable: true }).isUUID(),
  body('date').optional({ nullable: true }).isISO8601().toDate(),
  body('time').optional({ nullable: true }).matches(/^\d{2}:\d{2}(:\d{2})?$/),
  body('address').optional({ nullable: true }).isString(),
  body('problem_description').optional({ nullable: true }).isString(),
  body('work_types').optional().isArray({ max: WORK_TYPES.length }),
  body('work_types.*').isIn(WORK_TYPES),
  body('source_page').optional({ nullable: true }).isString().isLength({ max: 500 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid payload', details: errors.array() } });
      }

      // Hidden field real visitors never fill in. Bots get the normal answer.
      if (req.body.website) return res.status(201).json({ ok: true, booking: null });

      const { user_name, phone, service_id, date, time, address, problem_description, work_types, source_page } = req.body;
      const result = await query(
        `
        INSERT INTO bookings (user_name, phone, service_id, date, time, address, problem_description, status, work_types, source_page)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'new',$8,$9)
        RETURNING *
      `,
        [
          user_name,
          phone,
          service_id || null,
          date || null,
          time || null,
          address || null,
          problem_description || null,
          work_types || [],
          source_page || null
        ]
      );

      return res.status(201).json({ ok: true, booking: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

bookingsRouter.get(
  '/',
  verifyToken,
  requireAnyRole(['admin', 'editor']),
  queryValidator('status').optional().isIn(['new', 'in_progress', 'completed', 'cancelled', 'all']),
  queryValidator('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  queryValidator('offset').optional().isInt({ min: 0 }).toInt(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid query', details: errors.array() } });
      }

      const status = req.query.status || 'all';
      const limit = req.query.limit ?? 50;
      const offset = req.query.offset ?? 0;

      const params = [];
      let whereSql = '';
      if (status !== 'all') {
        params.push(status);
        whereSql = `WHERE status = $${params.length}`;
      }

      params.push(limit);
      params.push(offset);

      const sql = `
        SELECT *
        FROM bookings
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
      `;

      const result = await query(sql, params);
      return res.json({ ok: true, bookings: result.rows, limit, offset });
    } catch (err) {
      return next(err);
    }
  }
);

bookingsRouter.put(
  '/:id/status',
  verifyToken,
  requireAnyRole(['admin', 'editor']),
  param('id').isUUID(),
  body('status').isIn(['new', 'in_progress', 'completed', 'cancelled']),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid payload', details: errors.array() } });
      }

      const { id } = req.params;
      const { status } = req.body;

      const result = await query('UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
      if (result.rowCount === 0) return res.status(404).json({ ok: false, error: { message: 'Not found' } });

      return res.json({ ok: true, booking: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = { bookingsRouter };

