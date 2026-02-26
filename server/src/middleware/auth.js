const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');

  if (!token) {
    return res.status(401).json({ ok: false, error: { message: 'Missing token' } });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is required');

    const payload = jwt.verify(token, secret);

    const userId = payload?.sub;
    if (!userId || typeof userId !== 'string') {
      return res.status(401).json({ ok: false, error: { message: 'Invalid token' } });
    }

    const result = await query('SELECT id, username, role FROM users WHERE id = $1', [userId]);
    if (result.rowCount === 0) {
      // Token might be structurally valid but refers to a deleted/reseeded user.
      return res.status(401).json({ ok: false, error: { message: 'Invalid token' } });
    }

    req.user = result.rows[0];
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: { message: 'Invalid token' } });
  }
}

function requireAnyRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: { message: 'Forbidden' } });
    }
    return next();
  };
}

function requireRole(role) {
  return requireAnyRole([role]);
}

module.exports = { verifyToken, requireRole, requireAnyRole };

