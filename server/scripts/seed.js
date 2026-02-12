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
        ('home', 'contacts', '{"phone":"+7 (495) 182-83-84","email":"mail@climatecentr.ru"}'::jsonb),
        ('global', 'contacts', '{"phone":"+7 (495) 182-83-84","email":"mail@climatecentr.ru","hours_ru":"Круглосуточно, без выходных","hours_en":"Daily, 24/7","hours_am":"Ամեն օր, 24/7","address_ru":"г. Москва, ул. Академика Анохина, 6 корп.1","address_en":"Moscow, Akademika Anokhina, 6 bld.1","address_am":"Մոսկվա, Ակադեմիկոս Անոխինա, 6 շ.1"}'::jsonb),
        ('global', 'social', '{"whatsapp_url":"https://wa.me/74951828384","telegram_url":"https://t.me/your_handle","facebook_url":"https://facebook.com/your_page","instagram_url":"https://instagram.com/your_profile"}'::jsonb),
        ('about', 'page', '{
          "title_ru":"О компании",
          "title_en":"About us",
          "title_am":"Մեր մասին",
          "subtitle_ru":"Сервис, которому можно доверять: аккуратная работа, понятные рекомендации и гарантия.",
          "subtitle_en":"Service you can rely on — clear recommendations, tidy work, and warranty.",
          "subtitle_am":"Հուսալի սպասարկում՝ պարզ խորհուրդներով, մաքուր աշխատանքով և երաշխիքով։",
          "section1Title_ru":"Опыт",
          "section1Title_en":"Experience",
          "section1Title_am":"Փորձ",
          "section1Body_ru":"Устанавливаем, ремонтируем и обслуживаем кондиционеры и сплит‑системы для квартир, офисов и коммерческих помещений.",
          "section1Body_en":"We install, repair, and service air conditioners for apartments, offices, and commercial spaces.",
          "section1Body_am":"Տեղադրում, վերանորոգում և սպասարկում ենք օդորակիչներ բնակարանների, գրասենյակների և կոմերցիոն տարածքների համար։",
          "section2Title_ru":"Подход",
          "section2Title_en":"Approach",
          "section2Title_am":"Մոտեցում",
          "section2Body_ru":"Начинаем с диагностики, предлагаем оптимальное решение и объясняем, что и почему будем делать.",
          "section2Body_en":"We start with diagnostics, recommend the right solution, and clearly explain the scope of work.",
          "section2Body_am":"Սկսում ենք ախտորոշումից, առաջարկում ճիշտ լուծում և պարզ ձևով բացատրում աշխատանքի ծավալը։",
          "section3Title_ru":"Качество и гарантия",
          "section3Title_en":"Quality & warranty",
          "section3Title_am":"Որակ և երաշխիք",
          "section3Body_ru":"Используем профессиональный инструмент и расходные материалы. Условия гарантии заранее согласуются.",
          "section3Body_en":"We use professional tools and consumables. Warranty terms are agreed in advance.",
          "section3Body_am":"Օգտագործում ենք պրոֆեսիոնալ գործիքներ և նյութեր։ Երաշխիքի պայմանները նախապես համաձայնեցվում են։",
          "factsTitle_ru":"Коротко о нас",
          "factsTitle_en":"Quick facts",
          "factsTitle_am":"Կարճ փաստեր",
          "fact1Title_ru":"Выезд быстро",
          "fact1Title_en":"Fast arrival",
          "fact1Title_am":"Արագ այց",
          "fact1Desc_ru":"Во многих районах мастер может приехать в течение 2 часов.",
          "fact1Desc_en":"In many areas a technician can arrive within 2 hours.",
          "fact1Desc_am":"Շատ շրջաններում վարպետը կարող է հասնել 2 ժամում։",
          "fact2Title_ru":"Понятно и честно",
          "fact2Title_en":"Transparent service",
          "fact2Title_am":"Թափանցիկ աշխատանք",
          "fact2Desc_ru":"Объясняем объём работ и даём прозрачные рекомендации.",
          "fact2Desc_en":"We explain the scope of work and provide clear recommendations.",
          "fact2Desc_am":"Բացատրում ենք աշխատանքի ծավալը և առաջարկները։",
          "fact3Title_ru":"Гарантия",
          "fact3Title_en":"Warranty",
          "fact3Title_am":"Երաշխիք",
          "fact3Desc_ru":"Гарантия на работы и запчасти — по договору.",
          "fact3Desc_en":"Warranty for work and parts according to agreement.",
          "fact3Desc_am":"Երաշխիք՝ աշխատանքների և մասերի համար՝ ըստ պայմանագրի։",
          "ctaTitle_ru":"Нужна помощь сейчас?",
          "ctaTitle_en":"Need help right now?",
          "ctaTitle_am":"Պետք է օգնություն հիմա՞",
          "ctaSubtitle_ru":"Позвоните нам или откройте страницу контактов — там все способы связи.",
          "ctaSubtitle_en":"Call us or open the contacts page for all options.",
          "ctaSubtitle_am":"Զանգահարեք կամ բացեք կոնտակտների էջը՝ բոլոր տարբերակների համար։",
          "call_ru":"Позвонить",
          "call_en":"Call",
          "call_am":"Զանգահարել",
          "contacts_ru":"Контакты",
          "contacts_en":"Contacts",
          "contacts_am":"Կոնտակտներ"
        }'::jsonb),
        ('contacts', 'page', '{
          "title_ru":"Контакты",
          "title_en":"Contacts",
          "title_am":"Կոնտակտներ",
          "subtitle_ru":"Выберите удобный способ связи — телефон, почта или мессенджер.",
          "subtitle_en":"Choose a convenient way to reach us — phone, email, or messenger.",
          "subtitle_am":"Ընտրեք հարմար կապի միջոց՝ հեռախոս, էլ. փոստ կամ մեսենջեր։",
          "socialTitle_ru":"Соцсети / мессенджеры",
          "socialTitle_en":"Social / messengers",
          "socialTitle_am":"Սոցցանցեր / մեսենջերներ",
          "socialSubtitle_ru":"Напишите нам в мессенджер или в соцсетях.",
          "socialSubtitle_en":"Write to us in a messenger or on social networks.",
          "socialSubtitle_am":"Գրեք մեզ մեսենջերում կամ սոցցանցերում։"
        }'::jsonb)
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
