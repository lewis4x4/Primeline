-- ============================================================================
-- PRIMELINE NIL Agency Platform  -  v2.1  Migration
-- ============================================================================
-- Adds deal-intelligence, rate-card, athlete-valuation, and public
-- calculator-lead tables along with supporting functions and RLS.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. NEW ENUMS
-- --------------------------------------------------------------------------

CREATE TYPE verification_level AS ENUM (
  'rumor', 'public_reported', 'self_reported', 'dual_confirmed'
);

CREATE TYPE deal_intel_source_type AS ENUM (
  'news', 'press_release', 'social_post', 'marketplace',
  'self_reported', 'agent_reported', 'other'
);

CREATE TYPE content_unit AS ENUM (
  'ig_post', 'ig_reel', 'ig_story', 'ig_carousel',
  'tiktok_post', 'yt_short', 'yt_video',
  'twitter_post', 'twitter_thread',
  'appearance', 'event', 'bundle', 'other'
);


-- --------------------------------------------------------------------------
-- 2. NEW TABLES
-- --------------------------------------------------------------------------

-- 2.1  deal_intel  -  crowd-sourced / scraped deal data points
CREATE TABLE deal_intel (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type             deal_intel_source_type NOT NULL,
  source_url              TEXT,
  brand_name              TEXT NOT NULL,
  athlete_name            TEXT,
  brand_id                UUID REFERENCES brands,
  athlete_id              UUID REFERENCES athletes,
  platform                platform_type,
  content_type            content_unit,
  amount_low              NUMERIC(12,2),
  amount_high             NUMERIC(12,2),
  deal_date               DATE,
  extracted_text          TEXT,
  extraction_confidence   NUMERIC(3,2),
  verification_level      verification_level NOT NULL DEFAULT 'rumor',
  verification_score      INTEGER NOT NULL DEFAULT 1
                          CHECK (verification_score BETWEEN 1 AND 5),
  reviewed                BOOLEAN NOT NULL DEFAULT false,
  reviewed_by             UUID REFERENCES user_profiles,
  reviewed_at             TIMESTAMPTZ,
  proof_file_url          TEXT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deduplicate by source URL when present
CREATE UNIQUE INDEX uq_deal_intel_source_url
  ON deal_intel (source_url)
  WHERE source_url IS NOT NULL;

-- 2.2  rate_cards  -  benchmark pricing grid
CREATE TABLE rate_cards (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport                 TEXT,
  platform              platform_type NOT NULL,
  content_type          content_unit NOT NULL,
  follower_tier         TEXT NOT NULL,
  engagement_tier       TEXT NOT NULL,
  rate_low              NUMERIC(10,2) NOT NULL,
  rate_median           NUMERIC(10,2) NOT NULL,
  rate_high             NUMERIC(10,2) NOT NULL,
  sample_size           INTEGER NOT NULL DEFAULT 0,
  weighted_verification NUMERIC(3,2) DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite unique: sport (nullable) + platform + content_type + follower_tier + engagement_tier
CREATE UNIQUE INDEX uq_rate_cards_combo
  ON rate_cards (COALESCE(sport, ''), platform, content_type, follower_tier, engagement_tier);

-- 2.3  athlete_valuations  -  point-in-time value snapshots
CREATE TABLE athlete_valuations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id           UUID NOT NULL REFERENCES athletes,
  as_of                DATE NOT NULL DEFAULT CURRENT_DATE,
  valuation            JSONB NOT NULL DEFAULT '{}',
  confidence           NUMERIC(5,2) DEFAULT 0,
  drivers              JSONB DEFAULT '[]',
  comp_count           INTEGER NOT NULL DEFAULT 0,
  methodology_version  TEXT NOT NULL DEFAULT 'v2.1',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_athlete_valuations_athlete_date
  ON athlete_valuations (athlete_id, as_of);

-- 2.4  valuation_comps  -  links valuations to comparable deal intel
CREATE TABLE valuation_comps (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_id     UUID NOT NULL REFERENCES athlete_valuations ON DELETE CASCADE,
  deal_intel_id    UUID NOT NULL REFERENCES deal_intel,
  similarity_score NUMERIC(5,4) DEFAULT 0,
  weight           NUMERIC(5,4) DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5  calculator_leads  -  public calculator funnel
CREATE TABLE calculator_leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT NOT NULL,
  full_name             TEXT,
  school                TEXT,
  sport                 TEXT,
  skill_level           TEXT,
  instagram_handle      TEXT,
  instagram_followers   INTEGER DEFAULT 0,
  tiktok_handle         TEXT,
  tiktok_followers      INTEGER DEFAULT 0,
  twitter_followers     INTEGER DEFAULT 0,
  youtube_subscribers   INTEGER DEFAULT 0,
  engagement_rate       NUMERIC(5,2),
  location_market       TEXT,
  conference            TEXT,
  lead_score            INTEGER NOT NULL DEFAULT 0,
  qualified             BOOLEAN NOT NULL DEFAULT false,
  full_report_requested BOOLEAN NOT NULL DEFAULT false,
  full_report_sent_at   TIMESTAMPTZ,
  utm_source            TEXT,
  utm_medium            TEXT,
  utm_campaign          TEXT,
  status                TEXT NOT NULL DEFAULT 'new',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive email uniqueness
CREATE UNIQUE INDEX uq_calculator_leads_email
  ON calculator_leads (LOWER(email));

-- 2.6  calculator_reports  -  generated public report pages
CREATE TABLE calculator_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES calculator_leads,
  public_slug     TEXT UNIQUE,
  og_image_url    TEXT,
  report_data     JSONB DEFAULT '{}',
  pdf_file_url    TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- --------------------------------------------------------------------------
-- 3. ALTER EXISTING TABLES  (idempotent)
-- --------------------------------------------------------------------------

ALTER TABLE deals ADD COLUMN IF NOT EXISTS platform      platform_type;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS usage_rights  TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS exclusivity   TEXT;


-- --------------------------------------------------------------------------
-- 4. FUNCTIONS
-- --------------------------------------------------------------------------

-- 4.1  Follower tier bucket
CREATE OR REPLACE FUNCTION get_follower_tier(p_count INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_count < 1000    THEN RETURN 'nano';
  ELSIF p_count < 5000  THEN RETURN 'micro';
  ELSIF p_count < 15000 THEN RETURN 'rising';
  ELSIF p_count < 50000 THEN RETURN 'mid';
  ELSIF p_count < 150000 THEN RETURN 'established';
  ELSE RETURN 'elite';
  END IF;
END;
$$;

-- 4.2  Engagement tier bucket
CREATE OR REPLACE FUNCTION get_engagement_tier(p_rate NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_rate < 1      THEN RETURN 'low';
  ELSIF p_rate < 2.5 THEN RETURN 'moderate';
  ELSIF p_rate < 4   THEN RETURN 'good';
  ELSIF p_rate < 6   THEN RETURN 'high';
  ELSE RETURN 'viral';
  END IF;
END;
$$;

-- 4.3  Human-readable follower tier label
CREATE OR REPLACE FUNCTION get_follower_tier_label(p_count INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_count < 1000     THEN RETURN 'Nano (0-999)';
  ELSIF p_count < 5000  THEN RETURN 'Micro (1K-4.9K)';
  ELSIF p_count < 15000 THEN RETURN 'Rising (5K-14.9K)';
  ELSIF p_count < 50000 THEN RETURN 'Mid (15K-49.9K)';
  ELSIF p_count < 150000 THEN RETURN 'Established (50K-149.9K)';
  ELSE RETURN 'Elite (150K+)';
  END IF;
END;
$$;

-- 4.4  Lead scoring trigger function
CREATE OR REPLACE FUNCTION score_calculator_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_score       INTEGER := 0;
  v_total_foll  BIGINT;
  v_platforms   INTEGER := 0;
  v_completeness INTEGER := 0;
BEGIN
  -- ---- Total followers (up to 30 pts) ----
  v_total_foll := COALESCE(NEW.instagram_followers, 0)
                + COALESCE(NEW.tiktok_followers, 0)
                + COALESCE(NEW.twitter_followers, 0)
                + COALESCE(NEW.youtube_subscribers, 0);

  IF    v_total_foll >= 100000 THEN v_score := v_score + 30;
  ELSIF v_total_foll >= 50000  THEN v_score := v_score + 25;
  ELSIF v_total_foll >= 15000  THEN v_score := v_score + 20;
  ELSIF v_total_foll >= 5000   THEN v_score := v_score + 15;
  ELSIF v_total_foll >= 1000   THEN v_score := v_score + 10;
  ELSIF v_total_foll >= 500    THEN v_score := v_score + 5;
  END IF;

  -- ---- Engagement rate (up to 20 pts) ----
  IF NEW.engagement_rate IS NOT NULL THEN
    IF    NEW.engagement_rate >= 6   THEN v_score := v_score + 20;
    ELSIF NEW.engagement_rate >= 4   THEN v_score := v_score + 16;
    ELSIF NEW.engagement_rate >= 2.5 THEN v_score := v_score + 12;
    ELSIF NEW.engagement_rate >= 1   THEN v_score := v_score + 8;
    ELSE  v_score := v_score + 3;
    END IF;
  END IF;

  -- ---- Profile completeness (up to 25 pts) ----
  IF NEW.full_name IS NOT NULL AND NEW.full_name <> '' THEN
    v_completeness := v_completeness + 1;
  END IF;
  IF NEW.school IS NOT NULL AND NEW.school <> '' THEN
    v_completeness := v_completeness + 1;
  END IF;
  IF NEW.sport IS NOT NULL AND NEW.sport <> '' THEN
    v_completeness := v_completeness + 1;
  END IF;
  IF NEW.instagram_handle IS NOT NULL AND NEW.instagram_handle <> '' THEN
    v_completeness := v_completeness + 1;
  END IF;
  IF NEW.tiktok_handle IS NOT NULL AND NEW.tiktok_handle <> '' THEN
    v_completeness := v_completeness + 1;
  END IF;
  -- 5 pts per completed field, max 25
  v_score := v_score + (v_completeness * 5);

  -- ---- Multi-platform presence (up to 15 pts) ----
  IF COALESCE(NEW.instagram_followers, 0) > 0 THEN v_platforms := v_platforms + 1; END IF;
  IF COALESCE(NEW.tiktok_followers, 0)    > 0 THEN v_platforms := v_platforms + 1; END IF;
  IF COALESCE(NEW.twitter_followers, 0)   > 0 THEN v_platforms := v_platforms + 1; END IF;
  IF COALESCE(NEW.youtube_subscribers, 0) > 0 THEN v_platforms := v_platforms + 1; END IF;

  IF    v_platforms >= 4 THEN v_score := v_score + 15;
  ELSIF v_platforms >= 3 THEN v_score := v_score + 12;
  ELSIF v_platforms >= 2 THEN v_score := v_score + 8;
  ELSIF v_platforms >= 1 THEN v_score := v_score + 4;
  END IF;

  -- ---- .edu email bonus (10 pts) ----
  IF NEW.email ILIKE '%.edu' THEN
    v_score := v_score + 10;
  END IF;

  -- Clamp to 0-100
  NEW.lead_score := LEAST(GREATEST(v_score, 0), 100);
  NEW.qualified  := (NEW.lead_score >= 60);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_score_calculator_lead
  BEFORE INSERT OR UPDATE ON calculator_leads
  FOR EACH ROW EXECUTE FUNCTION score_calculator_lead();


-- --------------------------------------------------------------------------
-- 5. UPDATED_AT TRIGGERS  (new tables)
-- --------------------------------------------------------------------------

CREATE TRIGGER trg_deal_intel_updated_at
  BEFORE UPDATE ON deal_intel
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_rate_cards_updated_at
  BEFORE UPDATE ON rate_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_athlete_valuations_updated_at
  BEFORE UPDATE ON athlete_valuations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_calculator_leads_updated_at
  BEFORE UPDATE ON calculator_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_calculator_reports_updated_at
  BEFORE UPDATE ON calculator_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- --------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- --------------------------------------------------------------------------

ALTER TABLE deal_intel          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_cards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_valuations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_comps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_leads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_reports  ENABLE ROW LEVEL SECURITY;

-- deal_intel  -  team full access; athletes see own rows
CREATE POLICY "Team members can view all"   ON deal_intel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON deal_intel FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON deal_intel FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON deal_intel FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "Athletes can view own intel" ON deal_intel FOR SELECT TO authenticated
  USING (athlete_id = current_athlete_id());

-- rate_cards  -  team full access; anonymous can read (powers public calculator)
CREATE POLICY "Team members can view all"   ON rate_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON rate_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON rate_cards FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON rate_cards FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "Public can view rate cards"  ON rate_cards FOR SELECT TO anon          USING (true);

-- athlete_valuations  -  team full access; athletes see own
CREATE POLICY "Team members can view all"     ON athlete_valuations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"       ON athlete_valuations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"       ON athlete_valuations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"      ON athlete_valuations FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "Athletes can view own valuations" ON athlete_valuations FOR SELECT TO authenticated
  USING (athlete_id = current_athlete_id());

-- valuation_comps  -  team full access; athletes see own via valuation join
CREATE POLICY "Team members can view all"   ON valuation_comps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON valuation_comps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON valuation_comps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON valuation_comps FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "Athletes can view own comps" ON valuation_comps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athlete_valuations av
       WHERE av.id = valuation_comps.valuation_id
         AND av.athlete_id = current_athlete_id()
    )
  );

-- calculator_leads  -  team full access; anonymous can INSERT only (no read)
CREATE POLICY "Team members can view all"     ON calculator_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"       ON calculator_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"       ON calculator_leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"      ON calculator_leads FOR ALL    TO service_role  USING (true) WITH CHECK (true);
CREATE POLICY "Anonymous can submit leads"    ON calculator_leads FOR INSERT TO anon          WITH CHECK (true);

-- calculator_reports  -  team full access
CREATE POLICY "Team members can view all"   ON calculator_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members can insert"     ON calculator_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team members can update"     ON calculator_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access"    ON calculator_reports FOR ALL    TO service_role  USING (true) WITH CHECK (true);


-- --------------------------------------------------------------------------
-- 7. SEED DATA  -  Baseline Rate Cards
-- --------------------------------------------------------------------------
-- 30+ rows across sport / platform / content-type / follower-tier / engagement-tier.
-- All marked as bootstrap estimates to be replaced with real intel data.

INSERT INTO rate_cards
  (sport, platform, content_type, follower_tier, engagement_tier, rate_low, rate_median, rate_high, sample_size, notes)
VALUES
  -- Instagram Posts  (global)
  (NULL, 'instagram', 'ig_post', 'micro',       'moderate', 50,   100,  200,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'instagram', 'ig_post', 'micro',       'good',     75,   150,  300,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'instagram', 'ig_post', 'rising',      'moderate', 150,  300,  500,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'instagram', 'ig_post', 'rising',      'good',     200,  400,  700,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'instagram', 'ig_post', 'mid',         'moderate', 400,  750,  1200, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'instagram', 'ig_post', 'mid',         'good',     500,  1000, 1800, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'instagram', 'ig_post', 'established', 'moderate', 1000, 2000, 3500, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'instagram', 'ig_post', 'established', 'high',     1500, 3000, 5000, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),

  -- Instagram Reels  (global)
  (NULL, 'instagram', 'ig_reel', 'micro',       'good',     100,  200,  400,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'instagram', 'ig_reel', 'rising',      'good',     250,  500,  900,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'instagram', 'ig_reel', 'mid',         'good',     600,  1200, 2200, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'instagram', 'ig_reel', 'established', 'high',     2000, 4000, 7000, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),

  -- Instagram Stories  (global)
  (NULL, 'instagram', 'ig_story', 'micro',       'moderate', 25,   50,   100,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'instagram', 'ig_story', 'rising',      'moderate', 75,   150,  250,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'instagram', 'ig_story', 'mid',         'good',     200,  400,  700,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'instagram', 'ig_story', 'established', 'good',     500,  1000, 1800, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),

  -- TikTok Posts  (global)
  (NULL, 'tiktok', 'tiktok_post', 'micro',       'moderate', 50,   100,  250,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'tiktok', 'tiktok_post', 'micro',       'high',     100,  200,  400,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'tiktok', 'tiktok_post', 'rising',      'moderate', 150,  350,  600,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'tiktok', 'tiktok_post', 'rising',      'good',     250,  500,  900,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'tiktok', 'tiktok_post', 'mid',         'good',     500,  1000, 2000, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'tiktok', 'tiktok_post', 'established', 'high',     1500, 3500, 6000, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),

  -- YouTube Shorts  (global)
  (NULL, 'youtube', 'yt_short', 'micro',       'moderate', 50,   100,  200,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'youtube', 'yt_short', 'rising',      'good',     200,  400,  700,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'youtube', 'yt_short', 'mid',         'good',     500,  1000, 1800, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  (NULL, 'youtube', 'yt_short', 'established', 'high',     1500, 3000, 5500, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),

  -- Sport-specific: Basketball  (Instagram)
  ('basketball', 'instagram', 'ig_post', 'rising',      'good',     300,  550,  900,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  ('basketball', 'instagram', 'ig_post', 'mid',         'good',     700,  1300, 2200, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  ('basketball', 'instagram', 'ig_reel', 'mid',         'high',     900,  1700, 3000, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),

  -- Sport-specific: Football  (Instagram & TikTok)
  ('football', 'instagram', 'ig_post', 'rising',      'good',     250,  500,  850,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  ('football', 'instagram', 'ig_post', 'mid',         'good',     600,  1200, 2000, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  ('football', 'tiktok',    'tiktok_post', 'mid',     'good',     600,  1100, 2000, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),

  -- Sport-specific: Volleyball  (Instagram & TikTok)
  ('volleyball', 'instagram', 'ig_post', 'rising',      'good',     200,  400,  700,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  ('volleyball', 'tiktok',    'tiktok_post', 'rising',  'high',     250,  500,  900,  0, 'Bootstrap estimate - replace with real data as intel accumulates'),

  -- Sport-specific: Soccer  (Instagram)
  ('soccer', 'instagram', 'ig_post', 'mid',         'good',     500,  1000, 1700, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  ('soccer', 'instagram', 'ig_reel', 'mid',         'good',     600,  1200, 2100, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),

  -- Sport-specific: Gymnastics  (TikTok & Instagram)
  ('gymnastics', 'tiktok',    'tiktok_post', 'rising', 'high',     300,  600,  1100, 0, 'Bootstrap estimate - replace with real data as intel accumulates'),
  ('gymnastics', 'instagram', 'ig_reel', 'rising',     'high',     350,  650,  1200, 0, 'Bootstrap estimate - replace with real data as intel accumulates');


COMMIT;
