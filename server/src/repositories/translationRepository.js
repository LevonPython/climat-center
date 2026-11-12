const { localizedColumns } = require('../services/localization');
const { pool } = require('./crudRepository');

const VALUE_COLUMNS = localizedColumns('value');

const translationRepository = {
  async list(db = pool) {
    const result = await db.query('SELECT * FROM ui_translations ORDER BY key');
    return result.rows;
  },

  async upsert({ key, ...values }, db = pool) {
    const placeholders = VALUE_COLUMNS.map((_, index) => `$${index + 2}`);
    const updates = VALUE_COLUMNS.map((column) => `${column} = EXCLUDED.${column}`);
    const result = await db.query(
      `
      INSERT INTO ui_translations (key, ${VALUE_COLUMNS.join(', ')})
      VALUES ($1, ${placeholders.join(', ')})
      ON CONFLICT (key) DO UPDATE
      SET ${updates.join(', ')}
      RETURNING *
    `,
      [key, ...VALUE_COLUMNS.map((column) => values[column] ?? null)]
    );
    return result.rows[0];
  },

  async removeByKey(key, db = pool) {
    const result = await db.query('DELETE FROM ui_translations WHERE key = $1 RETURNING *', [key]);
    return result.rows[0] || null;
  }
};

module.exports = { translationRepository };
