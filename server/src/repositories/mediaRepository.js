const { createCrudRepository, pool } = require('./crudRepository');

const mediaRepository = {
  ...createCrudRepository({
    table: 'media_assets',
    columns: ['url', 'filename', 'mime_type', 'size_bytes', 'kind', 'alt_ru', 'alt_en', 'alt_hy', 'uploaded_by'],
    orderBy: 'created_at DESC'
  }),

  async listPage({ kind, limit, offset }, db = pool) {
    const result = await db.query(
      `
      SELECT * FROM media_assets
      WHERE ($1::text IS NULL OR kind = $1)
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [kind || null, limit, offset]
    );
    return result.rows;
  },

  async countUsages(asset, db = pool) {
    const result = await db.query(
      `
      SELECT
        (SELECT COUNT(*) FROM gallery_items WHERE media_id = $1)::int AS galleries,
        (SELECT COUNT(*) FROM services WHERE image_url = $2)::int AS services,
        (SELECT COUNT(*) FROM content_blocks WHERE position($2 in content_json::text) > 0)::int AS content
    `,
      [asset.id, asset.url]
    );
    return result.rows[0];
  },

  // A replaced file changes URL, so every saved reference moves with it.
  async replaceUrlReferences(oldUrl, newUrl, db = pool) {
    await db.query('UPDATE services SET image_url = $2 WHERE image_url = $1', [oldUrl, newUrl]);
    // Plain text replace so links inside rich text move too, and old versions stay restorable.
    for (const table of ['content_blocks', 'content_block_versions']) {
      await db.query(
        `UPDATE ${table} SET content_json = replace(content_json::text, $1, $2)::jsonb WHERE position($1 in content_json::text) > 0`,
        [oldUrl, newUrl]
      );
    }
  }
};

module.exports = { mediaRepository };
