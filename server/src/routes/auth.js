const express = require('express');
const { body, param, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { query } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const authRouter = express.Router();

authRouter.get('/users', verifyToken, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await query('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC', []);
    return res.json({ ok: true, users: result.rows });
  } catch (err) {
    return next(err);
  }
});

authRouter.delete(
  '/users/:id',
  verifyToken,
  requireRole('admin'),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid id', details: errors.array() } });
      }
      const { id } = req.params;
      if (req.user?.id === id) {
        return res.status(400).json({ ok: false, error: { message: 'Cannot delete yourself' } });
      }

      const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) return res.status(404).json({ ok: false, error: { message: 'Not found' } });
      return res.json({ ok: true, deleted: { id: result.rows[0].id } });
    } catch (err) {
      return next(err);
    }
  }
);

authRouter.post(
  '/login',
  body('username').isString().trim().notEmpty(),
  body('password').isString().notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid payload', details: errors.array() } });
      }

      const { username, password } = req.body;
      const userRes = await query('SELECT id, username, password_hash, role FROM users WHERE username = $1', [
        username
      ]);
      const user = userRes.rows[0];
      if (!user) return res.status(401).json({ ok: false, error: { message: 'Invalid credentials' } });

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ ok: false, error: { message: 'Invalid credentials' } });

      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET is required');
      const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

      const token = jwt.sign({ username: user.username, role: user.role }, secret, {
        subject: user.id,
        expiresIn
      });

      return res.json({ ok: true, token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
      return next(err);
    }
  }
);

authRouter.post(
  '/register',
  verifyToken,
  requireRole('admin'),
  body('username').isString().trim().notEmpty(),
  body('password').isString().isLength({ min: 8 }),
  body('role').isIn(['admin', 'editor']),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid payload', details: errors.array() } });
      }

      const { username, password, role } = req.body;
      const passwordHash = await bcrypt.hash(password, 10);

      const insertRes = await query(
        `
        INSERT INTO users (username, password_hash, role)
        VALUES ($1, $2, $3)
        RETURNING id, username, role
      `,
        [username, passwordHash, role]
      );

      return res.status(201).json({ ok: true, user: insertRes.rows[0] });
    } catch (err) {
      // Unique violation
      if (err && err.code === '23505') {
        return res.status(409).json({ ok: false, error: { message: 'Username already exists' } });
      }
      return next(err);
    }
  }
);

module.exports = { authRouter };

