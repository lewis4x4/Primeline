-- ============================================================================
-- SCOUT NIL Agency Platform  -  v2.2  Supporting Infrastructure
-- ============================================================================
-- Rate limiting, brand signal helpers, comparable-deal finder, and
-- maintenance utilities.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. RATE LIMITS TABLE
-- --------------------------------------------------------------------------

CREATE TABLE rate_limits (
  ip            TEXT         NOT NULL,
  endpoint      TEXT         NOT NULL,
  window_start  TIMESTAMPTZ  NOT NULL,
  request_count INTEGER      NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, endpoint, window_start)
);

-- RLS: only service_role should touch this table directly; the RPC
-- is SECURITY DEFINER so callers don't need direct table access.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON rate_limits
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- --------------------------------------------------------------------------
-- 2. check_rate_limit  RPC
-- --------------------------------------------------------------------------
-- Called from Edge Functions / middleware to enforce per-IP rate limits.
-- Uses a truncated window (configurable minutes, rounded to the nearest
-- window boundary) and upserts the counter atomically.
--
-- Returns JSON: { allowed: bool, remaining: int, reset_at: timestamptz }
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_ip            TEXT,
  p_endpoint      TEXT,
  p_max_requests  INTEGER,
  p_window_minutes INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start  TIMESTAMPTZ;
  v_count         INTEGER;
  v_reset_at      TIMESTAMPTZ;
BEGIN
  -- Calculate the start of the current window by truncating to the
  -- nearest p_window_minutes interval.
  v_window_start := date_trunc('minute', now())
    - (EXTRACT(MINUTE FROM now())::INTEGER % p_window_minutes) * INTERVAL '1 minute';

  v_reset_at := v_window_start + (p_window_minutes * INTERVAL '1 minute');

  -- Atomic upsert: insert or increment
  INSERT INTO rate_limits (ip, endpoint, window_start, request_count)
  VALUES (p_ip, p_endpoint, v_window_start, 1)
  ON CONFLICT (ip, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN json_build_object(
    'allowed',   v_count <= p_max_requests,
    'remaining', GREATEST(p_max_requests - v_count, 0),
    'reset_at',  v_reset_at
  );
END;
$$;

COMMENT ON FUNCTION check_rate_limit IS
  'Atomic rate-limit check. Returns {allowed, remaining, reset_at}.';


-- --------------------------------------------------------------------------
-- 3. increment_brand_signal_count  RPC
-- --------------------------------------------------------------------------
-- Bumps the running signal counter on a brand row.  Called after a new
-- brand_signal is ingested so dashboards always reflect the latest count.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_brand_signal_count(p_brand_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE brands
     SET signal_count    = signal_count + 1,
         last_signal_date = now(),
         updated_at       = now()
   WHERE id = p_brand_id;
END;
$$;

COMMENT ON FUNCTION increment_brand_signal_count IS
  'Atomically increment signal_count and set last_signal_date on a brand.';


-- --------------------------------------------------------------------------
-- 4. find_comparable_deals  RPC
-- --------------------------------------------------------------------------
-- Returns comparable deal-intel rows for a given sport + follower tier,
-- optionally filtered by platform.  Used by the valuation engine and
-- the public calculator.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION find_comparable_deals(
  p_sport         TEXT,
  p_follower_tier TEXT,
  p_platform      platform_type DEFAULT NULL,
  p_limit         INTEGER       DEFAULT 10
)
RETURNS TABLE (
  id                    UUID,
  source_type           deal_intel_source_type,
  brand_name            TEXT,
  athlete_name          TEXT,
  platform              platform_type,
  content_type          content_unit,
  amount_low            NUMERIC(12,2),
  amount_high           NUMERIC(12,2),
  deal_date             DATE,
  verification_level    verification_level,
  verification_score    INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    di.id,
    di.source_type,
    di.brand_name,
    di.athlete_name,
    di.platform,
    di.content_type,
    di.amount_low,
    di.amount_high,
    di.deal_date,
    di.verification_level,
    di.verification_score
  FROM deal_intel di
  LEFT JOIN athletes a ON a.id = di.athlete_id
  LEFT JOIN athlete_social_profiles asp ON asp.athlete_id = a.id
  WHERE
    -- Match on sport (or include global / untagged intel)
    (
      a.sport ILIKE p_sport
      OR a.sport IS NULL
      OR di.athlete_id IS NULL
    )
    -- Match on follower tier if we can resolve one
    AND (
      p_follower_tier IS NULL
      OR EXISTS (
        SELECT 1 FROM athlete_social_profiles asp2
         WHERE asp2.athlete_id = di.athlete_id
           AND get_follower_tier(asp2.followers) = p_follower_tier
      )
      OR di.athlete_id IS NULL  -- include unlinked intel
    )
    -- Optional platform filter
    AND (p_platform IS NULL OR di.platform = p_platform)
  ORDER BY
    di.verification_score DESC,
    di.deal_date DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION find_comparable_deals IS
  'Find comparable deal intel rows by sport, follower tier, and optional platform.';


-- --------------------------------------------------------------------------
-- 5. CLEANUP UTILITIES
-- --------------------------------------------------------------------------

-- Clean up expired rate-limit windows (call via pg_cron daily or hourly)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits
   WHERE window_start < now() - INTERVAL '2 hours';
END;
$$;

COMMENT ON FUNCTION cleanup_rate_limits IS
  'Purge rate_limits rows older than 2 hours. Schedule via pg_cron.';


COMMIT;
