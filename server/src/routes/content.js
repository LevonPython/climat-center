const express = require('express');
const { body, param, validationResult } = require('express-validator');

const { query, withClient } = require('../config/db');
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

// Versions (history) for a block
contentRouter.get(
  '/blocks/:id/versions',
  verifyToken,
  requireAnyRole(['admin', 'editor']),
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid id', details: errors.array() } });
      }

      const { id } = req.params;
      const result = await query(
        `
        SELECT v.id, v.content_block_id, v.updated_by, u.username AS updated_by_username, v.content_json, v.created_at
        FROM content_block_versions v
        LEFT JOIN users u ON u.id = v.updated_by
        WHERE v.content_block_id = $1
        ORDER BY v.created_at DESC
        LIMIT 50
      `,
        [id]
      );
      return res.json({ ok: true, versions: result.rows });
    } catch (err) {
      return next(err);
    }
  }
);

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

      const userId = req.user?.id || null;

      // Validate the "upsert by (page_name, section_name)" case BEFORE opening a transaction.
      if (!id && (!page_name || !section_name)) {
        return res.status(400).json({ ok: false, error: { message: 'Provide id or (page_name + section_name)' } });
      }

      const updated = await withClient(async (client) => {
        await client.query('BEGIN');
        try {
          let result;
          if (id) {
            result = await client.query('UPDATE content_blocks SET content_json = $1 WHERE id = $2 RETURNING *', [
              content_json,
              id
            ]);
          } else {
            result = await client.query(
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

          if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return { ok: false, status: 404, body: { ok: false, error: { message: 'Not found' } } };
          }

          const block = result.rows[0];
          await client.query(
            `
            INSERT INTO content_block_versions (content_block_id, updated_by, content_json)
            VALUES ($1, $2, $3)
          `,
            [block.id, userId, content_json]
          );

          await client.query('COMMIT');
          return { ok: true, block };
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        }
      });

      if (!updated.ok) return res.status(updated.status).json(updated.body);
      return res.json({ ok: true, content_block: updated.block });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = { contentRouter };

