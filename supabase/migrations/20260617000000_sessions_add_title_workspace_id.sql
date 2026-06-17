-- Idempotent: add optional title and workspace_id columns to sessions.
-- workspace_id has NO foreign key because workspaces table does not yet exist.
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS workspace_id UUID;
