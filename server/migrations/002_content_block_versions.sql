-- 002_content_block_versions.sql
-- Keep a history row for every content block update.

CREATE TABLE IF NOT EXISTS content_block_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_block_id UUID NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_block_versions_block_created_at
ON content_block_versions(content_block_id, created_at DESC);

