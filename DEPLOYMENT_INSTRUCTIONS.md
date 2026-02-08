# 🚀 Deployment Instructions - Supabase Fix

## What Was Fixed
✅ Added runtime environment variable support for Supabase credentials
✅ App now works even when build-time variables are missing
✅ Supports both Vite build-time variables AND runtime configuration

---

## 📋 Files Changed

1. **`src/integrations/supabase/client.ts`**
   - Added runtime environment variable fallback
   - Now checks both `import.meta.env` (build-time) and `window.ENV` (runtime)

2. **`index.html`**
   - Added `<script src="/config.js"></script>` to load runtime configuration

3. **`public/config.example.js`**
   - Template for runtime environment configuration

4. **`.gitignore`**
   - Added `public/config.js` to prevent committing credentials

---

## 🎯 How to Deploy

### Option A: Configure in Lovable.dev (RECOMMENDED)

**This is the EASIEST and CLEANEST solution.**

1. **Log in to Lovable.dev**
   - Go to your project: https://lovable.dev/projects/[your-project-id]

2. **Add Environment Variables**
   - Navigate to: Settings → Environment Variables
   - Add these two variables:
     ```
     VITE_SUPABASE_URL = https://your-project-id.supabase.co
     VITE_SUPABASE_PUBLISHABLE_KEY = eyJhbGc...your-anon-key
     ```

3. **Get Supabase Credentials**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Settings → API
   - Copy:
     - "Project URL" → use as `VITE_SUPABASE_URL`
     - "anon public" key → use as `VITE_SUPABASE_PUBLISHABLE_KEY`

4. **Trigger Deployment**
   - Save environment variables in Lovable
   - Push this branch to trigger rebuild
   - OR manually trigger deployment in Lovable dashboard

5. **Verify**
   - Visit https://aspiral.icu
   - Hard refresh (Cmd/Ctrl + Shift + R)
   - Try logging in - should work!

---

### Option B: Deploy to Vercel (NEW)

**For instant preview deployments and scaling.**

1. **Prerequisites**
   - Vercel account
   - GitHub repository connected

2. **Configuration**
   - The repository includes a `vercel.json` file optimized for Vite + SPA routing.
   - No manual build command configuration needed (defaults to `npm run build`).

3. **Environment Variables**
   - Go to Vercel Project Settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`
     - `VITE_POSTHOG_KEY` (Optional)
     - `VITE_POSTHOG_HOST` (Optional)

4. **Deploy**
   - Push to `main` or create a Pull Request to trigger a deployment.

---

### Option C: Use Runtime Configuration (Fallback)

**Use this if you can't access Lovable settings.**

1. **Create `public/config.js`**
   ```bash
   cp public/config.example.js public/config.js
   ```

2. **Edit `public/config.js`**
   - Replace placeholder values with actual Supabase credentials:
   ```javascript
   window.ENV = {
     SUPABASE_URL: 'https://YOUR_ACTUAL_PROJECT_ID.supabase.co',
     SUPABASE_PUBLISHABLE_KEY: 'YOUR_ACTUAL_ANON_KEY_HERE'
   };
   ```

3. **Deploy**
   - Since `public/config.js` is gitignored, you need to:
     - **Option 1:** Manually upload to hosting (if FTP/SSH access)
     - **Option 2:** Temporarily commit it:
       ```bash
       git add -f public/config.js
       git commit -m "Add runtime config (temporary)"
       git push
       # After deployment, remove:
       git rm --cached public/config.js
       git commit -m "Remove runtime config from git"
       git push
       ```

4. **Verify**
   - Visit https://aspiral.icu
   - Open DevTools Console (F12)
   - Should NOT see: `[Supabase] Client not initialized`

---

## 🔍 Verification Steps

After deployment:

1. **Open the App**
   - Navigate to: https://aspiral.icu
   - Hard refresh: Cmd/Ctrl + Shift + R (clear cache)

2. **Check Console**
   - Open DevTools (F12)
   - Go to Console tab
   - Should see NO errors about Supabase initialization

3. **Test Authentication**
   - Try email/password login
   - Try "Continue with Google"
   - Create a new account

4. **Expected Behavior**
   - Login should work
   - No red error banner
   - App loads properly
   - User can access authenticated features

---

## 🔧 Troubleshooting

### Error Still Appears
```
[Supabase] Client not initialized - missing environment variables
```

**Diagnosis:**
- Environment variables are still not set
- Or build didn't use new variables

**Solutions:**
1. Verify environment variables are set in Lovable dashboard
2. Force a new build (push a new commit)
3. Clear browser cache completely
4. Check that `public/config.js` exists and has correct values

---

### "config.js:1 Uncaught ReferenceError: window is not defined"

**Diagnosis:**
- Script loading in SSR/Node environment

**Solution:**
- The code already handles this with `typeof window !== 'undefined'`
- If persists, check that `config.js` loads AFTER DOM

---

### Google Sign-In Redirects but Fails

**Diagnosis:**
- Redirect URL not configured in Supabase

**Solution:**
1. Go to: Supabase Dashboard → Authentication → URL Configuration
2. Add to "Redirect URLs":
   - `https://aspiral.icu`
   - `https://aspiral.icu/**`
3. Save and try again

---

## 📚 For Developers

### How It Works

**Before (Build-Time Only):**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// ↓ Build without env vars
const SUPABASE_URL = undefined; // ❌ Fails
```

**After (Build-Time OR Runtime):**
```typescript
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||  // Try build-time first
  window.ENV?.SUPABASE_URL;              // Fallback to runtime

// ↓ Build without env vars
const SUPABASE_URL = undefined || window.ENV?.SUPABASE_URL;
// ↓ Runtime
const SUPABASE_URL = "https://xyz.supabase.co"; // ✅ Works!
```

### Architecture

```
┌──────────────────────────────────────┐
│         index.html                   │
│  1. <script src="/config.js">        │  ← Loads first
│  2. <script src="/main.tsx">         │  ← App starts
└──────────────────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│      public/config.js                │
│  window.ENV = {                      │
│    SUPABASE_URL: "...",              │
│    SUPABASE_PUBLISHABLE_KEY: "..."   │
│  }                                   │
└──────────────────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│  src/integrations/supabase/client.ts │
│  const URL = import.meta.env...      │
│           || window.ENV.SUPABASE_URL │  ← Fallback
└──────────────────────────────────────┘
```

---

## 🎓 Why This Solution

### Pros ✅
- **Backwards Compatible:** Still works with build-time variables
- **Zero Breaking Changes:** Existing deployments unaffected
- **Graceful Degradation:** Falls back to runtime if build-time missing
- **Secure:** Anon key is safe to expose (designed for client-side)
- **Flexible:** Works with any hosting platform

### Cons ⚠️
- **Extra HTTP Request:** Loads `config.js` before app starts (~50ms)
- **Manual Config:** Option B requires manual file management
- **Not Git-Tracked:** Runtime config not version controlled

### Why Not Just Fix Build?
- Can't always access platform settings (Lovable, etc.)
- Provides migration path for different hosting
- Future-proof for runtime environment switching

---

## 📞 Support

### If Issues Persist

1. **Check Supabase Project**
   - Ensure project is active (not paused)
   - Verify API keys are valid
   - Check RLS policies allow authentication

2. **Check Browser Console**
   - Look for specific error messages
   - Network tab → check if Supabase requests are firing
   - Application tab → check localStorage for auth tokens

3. **Contact Info**
   - Supabase Docs: https://supabase.com/docs
   - Lovable Support: https://lovable.dev/support
   - Project Owner: michael@apexbiz.io

---

## ✅ Success Checklist

Before considering this deployed:

- [ ] Environment variables added to Lovable (OR config.js created)
- [ ] Code changes committed and pushed
- [ ] New deployment triggered
- [ ] App loads without Supabase errors
- [ ] Email/password authentication works
- [ ] Google OAuth authentication works
- [ ] Authenticated state persists on refresh
- [ ] No console errors related to Supabase

---

**Deployment Time:** 5-10 minutes
**Risk Level:** Low
**Rollback:** Simple git revert

**Ready to deploy!** 🚀
