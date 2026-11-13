const { localizedColumns } = require('../services/localization');
const { createCrudRepository, pool } = require('./crudRepository');

const navRepository = {
  ...createCrudRepository({
    table: 'nav_items',
    columns: ['location', 'page_id', 'url', ...localizedColumns('label'), 'sort_order', 'is_visible'],
    orderBy: 'location, sort_order, created_at'
  }),

  async listVisibleWithPages(db = pool) {
    const result = await db.query(`
      SELECT n.*, p.slug AS page_slug
      FROM nav_items n
      LEFT JOIN pages p ON p.id = n.page_id
      WHERE n.is_visible = TRUE AND (n.page_id IS NULL OR p.status = 'published')
      ORDER BY n.location, n.sort_order, n.created_at
    `);
    return result.rows;
  }
};

module.exports = { navRepository };
