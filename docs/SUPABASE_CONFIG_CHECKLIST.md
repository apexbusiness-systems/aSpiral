## Supabase Dashboard — Required Manual Configuration

### Authentication → URL Configuration
- Site URL: https://aspiral.icu
- Redirect URLs (add all):
  - https://aspiral.icu/**
  - https://aspiral.icu/auth/callback
  - https://aspiral.pages.dev/**  (keep for rollback)
  - http://localhost:5173/**

### Edge Functions → Environment Variables
For EACH of these functions: spiral-ai, speech-to-text, api-entities, api-export
Verify the following secrets are set in the Supabase Dashboard → Settings → Edge Functions:
  - OPENAI_API_KEY
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - SUPABASE_ANON_KEY

### API → Allowed Origins (if present in your Supabase plan)
Add: https://aspiral.icu

### Deploy Edge Functions (run after code changes):
  supabase functions deploy spiral-ai --project-ref egtwatyodujxofrdznen
  supabase functions deploy speech-to-text --project-ref egtwatyodujxofrdznen
  supabase functions deploy api-entities --project-ref egtwatyodujxofrdznen
  supabase functions deploy api-export --project-ref egtwatyodujxofrdznen
