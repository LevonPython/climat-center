const { createCrudRepository, pool } = require('./crudRepository');

const PAGE_COLUMNS = [
  'slug', 'type', 'parent_id', 'status', 'sort_order',
  'title_ru', 'title_en', 'title_hy',
  'meta_title_ru', 'meta_title_en', 'meta_title_hy',
  'meta_description_ru', 'meta_description_en', 'meta_description_hy',
  'needs_review_ru', 'needs_review_en', 'needs_review_hy'
];

const pageRepository = {
  ...createCrudRepository({ table: 'pages', columns: PAGE_COLUMNS, orderBy: 'sort_order, slug' }),

  async findBySlug(slug, db = pool) {
    const result = await db.query('SELECT * FROM pages WHERE slug = $1', [slug]);
    return result.rows[0] || null;
  },

  async listPublishedSlugs(db = pool) {
    const result = await db.query(
      "SELECT slug, type, updated_at FROM pages WHERE status = 'published' ORDER BY sort_order, slug"
    );
    return result.rows;
  },

  // Nearest parent first. The depth limit also stops any cycle.
  async findAncestors(id, db = pool) {
    const result = await db.query(
      `
      WITH RECURSIVE ancestors AS (
        SELECT p.*, 1 AS depth FROM pages p
        WHERE p.id = (SELECT parent_id FROM pages WHERE id = $1)
        UNION ALL
        SELECT p.*, a.depth + 1 FROM pages p
        JOIN ancestors a ON p.id = a.parent_id
        WHERE a.depth < 10
      )
      SELECT * FROM ancestors ORDER BY depth
    `,
      [id]
    );
    return result.rows;
  }
};

module.exports = { pageRepository };
