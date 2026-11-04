const { body, validationResult } = require('express-validator');

const { LANGS } = require('../services/localization');

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, error: { message: 'Invalid payload', details: errors.array() } });
  }
  return next();
}

// Express 4 does not catch async rejections.
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve().then(() => handler(req, res, next)).catch(next);
}

function multilingual(name) {
  return LANGS.map((lang) => body(`${name}_${lang}`).optional({ nullable: true }).isString());
}

// These links are rendered as href on the public site, so script URLs must never get in.
function safeLink(name) {
  return body(name)
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 500 })
    .matches(/^(\/(?!\/)|https?:\/\/|mailto:|tel:)/i);
}

module.exports = { asyncRoute, multilingual, safeLink, validateRequest };
