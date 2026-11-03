const { pool } = require('./crudRepository');

const translationRepository = {
  async list(db = pool) {
    const result = await db.query('SELECT * FROM ui_translations ORDER BY key');
    return result.rows;
  },

  async upsert({ key, value_ru, value_en, value_hy }, db = pool) {
    const result = await db.query(
      `
      INSERT INTO ui_translations (key, value_ru, value_en, value_hy)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (key) DO UPDATE
      SET value_ru = EXCLUDED.value_ru, value_en = EXCLUDED.value_en, value_hy = EXCLUDED.value_hy
      RETURNING *
    `,
      [key, value_ru ?? null, value_en ?? null, value_hy ?? null]
    );
    return result.rows[0];
  },

  async removeByKey(key, db = pool) {
    const result = await db.query('DELETE FROM ui_translations WHERE key = $1 RETURNING *', [key]);
    return result.rows[0] || null;
  }
};

module.exports = { translationRepository };
