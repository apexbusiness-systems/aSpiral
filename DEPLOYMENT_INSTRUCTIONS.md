# Deployment Instructions

**Last Updated:** March 29, 2026
**Primary Platform:** Cloudflare Pages
**Domain:** https://aspiral.icu

---

## Current Architecture

```
GitHub (main) → Cloudflare Pages (auto-deploy) → aspiral.icu
                     │
                     ├── Build: npm run build (Vite)
                     ├── Env vars: .env.production (committed, public keys only)
                     └── Output: dist/
```

### Key Files
| File | Purpose |
|------|---------|
| `.env.production` | Supabase public keys for Vite build (committed — anon key is public by design) |
| `.dev.vars` | Local dev credentials (gitignored) |
| `wrangler.toml` | Cloudflare Pages config |
| `.github/workflows/ci.yml` | CI pipeline with env var injection |

---

## Deploy to Cloudflare Pages (PRIMARY)

### Auto-Deploy
Push to `main` → Cloudflare Pages auto-builds and deploys.

### Manual Deploy
1. Go to Cloudflare Dashboard → Workers & Pages → aspiral
2. Click "Create deployment" or retry last build

### Environment Variables (Cloudflare Pages Dashboard)

**Production env vars** (Settings → Variables and secrets):

| Name | Type | Required | Notes |
|------|------|----------|-------|
| `VITE_SUPABASE_URL` | Plaintext | Yes | Also in `.env.production` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Plaintext | Yes | Also in `.env.production` |
| `VITE_ENABLE_WEBGL` | Plaintext | No | Default: `true` |
| `VITE_POSTHOG_KEY` | Secret | No | PostHog analytics |
| `VITE_POSTHOG_HOST` | Plaintext | No | Default: `https://us.i.posthog.com` |
| `GROQ_API_KEY` | Secret | No | TTS provider |

> **IMPORTANT:** Cloudflare Pages does NOT expose dashboard env vars to `process.env` during Vite builds. That's why `.env.production` exists in the repo. If you change Supabase credentials, update BOTH the dashboard AND `.env.production`.

### Build Cache
If env var changes don't take effect, purge the build cache:
- Dashboard: Settings → Build cache → "Clear Cache"
- API: `POST /accounts/{id}/pages/projects/aspiral/purge_build_cache`

### Verify Correct Supabase URL is Baked Into Bundle
After deploying, verify the production bundle contains the correct Supabase URL:
```bash
# Should output: eqtwatyodujxofrdznen (with 'q', NOT 'g')
curl -s https://aspiral.icu/assets/index-*.js | grep -o 'eqtwatyodujxofrdznen\|egtwatyodujxofrdznen' | head -1

# Expected output: eqtwatyodujxofrdznen
# If output is: egtwatyodujxofrdznen → build used wrong env var, redeploy with correct values
# If no output → URL may be in a different chunk, check /assets/vendor-supabase-*.js
```


---

## Deploy to Vercel (ALTERNATIVE)

1. Connect GitHub repo to Vercel
2. The repo includes `vercel.json` for Vite + SPA routing
3. Add env vars in Vercel Project Settings → Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_POSTHOG_KEY` (optional)
   - `VITE_POSTHOG_HOST` (optional)
4. Push to `main` to deploy

---

## Runtime Config Fallback

If build-time vars are missing, the app falls back to `window.ENV` from `/config.js`:

1. Copy `public/config.example.js` → `public/config.js`
2. Fill in Supabase credentials
3. `config.js` is gitignored — never commit it

---

---

## Verification Steps

After any deployment:

1. Visit https://aspiral.icu (hard refresh: Cmd/Ctrl + Shift + R)
2. Open DevTools Console — should see NO Supabase initialization errors
3. Test email/password login
4. Test "Continue with Google"
5. Verify authenticated state persists on refresh

---

## Troubleshooting

### `[Supabase] Client not initialized - missing environment variables`
1. Check `.env.production` has correct values
2. Purge Cloudflare Pages build cache and redeploy
3. Verify bundle contains Supabase URL: `curl -s https://aspiral.icu/assets/index-*.js | grep eqtwatyodujxofrdznen`

### Google Sign-In Redirects but Fails
1. Supabase Dashboard → Authentication → URL Configuration
2. Add redirect URLs: `https://aspiral.icu` and `https://aspiral.icu/**`

### Cloudflare Deploy Fails with Auth Error 10000
1. Check API token permissions: needs **Cloudflare Pages: Edit** + **Account Settings: Read**
2. Create token at **My Profile → API Tokens** (User token, not Account token)
3. Ensure there's no duplicate Worker project with the same name

### Build Cache Not Clearing
1. Purge via dashboard: Settings → Build cache → "Clear Cache"
2. Push a code change (not just env var change) to force new bundle hash

---

## Supabase Edge Function Secrets

Set in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

| Name | Required | Notes |
|------|----------|-------|
| `LOVABLE_API_KEY` | Yes | AI gateway for spiral-ai, breakthroughs, transcripts |
| `GROQ_API_KEY` | Yes | Primary TTS provider |
| `OPENAI_API_KEY` | Legacy | Chat function fallback (migration to Groq pending) |
| `SUPABASE_URL` | Auto | Set automatically by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto | Set automatically by Supabase |

---

## GitHub Actions Secrets

Set in **GitHub → Settings → Secrets → Actions**:

| Name | Purpose |
|------|---------|
| `VITE_SUPABASE_URL` | CI build job |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | CI build job |

---

## Contact
- Project Owner: michael@apexbiz.io
- Supabase Docs: https://supabase.com/docs
- Cloudflare Pages Docs: https://developers.cloudflare.com/pages
