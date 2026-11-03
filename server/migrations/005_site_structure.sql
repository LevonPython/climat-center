-- 005_site_structure.sql
-- Pages, navigation, media and interface text for the rebuilt site.
-- Additive: the current site keeps working until the switch-over.

CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('home', 'service', 'fault', 'listing', 'article', 'city', 'gallery', 'static')),
  parent_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'hidden' CHECK (status IN ('published', 'hidden')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  title_ru TEXT,
  title_en TEXT,
  title_hy TEXT,
  meta_title_ru TEXT,
  meta_title_en TEXT,
  meta_title_hy TEXT,
  meta_description_ru TEXT,
  meta_description_en TEXT,
  meta_description_hy TEXT,
  needs_review_ru BOOLEAN NOT NULL DEFAULT FALSE,
  needs_review_en BOOLEAN NOT NULL DEFAULT FALSE,
  needs_review_hy BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_type_status ON pages(type, status);

DROP TRIGGER IF EXISTS trg_pages_updated_at ON pages;
CREATE TRIGGER trg_pages_updated_at
BEFORE UPDATE ON pages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Sections of a page reuse content_blocks, so version history carries over.
-- Site-wide blocks keep page_name and section_name; page sections use page_id.
ALTER TABLE content_blocks ALTER COLUMN page_name DROP NOT NULL;
ALTER TABLE content_blocks ALTER COLUMN section_name DROP NOT NULL;
ALTER TABLE content_blocks ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES pages(id) ON DELETE CASCADE;
ALTER TABLE content_blocks ADD COLUMN IF NOT EXISTS block_type TEXT;
ALTER TABLE content_blocks ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE content_blocks ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE content_blocks ADD CONSTRAINT content_blocks_owner_check
  CHECK ((page_id IS NOT NULL AND block_type IS NOT NULL) OR (page_id IS NULL AND page_name IS NOT NULL AND section_name IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_content_blocks_page_order ON content_blocks(page_id, sort_order);

ALTER TABLE services ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES pages(id) ON DELETE SET NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'service' CHECK (category IN ('service', 'fault'));
ALTER TABLE services ADD COLUMN IF NOT EXISTS menu_title_ru TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS menu_title_en TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS menu_title_hy TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS pill_title_ru TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS pill_title_en TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS pill_title_hy TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS show_in_menu BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS show_in_pills BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_services_page ON services(page_id);
CREATE INDEX IF NOT EXISTS idx_services_category_order ON services(category, sort_order);

CREATE TABLE IF NOT EXISTS nav_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL CHECK (location IN ('topbar', 'header', 'footer', 'mobile', 'cities')),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  url TEXT,
  label_ru TEXT,
  label_en TEXT,
  label_hy TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nav_items_target_check CHECK (page_id IS NOT NULL OR url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_nav_items_location_order ON nav_items(location, sort_order);
CREATE INDEX IF NOT EXISTS idx_nav_items_page ON nav_items(page_id);

DROP TRIGGER IF EXISTS trg_nav_items_updated_at ON nav_items;
CREATE TRIGGER trg_nav_items_updated_at
BEFORE UPDATE ON nav_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'document')),
  alt_ru TEXT,
  alt_en TEXT,
  alt_hy TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_kind_created ON media_assets(kind, created_at);
CREATE INDEX IF NOT EXISTS idx_media_assets_uploaded_by ON media_assets(uploaded_by);

DROP TRIGGER IF EXISTS trg_media_assets_updated_at ON media_assets;
CREATE TRIGGER trg_media_assets_updated_at
BEFORE UPDATE ON media_assets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection TEXT NOT NULL CHECK (collection IN ('brands', 'certificates', 'works')),
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  title_ru TEXT,
  title_en TEXT,
  title_hy TEXT,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_items_collection_order ON gallery_items(collection, sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_items_media ON gallery_items(media_id);

DROP TRIGGER IF EXISTS trg_gallery_items_updated_at ON gallery_items;
CREATE TRIGGER trg_gallery_items_updated_at
BEFORE UPDATE ON gallery_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Admin overrides of interface text; the JSON files stay as the fallback.
CREATE TABLE IF NOT EXISTS ui_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value_ru TEXT,
  value_en TEXT,
  value_hy TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_ui_translations_updated_at ON ui_translations;
CREATE TRIGGER trg_ui_translations_updated_at
BEFORE UPDATE ON ui_translations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS work_types TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_page TEXT;
