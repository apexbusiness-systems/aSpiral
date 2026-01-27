-- Create API Keys table if not exists
create table if not exists public.api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  key_hash text not null,
  created_at timestamptz default now() not null,
  last_used_at timestamptz,
  expires_at timestamptz
);

-- RLS Policies
alter table public.api_keys enable row level security;

create policy "Users can view their own API keys"
  on public.api_keys for select
  using (auth.uid() = user_id);

create policy "Users can create their own API keys"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own API keys"
  on public.api_keys for delete
  using (auth.uid() = user_id);

-- Optional: Index on key_hash for faster lookup (though typically we lookup by hash during auth validation, usually in an Edge Function)
create index if not exists idx_api_keys_user_id on public.api_keys(user_id);
