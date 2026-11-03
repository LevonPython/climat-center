const { pool } = require('./crudRepository');

const serviceRepository = {
  async listActiveWithPages(db = pool) {
    const result = await db.query(`
      SELECT s.*, p.slug AS page_slug
      FROM services s
      LEFT JOIN pages p ON p.id = s.page_id
      WHERE s.is_active = TRUE AND (s.page_id IS NULL OR p.status = 'published')
      ORDER BY s.category, s.sort_order, s.created_at
    `);
    return result.rows;
  },

  async reorder(ids, db = pool) {
    const result = await db.query(
      `
      UPDATE services AS s
      SET sort_order = o.position
      FROM unnest($1::uuid[]) WITH ORDINALITY AS o(id, position)
      WHERE s.id = o.id
    `,
      [ids]
    );
    return result.rowCount;
  }
};

module.exports = { serviceRepository };
