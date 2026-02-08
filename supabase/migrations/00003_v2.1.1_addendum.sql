-- ============================================================================
-- PRIMELINE NIL Agency Platform  -  v2.1.1  Addendum
-- ============================================================================
-- Safety-check migration: ensures the Live Receipt columns exist on
-- calculator_reports.  These columns should already be present from the
-- v2.1 migration (00002), but IF NOT EXISTS guards make this idempotent
-- and safe to re-run or apply against an existing database.
-- ============================================================================

BEGIN;

-- Ensure all Live Receipt columns exist
ALTER TABLE calculator_reports ADD COLUMN IF NOT EXISTS public_slug      TEXT;
ALTER TABLE calculator_reports ADD COLUMN IF NOT EXISTS og_image_url     TEXT;
ALTER TABLE calculator_reports ADD COLUMN IF NOT EXISTS report_data      JSONB DEFAULT '{}'::jsonb;
ALTER TABLE calculator_reports ADD COLUMN IF NOT EXISTS delivery_status  TEXT DEFAULT 'pending';
ALTER TABLE calculator_reports ADD COLUMN IF NOT EXISTS error_message    TEXT;

-- Ensure unique index on public_slug (partial -- only non-null slugs)
CREATE UNIQUE INDEX IF NOT EXISTS uq_calculator_reports_slug
  ON calculator_reports (public_slug)
  WHERE public_slug IS NOT NULL;

COMMIT;
