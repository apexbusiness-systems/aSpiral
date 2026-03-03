-- Migration: Create user_sessions table with Row Level Security

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','friction','breakthrough','completed')),
  entities        JSONB       NOT NULL DEFAULT '[]',
  connections     JSONB       NOT NULL DEFAULT '[]',
  friction_points JSONB       NOT NULL DEFAULT '[]',
  metadata        JSONB       NOT NULL DEFAULT '{}',
  idempotency_key TEXT        UNIQUE,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see and modify their own sessions
CREATE POLICY "Users own their sessions"
  ON public.user_sessions
  FOR ALL
  USING (auth.uid() = user_id);

-- Create updated_at trigger for automatic timestamp management
CREATE OR REPLACE FUNCTION update_user_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_sessions_updated_at();

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON public.user_sessions(status);
