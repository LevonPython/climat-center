-- 004_rename_am_locale_to_hy.sql
-- Armenian's language code is hy; am means Amharic.

ALTER TABLE services RENAME COLUMN title_am TO title_hy;
ALTER TABLE services RENAME COLUMN description_am TO description_hy;

UPDATE content_blocks
SET content_json = (
  SELECT jsonb_object_agg(regexp_replace(key, '_am$', '_hy'), value)
  FROM jsonb_each(content_json)
)
WHERE EXISTS (SELECT 1 FROM jsonb_object_keys(content_json) AS k WHERE k LIKE '%\_am');

-- Keep older versions restorable.
UPDATE content_block_versions
SET content_json = (
  SELECT jsonb_object_agg(regexp_replace(key, '_am$', '_hy'), value)
  FROM jsonb_each(content_json)
)
WHERE EXISTS (SELECT 1 FROM jsonb_object_keys(content_json) AS k WHERE k LIKE '%\_am');
