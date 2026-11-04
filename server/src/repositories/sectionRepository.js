const { createCrudRepository, pool } = require('./crudRepository');

const sectionRepository = {
  ...createCrudRepository({
    table: 'content_blocks',
    columns: ['page_id', 'block_type', 'sort_order', 'is_visible', 'content_json'],
    orderBy: 'sort_order, created_at'
  }),

  async listForPage(pageId, { visibleOnly = false } = {}, db = pool) {
    const result = await db.query(
      `
      SELECT * FROM content_blocks
      WHERE page_id = $1 ${visibleOnly ? 'AND is_visible = TRUE' : ''}
      ORDER BY sort_order, created_at
    `,
      [pageId]
    );
    return result.rows;
  },

  async nextSortOrder(pageId, db = pool) {
    const result = await db.query(
      'SELECT COALESCE(MAX(sort_order) + 1, 0)::int AS next FROM content_blocks WHERE page_id = $1',
      [pageId]
    );
    return result.rows[0].next;
  },

  async insertVersion(blockId, userId, contentJson, db = pool) {
    await db.query('INSERT INTO content_block_versions (content_block_id, updated_by, content_json) VALUES ($1, $2, $3)', [
      blockId,
      userId,
      contentJson
    ]);
  },

  async listVersions(blockId, db = pool) {
    const result = await db.query(
      `
      SELECT v.id, v.content_block_id, v.updated_by, u.username AS updated_by_username, v.content_json, v.created_at
      FROM content_block_versions v
      LEFT JOIN users u ON u.id = v.updated_by
      WHERE v.content_block_id = $1
      ORDER BY v.created_at DESC
      LIMIT 50
    `,
      [blockId]
    );
    return result.rows;
  },

  async listSiteBlocks(db = pool) {
    const result = await db.query("SELECT section_name, content_json FROM content_blocks WHERE page_name = 'global'");
    return result.rows;
  }
};

module.exports = { sectionRepository };
