-- =============================================================================
-- COMPLIANCE AUDIT LOGGING - Enterprise-Grade Durable Logging Infrastructure
-- Migration: 20260206000000_compliance_audit_logs.sql
-- =============================================================================
-- Features:
-- - Idempotent DDL (safe to run multiple times)
-- - UPSERT support via UNIQUE constraints
-- - RLS enabled (no public policies for service role only access)
-- - Optimized indexes for common query patterns
-- =============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- TABLE: compliance_audit_events
-- Stores individual compliance audit events per request
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.compliance_audit_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identification (idempotency key)
  request_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  
  -- Event details
  event_type TEXT NOT NULL,
  event_ts TIMESTAMPTZ NOT NULL,
  
  -- Jurisdiction compliance
  jurisdiction TEXT NOT NULL,
  applicable_regulations TEXT[] NOT NULL DEFAULT '{}',
  
  -- Session tracking (hashed, never raw PII)
  session_hash TEXT NOT NULL,
  
  -- Performance metrics
  processing_time_ms INTEGER NOT NULL,
  
  -- Event payload (structured, PII-free)
  payload JSONB NOT NULL,
  
  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Idempotency constraint: same request_id + event_id = same event
  CONSTRAINT uq_compliance_events_idempotency UNIQUE (request_id, event_id)
);

-- Indexes for compliance_audit_events
CREATE INDEX IF NOT EXISTS idx_compliance_events_request_id 
  ON public.compliance_audit_events(request_id);

CREATE INDEX IF NOT EXISTS idx_compliance_events_event_ts 
  ON public.compliance_audit_events(event_ts);

CREATE INDEX IF NOT EXISTS idx_compliance_events_event_type 
  ON public.compliance_audit_events(event_type);

-- Enable RLS (no public policies - service role only)
ALTER TABLE public.compliance_audit_events ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TABLE: compliance_request_runs
-- Tracks request lifecycle: STARTED -> SUCCESS/BLOCKED/ERROR
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.compliance_request_runs (
  -- Primary key: one row per request
  request_id TEXT PRIMARY KEY,
  
  -- Jurisdiction
  jurisdiction TEXT NOT NULL,
  
  -- Lifecycle status: STARTED, SUCCESS, BLOCKED, ERROR
  status TEXT NOT NULL CHECK (status IN ('STARTED', 'SUCCESS', 'BLOCKED', 'ERROR')),
  
  -- Aggregated metrics
  total_events INTEGER NOT NULL DEFAULT 0,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  escalated BOOLEAN NOT NULL DEFAULT FALSE,
  total_time_ms INTEGER NOT NULL DEFAULT 0,
  
  -- Session/user tracking (hashed, never raw PII)
  session_hash TEXT NOT NULL,
  user_hash TEXT,
  user_tier TEXT,
  
  -- Error details (if status = ERROR)
  error_code TEXT,
  error_message TEXT,
  
  -- Timestamps
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for compliance_request_runs
CREATE INDEX IF NOT EXISTS idx_compliance_runs_status 
  ON public.compliance_request_runs(status);

CREATE INDEX IF NOT EXISTS idx_compliance_runs_completed_at 
  ON public.compliance_request_runs(completed_at);

CREATE INDEX IF NOT EXISTS idx_compliance_runs_created_at 
  ON public.compliance_request_runs(created_at);

-- Enable RLS (no public policies - service role only)
ALTER TABLE public.compliance_request_runs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- COMMENTS for documentation
-- =============================================================================
COMMENT ON TABLE public.compliance_audit_events IS 
  'Stores individual audit events for compliance logging. Uses idempotent upserts via (request_id, event_id) constraint.';

COMMENT ON TABLE public.compliance_request_runs IS 
  'Tracks request lifecycle from STARTED through completion. Primary key on request_id ensures single row per request.';

COMMENT ON COLUMN public.compliance_request_runs.status IS 
  'Lifecycle status: STARTED (early, before LLM), SUCCESS, BLOCKED, or ERROR';

COMMENT ON COLUMN public.compliance_audit_events.session_hash IS 
  'SHA-256 hash prefix of session identifier. Never contains raw PII.';

COMMENT ON COLUMN public.compliance_request_runs.user_hash IS 
  'SHA-256 hash prefix of user identifier. Never contains raw PII.';
