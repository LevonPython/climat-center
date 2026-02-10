const express = require('express');
const { body, query: queryValidator, validationResult } = require('express-validator');

const { query } = require('../config/db');
const { verifyToken, requireAnyRole } = require('../middleware/auth');

const quizSubmissionsRouter = express.Router();

quizSubmissionsRouter.post(
  '/',
  body('answers_json').isObject(),
  body('contact_info').optional().isObject(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid payload', details: errors.array() } });
      }

      const { answers_json, contact_info } = req.body;
      const result = await query(
        `
        INSERT INTO quiz_submissions (answers_json, contact_info)
        VALUES ($1, $2)
        RETURNING *
      `,
        [answers_json, contact_info || {}]
      );

      return res.status(201).json({ ok: true, quiz_submission: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

quizSubmissionsRouter.get(
  '/',
  verifyToken,
  requireAnyRole(['admin', 'editor']),
  queryValidator('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  queryValidator('offset').optional().isInt({ min: 0 }).toInt(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid query', details: errors.array() } });
      }

      const limit = req.query.limit ?? 50;
      const offset = req.query.offset ?? 0;
      const result = await query(
        `
        SELECT *
        FROM quiz_submissions
        ORDER BY created_at DESC
        LIMIT $1
        OFFSET $2
      `,
        [limit, offset]
      );
      return res.json({ ok: true, quiz_submissions: result.rows, limit, offset });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = { quizSubmissionsRouter };

