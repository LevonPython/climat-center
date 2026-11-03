const { query } = require('../config/db');

const pool = { query };

// Column names only ever come from the lists below, never from user input.
function createCrudRepository({ table, columns, orderBy }) {
  const writable = new Set(columns);

  function pickColumns(values) {
    return Object.entries(values).filter(([key, value]) => writable.has(key) && value !== undefined);
  }

  return {
    async list(filters = {}, db = pool) {
      const entries = pickColumns(filters);
      const where = entries.map(([key], index) => `${key} = $${index + 1}`);
      const result = await db.query(
        `SELECT * FROM ${table} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${orderBy}`,
        entries.map(([, value]) => value)
      );
      return result.rows;
    },

    async findById(id, db = pool) {
      const result = await db.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      return result.rows[0] || null;
    },

    async insert(values, db = pool) {
      const entries = pickColumns(values);
      const names = entries.map(([key]) => key).join(', ');
      const placeholders = entries.map((_, index) => `$${index + 1}`).join(', ');
      const result = await db.query(
        `INSERT INTO ${table} (${names}) VALUES (${placeholders}) RETURNING *`,
        entries.map(([, value]) => value)
      );
      return result.rows[0];
    },

    async update(id, values, db = pool) {
      const entries = pickColumns(values);
      if (entries.length === 0) return this.findById(id, db);
      const sets = entries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
      const result = await db.query(`UPDATE ${table} SET ${sets} WHERE id = $${entries.length + 1} RETURNING *`, [
        ...entries.map(([, value]) => value),
        id
      ]);
      return result.rows[0] || null;
    },

    async remove(id, db = pool) {
      const result = await db.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id]);
      return result.rows[0] || null;
    },

    async reorder(ids, db = pool) {
      const result = await db.query(
        `
        UPDATE ${table} AS t
        SET sort_order = o.position
        FROM unnest($1::uuid[]) WITH ORDINALITY AS o(id, position)
        WHERE t.id = o.id
      `,
        [ids]
      );
      return result.rowCount;
    }
  };
}

module.exports = { createCrudRepository, pool };
