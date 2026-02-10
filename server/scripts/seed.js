const path = require('path');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

// Load env from server/.env for scripts
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin12345';

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await client.query(
      `
      INSERT INTO users (username, password_hash, role)
      VALUES ($1, $2, 'admin')
      ON CONFLICT (username) DO NOTHING
    `,
      [adminUsername, passwordHash]
    );

    // Minimal services seed (3 languages). Adjust later to match https://climatecentr.ru/
    const servicesCountRes = await client.query('SELECT COUNT(*)::int AS count FROM services');
    if ((servicesCountRes.rows[0]?.count ?? 0) === 0) {
      await client.query(
        `
        INSERT INTO services (type, title_en, title_ru, title_am, description_en, description_ru, description_am, price, image_url, is_active)
        VALUES
          ('install', 'Air conditioner installation', 'Установка кондиционеров', 'Օդորակիչների տեղադրում', NULL, NULL, NULL, NULL, NULL, TRUE),
          ('repair', 'Air conditioner repair', 'Ремонт кондиционеров', 'Օդորակիչների վերանորոգում', NULL, NULL, NULL, NULL, NULL, TRUE),
          ('service', 'Air conditioner cleaning', 'Чистка кондиционеров', 'Օդորակիչների մաքրում', NULL, NULL, NULL, NULL, NULL, TRUE)
      `
      );
    }

    // Basic content blocks
    await client.query(
      `
      INSERT INTO content_blocks (page_name, section_name, content_json)
      VALUES
        ('home', 'hero', '{"title_ru":"ЦЕНТР КЛИМАТА","subtitle_ru":"Обслуживание кондиционеров и сплит-систем","cta_ru":"Оставьте заявку онлайн"}'::jsonb),
        ('home', 'contacts', '{"phone":"+7 (495) 182-83-84","email":"mail@climatecentr.ru"}'::jsonb)
      ON CONFLICT (page_name, section_name) DO NOTHING
    `
    );

    await client.query('COMMIT');
    console.log('Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
