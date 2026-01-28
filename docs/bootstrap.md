# New Environment Bootstrap Guide
## Prerequisites
- Node.js 22+
- Supabase Project (PostgreSQL 14+)
- OpenAI API Key (for Edge Functions)
- Twilio Account (for Voice)

## 1. Environment Variables
Copy `.env.example` to `.env` and fill in:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY` (in Supabase Secrets)
- `TWILIO_AUTH_TOKEN` (in Supabase Secrets)
- `ALLOWED_ORIGINS` (in Supabase Secrets)

## 2. Database Setup
Run the following migrations in the SQL Editor:
1. `supabase/migrations/20260127000000_secure_api_keys.sql`

## 3. Edge Functions
Deploy functions:
```bash
supabase functions deploy voice-stream
supabase functions deploy text-to-speech
```
Set secrets:
```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set ALLOWED_ORIGINS=https://your-domain.com
```

## 4. Verification
Run `npm run typecheck` and `npm test` to ensure stability.
