const express = require('express');
const { body, param, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

const { query } = require('../config/db');
const { verifyToken, requireAnyRole, requireRole } = require('../middleware/auth');
const { asyncRoute, validateRequest } = require('../middleware/validate');
const { changeOwnPassword, setUserPassword, signToken } = require('../services/authService');

const authRouter = express.Router();

authRouter.put(
  '/password',
  verifyToken,
  requireAnyRole(['admin', 'editor']),
  body('current_password').isString().notEmpty(),
  body('new_password').isString().isLength({ min: 8 }),
  validateRequest,
  asyncRoute(async (req, res) => {
    const token = await changeOwnPassword(req.user.id, req.body.current_password, req.body.new_password);
    res.json({ ok: true, token });
  })
);

authRouter.put(
  '/users/:id/password',
  verifyToken,
  requireRole('admin'),
  param('id').isUUID(),
  body('password').isString().isLength({ min: 8 }),
  validateRequest,
  asyncRoute(async (req, res) => {
    await setUserPassword(req.user.id, req.params.id, req.body.password);
    res.json({ ok: true });
  })
);

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

      const token = signToken(user);

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

