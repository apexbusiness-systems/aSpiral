-- Add title and workspace_id to sessions table.
-- api-sessions POST already inserts these fields; this migration makes the schema match.
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS workspace_id UUID;
