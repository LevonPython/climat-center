const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');

  if (!token) {
    return res.status(401).json({ ok: false, error: { message: 'Missing token' } });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is required');

    const payload = jwt.verify(token, secret);
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role
    };
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

