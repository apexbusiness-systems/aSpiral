
-- ============================================================================
-- aSpiral Database Schema: Phase 1 Foundation
-- ============================================================================

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'free',
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_session_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. SESSIONS TABLE
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. SESSION ENTITIES TABLE
CREATE TABLE public.session_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own session entities"
  ON public.session_entities FOR ALL TO authenticated
  USING (
    session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())
  )
  WITH CHECK (
    session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())
  );

-- 4. SESSION CONNECTIONS TABLE
CREATE TABLE public.session_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  from_entity_id UUID REFERENCES public.session_entities(id) ON DELETE CASCADE NOT NULL,
  to_entity_id UUID REFERENCES public.session_entities(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  strength REAL NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own session connections"
  ON public.session_connections FOR ALL TO authenticated
  USING (
    session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())
  )
  WITH CHECK (
    session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())
  );

-- 5. BREAKTHROUGHS TABLE
CREATE TABLE public.breakthroughs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friction TEXT NOT NULL,
  grease TEXT NOT NULL,
  insight TEXT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.breakthroughs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own breakthroughs"
  ON public.breakthroughs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own breakthroughs"
  ON public.breakthroughs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. API KEYS TABLE (if not exists)
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Users can view own api keys'
  ) THEN
    CREATE POLICY "Users can view own api keys"
      ON public.api_keys FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Users can insert own api keys'
  ) THEN
    CREATE POLICY "Users can insert own api keys"
      ON public.api_keys FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Users can delete own api keys'
  ) THEN
    CREATE POLICY "Users can delete own api keys"
      ON public.api_keys FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 7. COMPLIANCE TABLES (service-role only, no user RLS)
CREATE TABLE public.compliance_request_runs (
  request_id TEXT PRIMARY KEY,
  jurisdiction TEXT NOT NULL DEFAULT 'US',
  status TEXT NOT NULL DEFAULT 'STARTED',
  total_events INTEGER DEFAULT 0,
  blocked BOOLEAN DEFAULT false,
  escalated BOOLEAN DEFAULT false,
  total_time_ms INTEGER DEFAULT 0,
  session_hash TEXT NOT NULL,
  user_hash TEXT,
  user_tier TEXT,
  error_code TEXT,
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_request_runs ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, no user policies needed

CREATE TABLE public.compliance_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  jurisdiction TEXT NOT NULL DEFAULT 'US',
  applicable_regulations TEXT[] DEFAULT '{}',
  session_hash TEXT NOT NULL,
  processing_time_ms INTEGER DEFAULT 0,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, event_id)
);

ALTER TABLE public.compliance_audit_events ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_session_entities_session_id ON public.session_entities(session_id);
CREATE INDEX idx_session_connections_session_id ON public.session_connections(session_id);
CREATE INDEX idx_breakthroughs_user_id ON public.breakthroughs(user_id);
CREATE INDEX idx_breakthroughs_session_id ON public.breakthroughs(session_id);
CREATE INDEX idx_compliance_runs_status ON public.compliance_request_runs(status);
CREATE INDEX idx_compliance_events_request_id ON public.compliance_audit_events(request_id);
