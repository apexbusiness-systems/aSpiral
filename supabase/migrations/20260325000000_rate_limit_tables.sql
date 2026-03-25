-- =============================================================================
-- Rate Limit Persistence Tables
-- Backs the in-memory rate limiter with PostgreSQL for multi-instance consistency
-- =============================================================================

-- Rate limit events: one row per allowed request
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  event_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for sliding-window queries (identifier + time range)
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_lookup
  ON rate_limit_events (identifier, event_time DESC);

-- Auto-cleanup: delete events older than 25 hours (keeps 24h window + buffer)
-- Runs via pg_cron or Supabase scheduled function
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_cleanup
  ON rate_limit_events (event_time);

-- Rate limit violations: one row per identifier (upsert pattern)
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  identifier TEXT PRIMARY KEY,
  violations INT NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  last_violation TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session prompt counts: one row per session (upsert pattern)
CREATE TABLE IF NOT EXISTS session_prompt_counts (
  session_id TEXT PRIMARY KEY,
  prompt_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Cleanup function: call via pg_cron every hour or Supabase scheduled function
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_rate_limit_events()
RETURNS void
LANGUAGE sql
AS $$
  -- Delete events older than 25 hours
  DELETE FROM rate_limit_events
  WHERE event_time < now() - interval '25 hours';

  -- Clear expired blocks
  UPDATE rate_limit_violations
  SET blocked_until = NULL
  WHERE blocked_until IS NOT NULL AND blocked_until < now();

  -- Delete stale session counts (no activity in 24h)
  DELETE FROM session_prompt_counts
  WHERE updated_at < now() - interval '24 hours';
$$;

-- =============================================================================
-- RLS: Service role only (edge functions use service_role key)
-- =============================================================================
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_prompt_counts ENABLE ROW LEVEL SECURITY;

-- Service role has full access (edge functions authenticate with service_role key)
DO $$
DECLARE
  required_role CONSTANT TEXT := 'service_role';
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['rate_limit_events', 'rate_limit_violations', 'session_prompt_counts']
  LOOP
    EXECUTE format(
      'CREATE POLICY "service_role_all" ON %I FOR ALL USING (auth.role() = %L)',
      tbl, required_role
    );
  END LOOP;
END
$$;
