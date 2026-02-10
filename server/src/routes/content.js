const express = require('express');
const { body, param, validationResult } = require('express-validator');

const { query } = require('../config/db');
const { verifyToken, requireAnyRole } = require('../middleware/auth');

const contentRouter = express.Router();

function resolveLangContent(contentJson, lang) {
  if (!contentJson || typeof contentJson !== 'object') return {};
  const out = {};
  const suffix = `_${lang}`;

  // Copy non-suffixed keys
  for (const [k, v] of Object.entries(contentJson)) {
    if (!k.endsWith('_en') && !k.endsWith('_ru') && !k.endsWith('_am')) {
      out[k] = v;
    }
  }

  // Map suffixed keys to base key (title_ru -> title)
  for (const [k, v] of Object.entries(contentJson)) {
    if (k.endsWith(suffix)) {
      out[k.slice(0, -suffix.length)] = v;
    }
  }

  return out;
}

// Raw blocks (for admin editor)
contentRouter.get('/blocks', verifyToken, requireAnyRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, page_name, section_name, content_json, updated_at FROM content_blocks ORDER BY page_name, section_name',
      []
    );
    return res.json({ ok: true, content_blocks: result.rows });
  } catch (err) {
    return next(err);
  }
});

contentRouter.get(
  '/:lang',
  param('lang').isIn(['en', 'ru', 'am']),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid lang', details: errors.array() } });
      }

      const { lang } = req.params;
      const result = await query(
        'SELECT id, page_name, section_name, content_json, updated_at FROM content_blocks ORDER BY page_name, section_name',
        []
      );

      const pages = {};
      for (const row of result.rows) {
        if (!pages[row.page_name]) pages[row.page_name] = {};
        pages[row.page_name][row.section_name] = resolveLangContent(row.content_json, lang);
      }

      return res.json({ ok: true, lang, pages });
    } catch (err) {
      return next(err);
    }
  }
);

// Upsert by (page_name, section_name) or update by id
contentRouter.put(
  '/',
  verifyToken,
  requireAnyRole(['admin', 'editor']),
  body('id').optional().isUUID(),
  body('page_name').optional().isString().trim().notEmpty(),
  body('section_name').optional().isString().trim().notEmpty(),
  body('content_json').isObject(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid payload', details: errors.array() } });
      }

      const { id, page_name, section_name, content_json } = req.body;

      let result;
      if (id) {
        result = await query('UPDATE content_blocks SET content_json = $1 WHERE id = $2 RETURNING *', [content_json, id]);
      } else {
        if (!page_name || !section_name) {
          return res
            .status(400)
            .json({ ok: false, error: { message: 'Provide id or (page_name + section_name)' } });
        }
        result = await query(
          `
          INSERT INTO content_blocks (page_name, section_name, content_json)
          VALUES ($1,$2,$3)
          ON CONFLICT (page_name, section_name)
          DO UPDATE SET content_json = EXCLUDED.content_json
          RETURNING *
        `,
          [page_name, section_name, content_json]
        );
      }

      if (result.rowCount === 0) return res.status(404).json({ ok: false, error: { message: 'Not found' } });
      return res.json({ ok: true, content_block: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = { contentRouter };

