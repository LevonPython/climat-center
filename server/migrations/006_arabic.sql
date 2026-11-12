-- 006_arabic.sql
-- Arabic next to Russian, English and Armenian. Additive and nullable, so it is safe to apply before the code ships.
-- Section and site block text lives in content_json and needs no column.

ALTER TABLE pages ADD COLUMN IF NOT EXISTS title_ar TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS meta_title_ar TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS meta_description_ar TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS needs_review_ar BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE services ADD COLUMN IF NOT EXISTS title_ar TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS menu_title_ar TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS pill_title_ar TEXT;

ALTER TABLE nav_items ADD COLUMN IF NOT EXISTS label_ar TEXT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS alt_ar TEXT;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS title_ar TEXT;
ALTER TABLE ui_translations ADD COLUMN IF NOT EXISTS value_ar TEXT;
