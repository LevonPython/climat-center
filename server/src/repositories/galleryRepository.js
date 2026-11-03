const { createCrudRepository, pool } = require('./crudRepository');

const galleryRepository = {
  ...createCrudRepository({
    table: 'gallery_items',
    columns: ['collection', 'media_id', 'title_ru', 'title_en', 'title_hy', 'link_url', 'sort_order', 'is_visible'],
    orderBy: 'collection, sort_order, created_at'
  }),

  async listWithMedia({ collection, visibleOnly = false }, db = pool) {
    const result = await db.query(
      `
      SELECT g.*, m.url, m.mime_type, m.alt_ru, m.alt_en, m.alt_hy
      FROM gallery_items g
      JOIN media_assets m ON m.id = g.media_id
      WHERE ($1::text IS NULL OR g.collection = $1) ${visibleOnly ? 'AND g.is_visible = TRUE' : ''}
      ORDER BY g.collection, g.sort_order, g.created_at
    `,
      [collection || null]
    );
    return result.rows;
  },

  async nextSortOrder(collection, db = pool) {
    const result = await db.query(
      'SELECT COALESCE(MAX(sort_order) + 1, 0)::int AS next FROM gallery_items WHERE collection = $1',
      [collection]
    );
    return result.rows[0].next;
  }
};

module.exports = { galleryRepository };
