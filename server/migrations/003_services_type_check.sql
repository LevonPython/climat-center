-- 003_services_type_check.sql
-- Normalize services.type and enforce allowed values.

BEGIN;

-- Normalize existing rows (admin could have typed anything).
UPDATE services
SET type = lower(trim(type))
WHERE type IS NOT NULL;

-- Best-effort mapping for common synonyms.
UPDATE services
SET type = 'install'
WHERE type IN ('installation', 'installations');

UPDATE services
SET type = 'service'
WHERE type IN ('clean', 'cleaning', 'maintenance', 'servicing');

-- Abort migration if any unknown types remain.
DO $$
DECLARE
  bad_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM services
  WHERE type NOT IN ('install', 'repair', 'service');

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'services.type has % invalid values; update them before applying constraint', bad_count;
  END IF;
END $$;

-- Add constraint once.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_type_check') THEN
    ALTER TABLE services
    ADD CONSTRAINT services_type_check CHECK (type IN ('install', 'repair', 'service'));
  END IF;
END $$;

COMMIT;

