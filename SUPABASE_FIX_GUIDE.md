# 🔧 SUPABASE ENVIRONMENT VARIABLE FIX

## Problem
Production deployment at `aspiral.icu` shows error:
```
[Supabase] Client not initialized - missing environment variables
```

## Root Cause
Environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are not configured in the Lovable.dev deployment platform. Vite performs **build-time** substitution, so missing variables result in `undefined` in production bundle.

---

## Solution Options

### Option 1: Configure in Lovable.dev (RECOMMENDED ⭐)

**Time:** 2 minutes
**Complexity:** Low
**Platform:** Lovable.dev Dashboard

#### Steps:
1. Go to Lovable.dev project settings
2. Navigate to "Environment Variables" or "Settings" → "Environment"
3. Add the following variables:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. **Get your Supabase credentials:**
   - Go to https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
   - Copy "Project URL" → use as `VITE_SUPABASE_URL`
   - Copy "Project API keys" → "anon public" key → use as `VITE_SUPABASE_PUBLISHABLE_KEY`

5. Save and trigger a new deployment/build

**Result:** App will work immediately after rebuild.

---

### Option 2: Add Runtime Environment Support (Code Fix)

**Time:** 10 minutes
**Complexity:** Medium
**Use Case:** When you need dynamic environment variables or can't access platform settings

#### Implementation:

**Step 1:** Create `public/config.js` for runtime environment variables:

```javascript
// public/config.js
window.ENV = {
  SUPABASE_URL: 'https://your-project-id.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

**Step 2:** Load config in `index.html` (before main script):

```html
<!-- index.html -->
<body>
  <div id="root"></div>
  <script src="/config.js"></script>
  <script type="module" src="/src/main.tsx"></script>
</body>
```

**Step 3:** Update `src/integrations/supabase/client.ts`:

```typescript
// src/integrations/supabase/client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Support both build-time and runtime environment variables
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  (window as any).ENV?.SUPABASE_URL;

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (window as any).ENV?.SUPABASE_PUBLISHABLE_KEY;

// Rest of the file remains the same...
```

**Step 4:** Update `.gitignore`:

```bash
# Add to .gitignore
public/config.js
```

**Step 5:** Create `public/config.example.js`:

```javascript
// public/config.example.js
window.ENV = {
  SUPABASE_URL: 'https://your-project-id.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'your-anon-key-here'
};
```

---

### Option 3: Use Netlify/Vercel Environment Variables

If you migrate hosting to Netlify or Vercel:

**Netlify:**
1. Site settings → Environment variables
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Trigger redeploy

**Vercel:**
1. Project settings → Environment Variables
2. Add both variables to "Production" environment
3. Redeploy

---

## Verification Steps

After implementing any fix:

1. **Clear browser cache** (Cmd/Ctrl + Shift + R)
2. **Open browser console** (F12)
3. **Check for errors**:
   - Should NOT see: `[Supabase] Client not initialized`
   - Should see successful Supabase initialization

4. **Test authentication**:
   - Try logging in with email/password
   - Try "Continue with Google"
   - Check that errors are specific (e.g., "Invalid credentials") not generic Supabase errors

---

## Mobile App (iOS/Android) - CodeMagic

The mobile builds use **different configuration** via `codemagic.yaml`. To add Supabase variables for mobile:

### Add to `codemagic.yaml`:

```yaml
workflows:
  ios-capacitor-testflight:
    environment:
      groups:
        - appstore_credentials
        - ios_credentials
        - supabase_credentials  # Add this group
      vars:
        BUNDLE_ID: "com.apex.aspiral"
        # Add these lines:
        VITE_SUPABASE_URL: $SUPABASE_URL
        VITE_SUPABASE_PUBLISHABLE_KEY: $SUPABASE_PUBLISHABLE_KEY
```

### In CodeMagic Dashboard:
1. Go to Teams & Groups → Environment variable groups
2. Create group named `supabase_credentials`
3. Add variables:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
4. Make group available to your workflow

---

## Security Notes

✅ **SAFE to commit:**
- `.env.example` (template with placeholder values)
- `public/config.example.js` (template)

❌ **NEVER commit:**
- `.env` (contains real credentials)
- `public/config.js` (contains real credentials)
- Real Supabase keys in code

⚠️ **Anon/Publishable Key:**
- The `SUPABASE_PUBLISHABLE_KEY` is **meant to be public**
- It's safe to include in client-side code
- Row Level Security (RLS) policies protect your data
- Still, don't commit to git for organizational security

---

## Troubleshooting

### Error persists after adding variables
- Clear browser cache (hard refresh)
- Verify exact variable names: `VITE_SUPABASE_URL` (not `SUPABASE_URL`)
- Check Supabase project is not paused
- Verify URL doesn't have trailing slash
- Confirm key is the "anon public" key, not service role

### Variables work locally but not in production
- Environment variables must be set in deployment platform
- Rebuild/redeploy after adding variables
- Check platform-specific syntax (some use `${{ secrets.VAR }}`)

### Google sign-in doesn't work
- Add `https://aspiral.icu` to Supabase → Authentication → URL Configuration → Redirect URLs
- Enable Google provider in Supabase → Authentication → Providers

---

## Quick Reference

| Variable | Where to Find | Example |
|----------|---------------|---------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Settings → API → Project API Keys → anon public | `eyJhbGciOi...` |

**Supabase Dashboard:** https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api
