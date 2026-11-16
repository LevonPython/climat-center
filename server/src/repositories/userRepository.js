const { pool } = require('./crudRepository');

const userRepository = {
  async findWithPasswordHash(id, db = pool) {
    const result = await db.query('SELECT id, username, role, password_hash FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async setPasswordHash(id, passwordHash, db = pool) {
    const result = await db.query(
      'UPDATE users SET password_hash = $2 WHERE id = $1 RETURNING id, username, role, password_hash',
      [id, passwordHash]
    );
    return result.rows[0] || null;
  }
};

module.exports = { userRepository };
