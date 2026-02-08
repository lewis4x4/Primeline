-- ============================================================================
-- PRIMELINE NIL Agency Platform  -  v1.3  Complete Bootstrap
-- ============================================================================
-- This migration creates the entire foundational schema: enums, tables,
-- functions, triggers, RLS policies, indexes, and seed data.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. ENUMS
-- --------------------------------------------------------------------------

CREATE TYPE platform_type AS ENUM (
  'instagram', 'tiktok', 'twitter', 'youtube', 'linkedin', 'twitch', 'other'
);

CREATE TYPE brand_status AS ENUM (
  'new', 'researching', 'contacted', 'active', 'paused', 'blacklisted'
);

CREATE TYPE budget_tier AS ENUM (
  'micro', 'mid', 'major'
);

CREATE TYPE match_status AS ENUM (
  'new', 'reviewed', 'approved', 'pursuing', 'converted', 'declined', 'expired'
);

CREATE TYPE deal_stage AS ENUM (
  'identified', 'outreach_sent', 'response_received', 'negotiating',
  'contract_sent', 'signed', 'active', 'completed', 'lost'
);

CREATE TYPE signal_type AS ENUM (
  'social_post', 'news_mention', 'job_posting', 'event_sponsorship',
  'campaign_launch', 'press_release', 'partnership', 'other'
);

CREATE TYPE outreach_status AS ENUM (
  'pending', 'sent', 'replied', 'no_response', 'bounced', 'opted_out'
);

CREATE TYPE outreach_channel AS ENUM (
  'email', 'linkedin', 'instagram_dm', 'twitter_dm', 'phone', 'other'
);

CREATE TYPE sprint_phase AS ENUM (
  'discovery', 'audit', 'execution', 'review'
);

CREATE TYPE athlete_status AS ENUM (
  'active', 'paused', 'archived', 'prospect'
);


-- --------------------------------------------------------------------------
-- 2. TABLES
-- --------------------------------------------------------------------------

-- 2.1  user_profiles
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'team',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2  athletes
CREATE TABLE athletes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  school          TEXT,
  sport           TEXT,
  conference      TEXT,
  class_year      TEXT,
  bio             TEXT,
  headshot_url    TEXT,
  composite_score NUMERIC(5,2) DEFAULT 0,
  status          athlete_status NOT NULL DEFAULT 'active',
  sprint_phase    sprint_phase NOT NULL DEFAULT 'discovery',
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- 2.3  athlete_social_profiles
CREATE TABLE athlete_social_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id      UUID NOT NULL REFERENCES athletes ON DELETE CASCADE,
  platform        platform_type NOT NULL,
  handle          TEXT NOT NULL,
  followers       INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2),
  last_updated    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, platform)
);

-- 2.4  brands
CREATE TABLE brands (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  domain              TEXT,
  website             TEXT,
  logo_url            TEXT,
  category            TEXT[] DEFAULT '{}',
  budget_tier         budget_tier,
  status              brand_status NOT NULL DEFAULT 'new',
  signal_count        INTEGER NOT NULL DEFAULT 0,
  last_signal_date    TIMESTAMPTZ,
  profile_confidence  NUMERIC(3,2) DEFAULT 0,
  assigned_to         UUID REFERENCES user_profiles,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

-- 2.5  brand_watchlist
CREATE TABLE brand_watchlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID NOT NULL REFERENCES brands,
  added_by   UUID REFERENCES user_profiles,
  reason     TEXT,
  priority   INTEGER NOT NULL DEFAULT 5,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6  brand_aliases
CREATE TABLE brand_aliases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID NOT NULL REFERENCES brands ON DELETE CASCADE,
  alias_type  TEXT NOT NULL CHECK (alias_type IN ('name', 'handle', 'domain')),
  alias_value TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alias_type, alias_value)
);

-- 2.7  brand_contacts
CREATE TABLE brand_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID NOT NULL REFERENCES brands ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  title       TEXT,
  email       TEXT,
  phone       TEXT,
  department  TEXT,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  confidence  NUMERIC(3,2) DEFAULT 0,
  source      TEXT,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one primary contact per brand
CREATE UNIQUE INDEX uq_brand_contacts_one_primary
  ON brand_contacts (brand_id)
  WHERE is_primary = true;

-- Case-insensitive email uniqueness per brand
CREATE UNIQUE INDEX uq_brand_contacts_email
  ON brand_contacts (brand_id, LOWER(email))
  WHERE email IS NOT NULL;

-- 2.8  contact_verifications
CREATE TABLE contact_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL REFERENCES brand_contacts ON DELETE CASCADE,
  method      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  result      JSONB,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.9  brand_signals
CREATE TABLE brand_signals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            UUID NOT NULL REFERENCES brands ON DELETE CASCADE,
  signal_type         signal_type NOT NULL,
  platform            platform_type,
  source_url          TEXT,
  raw_data            JSONB DEFAULT '{}',
  detected_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  signal_fingerprint  TEXT NOT NULL,
  processed           BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deduplicate signals per brand + type + fingerprint + calendar day
CREATE UNIQUE INDEX uq_brand_signals_fingerprint
  ON brand_signals (brand_id, signal_type, signal_fingerprint, (timezone('UTC', detected_at)::date));

-- 2.10  scrape_runs
CREATE TABLE scrape_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'running',
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ,
  records_found     INTEGER NOT NULL DEFAULT 0,
  records_ingested  INTEGER NOT NULL DEFAULT 0,
  errors            INTEGER NOT NULL DEFAULT 0,
  metadata          JSONB DEFAULT '{}'
);

-- 2.11  scrape_errors
CREATE TABLE scrape_errors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrape_run_id UUID REFERENCES scrape_runs ON DELETE CASCADE,
  error_type    TEXT NOT NULL,
  message       TEXT,
  details       JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.12  scrape_source_config
CREATE TABLE scrape_source_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL UNIQUE,
  platform    platform_type,
  config      JSONB DEFAULT '{}',
  enabled     BOOLEAN NOT NULL DEFAULT true,
  schedule    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.13  matches
CREATE TABLE matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id      UUID NOT NULL REFERENCES athletes,
  brand_id        UUID NOT NULL REFERENCES brands,
  match_score     NUMERIC(5,2) DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  confidence      INTEGER DEFAULT 0,
  status          match_status NOT NULL DEFAULT 'new',
  expires_at      TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES user_profiles,
  reviewed_at     TIMESTAMPTZ,
  decline_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, brand_id)
);

-- 2.14  deals
CREATE TABLE deals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id        UUID NOT NULL REFERENCES athletes,
  brand_id          UUID NOT NULL REFERENCES brands,
  match_id          UUID REFERENCES matches,
  deal_value        NUMERIC(12,2),
  commission_rate   NUMERIC(5,4) DEFAULT 0.15,
  commission_amount NUMERIC(12,2),
  stage             deal_stage NOT NULL DEFAULT 'identified',
  platform          platform_type,
  usage_rights      TEXT,
  exclusivity       TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at         TIMESTAMPTZ,
  notes             TEXT,
  assigned_to       UUID REFERENCES user_profiles,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.15  compliance_checks
CREATE TABLE compliance_checks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id     UUID NOT NULL REFERENCES deals ON DELETE CASCADE,
  check_type  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  details     JSONB DEFAULT '{}',
  checked_by  UUID REFERENCES user_profiles,
  checked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.16  outreach_sequences
CREATE TABLE outreach_sequences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  steps_count INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.17  outreach_steps
CREATE TABLE outreach_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES outreach_sequences ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  channel     outreach_channel NOT NULL,
  template    TEXT NOT NULL,
  delay_days  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.18  outreach_attempts
CREATE TABLE outreach_attempts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          UUID REFERENCES matches,
  brand_contact_id  UUID REFERENCES brand_contacts,
  sequence_id       UUID REFERENCES outreach_sequences,
  current_step      INTEGER NOT NULL DEFAULT 1,
  status            outreach_status NOT NULL DEFAULT 'pending',
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_followup_at  TIMESTAMPTZ,
  no_contact_reason TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.19  outreach_messages
CREATE TABLE outreach_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id        UUID NOT NULL REFERENCES outreach_attempts ON DELETE CASCADE,
  step_id           UUID REFERENCES outreach_steps,
  channel           outreach_channel NOT NULL,
  rendered_content  TEXT NOT NULL,
  sent_at           TIMESTAMPTZ,
  response_received BOOLEAN NOT NULL DEFAULT false,
  response_at       TIMESTAMPTZ,
  response_content  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.20  daily_digests
CREATE TABLE daily_digests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_date DATE NOT NULL UNIQUE,
  content     JSONB DEFAULT '{}',
  sent_at     TIMESTAMPTZ,
  sent_via    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.21  notification_log
CREATE TABLE notification_log (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type      TEXT NOT NULL,
  recipient TEXT,
  channel   TEXT,
  content   TEXT,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  status    TEXT DEFAULT 'sent',
  metadata  JSONB DEFAULT '{}'
);

-- 2.22  matching_engine_config
CREATE TABLE matching_engine_config (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key   TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description  TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   UUID REFERENCES user_profiles
);

-- 2.23  audit_log
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name   TEXT NOT NULL,
  record_id    UUID,
  action       TEXT NOT NULL,
  old_data     JSONB,
  new_data     JSONB,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- --------------------------------------------------------------------------
-- 3. FUNCTIONS & TRIGGERS
-- --------------------------------------------------------------------------

-- 3.1  Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_athletes_updated_at
  BEFORE UPDATE ON athletes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_athlete_social_profiles_updated_at
  BEFORE UPDATE ON athlete_social_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_brand_contacts_updated_at
  BEFORE UPDATE ON brand_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_scrape_source_config_updated_at
  BEFORE UPDATE ON scrape_source_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_outreach_attempts_updated_at
  BEFORE UPDATE ON outreach_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_outreach_sequences_updated_at
  BEFORE UPDATE ON outreach_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3.2  Prevent mutation of audit_log rows
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log rows are immutable -- UPDATE and DELETE are forbidden';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- 3.3  Expire stale matches
CREATE OR REPLACE FUNCTION expire_stale_matches()
RETURNS void AS $$
BEGIN
  UPDATE matches
     SET status = 'expired',
         updated_at = now()
   WHERE expires_at < now()
     AND status NOT IN ('approved', 'pursuing', 'converted', 'declined');
END;
$$ LANGUAGE plpgsql;

-- 3.4  Resolve (or create) a brand by name / domain / handle
CREATE OR REPLACE FUNCTION resolve_brand(
  p_name   TEXT,
  p_domain TEXT DEFAULT NULL,
  p_handle TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id UUID;
  v_name     TEXT;
BEGIN
  -- 1. Try exact domain match
  IF p_domain IS NOT NULL THEN
    SELECT id, brands.name INTO v_brand_id, v_name
      FROM brands
     WHERE LOWER(domain) = LOWER(p_domain)
       AND deleted_at IS NULL
     LIMIT 1;
    IF v_brand_id IS NOT NULL THEN
      RETURN json_build_object(
        'brand_id', v_brand_id,
        'name',     v_name,
        'is_new',   false,
        'confidence', 0.95
      );
    END IF;
  END IF;

  -- 2. Try exact handle match in brand_aliases
  IF p_handle IS NOT NULL THEN
    SELECT ba.brand_id, b.name INTO v_brand_id, v_name
      FROM brand_aliases ba
      JOIN brands b ON b.id = ba.brand_id AND b.deleted_at IS NULL
     WHERE ba.alias_type = 'handle'
       AND LOWER(ba.alias_value) = LOWER(p_handle)
     LIMIT 1;
    IF v_brand_id IS NOT NULL THEN
      RETURN json_build_object(
        'brand_id', v_brand_id,
        'name',     v_name,
        'is_new',   false,
        'confidence', 0.90
      );
    END IF;
  END IF;

  -- 3. Try any alias match
  IF p_name IS NOT NULL THEN
    SELECT ba.brand_id, b.name INTO v_brand_id, v_name
      FROM brand_aliases ba
      JOIN brands b ON b.id = ba.brand_id AND b.deleted_at IS NULL
     WHERE LOWER(ba.alias_value) = LOWER(p_name)
     LIMIT 1;
    IF v_brand_id IS NOT NULL THEN
      RETURN json_build_object(
        'brand_id', v_brand_id,
        'name',     v_name,
        'is_new',   false,
        'confidence', 0.80
      );
    END IF;
  END IF;

  -- 4. Try case-insensitive name match in brands table
  SELECT id, brands.name INTO v_brand_id, v_name
    FROM brands
   WHERE LOWER(name) = LOWER(p_name)
     AND deleted_at IS NULL
   LIMIT 1;
  IF v_brand_id IS NOT NULL THEN
    RETURN json_build_object(
      'brand_id', v_brand_id,
      'name',     v_name,
      'is_new',   false,
      'confidence', 0.85
    );
  END IF;

  -- 5. No match found -- create a new brand
  INSERT INTO brands (name, domain)
  VALUES (p_name, p_domain)
  RETURNING id, brands.name INTO v_brand_id, v_name;

  RETURN json_build_object(
    'brand_id', v_brand_id,
    'name',     v_name,
    'is_new',   true,
    'confidence', 1.0
  );
END;
$$;

-- 3.5  Helper: extract current athlete id from JWT for RLS
CREATE OR REPLACE FUNCTION current_athlete_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt()->'app_metadata'->>'athlete_id')::UUID;
$$;


-- --------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- --------------------------------------------------------------------------

-- Enable RLS on every table
ALTER TABLE user_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_watchlist         ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_aliases           ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_verifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_signals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_runs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_errors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_source_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sequences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_steps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_attempts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_digests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_engine_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log               ENABLE ROW LEVEL SECURITY;

-- ---- Helper: macro for standard team policies ----------------------------
-- We write them out explicitly per table so the policy names are clear.

-- user_profiles
CREATE POLICY "Team members can view all"   ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON user_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON user_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON user_profiles FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- athletes
CREATE POLICY "Team members can view all"   ON athletes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON athletes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON athletes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON athletes FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- athlete_social_profiles
CREATE POLICY "Team members can view all"   ON athlete_social_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON athlete_social_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON athlete_social_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON athlete_social_profiles FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- brands
CREATE POLICY "Team members can view all"   ON brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON brands FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON brands FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON brands FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- brand_watchlist
CREATE POLICY "Team members can view all"   ON brand_watchlist FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON brand_watchlist FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON brand_watchlist FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON brand_watchlist FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- brand_aliases
CREATE POLICY "Team members can view all"   ON brand_aliases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON brand_aliases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON brand_aliases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON brand_aliases FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- brand_contacts
CREATE POLICY "Team members can view all"   ON brand_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON brand_contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON brand_contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON brand_contacts FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- contact_verifications
CREATE POLICY "Team members can view all"   ON contact_verifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON contact_verifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON contact_verifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON contact_verifications FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- brand_signals
CREATE POLICY "Team members can view all"   ON brand_signals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON brand_signals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON brand_signals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON brand_signals FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- scrape_runs
CREATE POLICY "Team members can view all"   ON scrape_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON scrape_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON scrape_runs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON scrape_runs FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- scrape_errors
CREATE POLICY "Team members can view all"   ON scrape_errors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON scrape_errors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON scrape_errors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON scrape_errors FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- scrape_source_config
CREATE POLICY "Team members can view all"   ON scrape_source_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON scrape_source_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON scrape_source_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON scrape_source_config FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- matches
CREATE POLICY "Team members can view all"   ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON matches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON matches FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- deals
CREATE POLICY "Team members can view all"   ON deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON deals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON deals FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- compliance_checks
CREATE POLICY "Team members can view all"   ON compliance_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON compliance_checks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON compliance_checks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON compliance_checks FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- outreach_sequences
CREATE POLICY "Team members can view all"   ON outreach_sequences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON outreach_sequences FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON outreach_sequences FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON outreach_sequences FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- outreach_steps
CREATE POLICY "Team members can view all"   ON outreach_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON outreach_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON outreach_steps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON outreach_steps FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- outreach_attempts
CREATE POLICY "Team members can view all"   ON outreach_attempts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON outreach_attempts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON outreach_attempts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON outreach_attempts FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- outreach_messages
CREATE POLICY "Team members can view all"   ON outreach_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON outreach_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON outreach_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON outreach_messages FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- daily_digests
CREATE POLICY "Team members can view all"   ON daily_digests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON daily_digests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON daily_digests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON daily_digests FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- notification_log
CREATE POLICY "Team members can view all"   ON notification_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON notification_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON notification_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON notification_log FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- matching_engine_config
CREATE POLICY "Team members can view all"   ON matching_engine_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON matching_engine_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON matching_engine_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON matching_engine_config FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- audit_log  (immutable -- INSERT and SELECT only, no UPDATE/DELETE)
CREATE POLICY "Team members can view audit" ON audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert audit" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role full access"    ON audit_log FOR ALL    TO service_role  USING (true) WITH CHECK (true);


-- --------------------------------------------------------------------------
-- 5. INDEXES
-- --------------------------------------------------------------------------

-- athletes
CREATE INDEX idx_athletes_sport           ON athletes (sport);
CREATE INDEX idx_athletes_school          ON athletes (school);
CREATE INDEX idx_athletes_status          ON athletes (status);
CREATE INDEX idx_athletes_composite_score ON athletes (composite_score DESC);

-- brands
CREATE INDEX idx_brands_status       ON brands (status);
CREATE INDEX idx_brands_budget_tier  ON brands (budget_tier);
CREATE INDEX idx_brands_domain       ON brands (domain);
CREATE INDEX idx_brands_signal_count ON brands (signal_count DESC);

-- brand_signals
CREATE INDEX idx_brand_signals_brand_detected ON brand_signals (brand_id, detected_at DESC);
CREATE INDEX idx_brand_signals_type           ON brand_signals (signal_type);

-- matches
CREATE INDEX idx_matches_athlete_score ON matches (athlete_id, match_score DESC);
CREATE INDEX idx_matches_brand         ON matches (brand_id);
CREATE INDEX idx_matches_status        ON matches (status);
CREATE INDEX idx_matches_expires       ON matches (expires_at);

-- deals
CREATE INDEX idx_deals_athlete   ON deals (athlete_id);
CREATE INDEX idx_deals_brand     ON deals (brand_id);
CREATE INDEX idx_deals_stage     ON deals (stage);
CREATE INDEX idx_deals_closed_at ON deals (closed_at);

-- outreach_attempts
CREATE INDEX idx_outreach_attempts_followup
  ON outreach_attempts (next_followup_at)
  WHERE status NOT IN ('bounced', 'opted_out');


-- --------------------------------------------------------------------------
-- 6. SEED DATA  -  Matching Engine Defaults
-- --------------------------------------------------------------------------

INSERT INTO matching_engine_config (config_key, config_value, description) VALUES
  ('category_weight',     '0.25'::jsonb, 'Weight for brand-category affinity'),
  ('content_weight',      '0.10'::jsonb, 'Weight for content-style alignment'),
  ('platform_weight',     '0.15'::jsonb, 'Weight for platform overlap'),
  ('demo_weight',         '0.20'::jsonb, 'Weight for demographic / audience fit'),
  ('engagement_weight',   '0.10'::jsonb, 'Weight for engagement rate quality'),
  ('availability_weight', '0.10'::jsonb, 'Weight for athlete availability / exclusivity'),
  ('budget_weight',       '0.10'::jsonb, 'Weight for brand budget vs athlete rate'),
  ('min_match_score',     '0.30'::jsonb, 'Minimum composite score to surface a match'),
  ('match_expiry_days',   '30'::jsonb,   'Days before an un-actioned match expires');


COMMIT;
