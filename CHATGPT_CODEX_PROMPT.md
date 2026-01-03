# 🤖 ChatGPT CODEX Execution Prompt

## Context
You are tasked with fixing a critical production authentication error in the aSpiral web application (React + Vite + Supabase + Capacitor).

---

## Problem Statement

**Error:** `[Supabase] Client not initialized - missing environment variables`

**Location:** Production deployment at `https://aspiral.icu`

**Impact:** Users cannot authenticate (email/password or Google OAuth)

---

## Root Cause Analysis

### Technical Details
1. **Platform:** Application deployed via Lovable.dev
2. **Build System:** Vite (performs compile-time environment variable substitution)
3. **Missing Variables:**
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anonymous/public key

### Why It's Failing
- Vite replaces `import.meta.env.VITE_*` variables during build time
- Production build ran without these variables configured
- Result: JavaScript bundle contains `undefined` for both values
- Supabase client initialization fails → falls back to mock client → shows error

### Code Reference
```typescript
// src/integrations/supabase/client.ts:5-6
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL; // → undefined
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY; // → undefined

// Line 80: Validation fails
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  return createMockClient(); // ← Creates mock that throws error
}
```

---

## Execution Instructions

### Primary Solution: Platform Configuration (FASTEST)

**DO THIS FIRST:** Configure environment variables in Lovable.dev

#### Steps:
1. **Access Lovable.dev Dashboard**
   - Navigate to project settings for `aspiral.icu`
   - Locate "Environment Variables" or "Settings" section

2. **Retrieve Supabase Credentials**
   - Go to: `https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/settings/api`
   - Copy "Project URL" (e.g., `https://xyzabc123.supabase.co`)
   - Copy "anon public" key from "Project API keys" section

3. **Add Variables to Lovable**
   ```
   Variable Name: VITE_SUPABASE_URL
   Value: [Paste Supabase Project URL]

   Variable Name: VITE_SUPABASE_PUBLISHABLE_KEY
   Value: [Paste anon public key]
   ```

4. **Trigger Rebuild**
   - Save environment variables
   - Trigger new deployment/build in Lovable
   - Wait for build to complete (~2-5 minutes)

5. **Verify Fix**
   - Navigate to `https://aspiral.icu`
   - Hard refresh (Cmd/Ctrl + Shift + R)
   - Try logging in or signing up
   - Error should be resolved

---

### Fallback Solution: Runtime Environment Variables (CODE CHANGES)

**Use ONLY if platform configuration is not accessible**

#### Implementation Plan

##### File 1: Create `public/config.js`
```javascript
// public/config.js
// Runtime environment configuration for Supabase
window.ENV = {
  SUPABASE_URL: 'REPLACE_WITH_YOUR_SUPABASE_PROJECT_URL',
  SUPABASE_PUBLISHABLE_KEY: 'REPLACE_WITH_YOUR_SUPABASE_ANON_KEY'
};
```

**Action:** Replace placeholder values with actual Supabase credentials

##### File 2: Update `index.html`
```html
<!-- index.html -->
<body>
  <div id="root"></div>
  <!-- ADD THIS LINE: Load runtime config before app -->
  <script src="/config.js"></script>
  <script type="module" src="/src/main.tsx"></script>
</body>
```

**Action:** Add `<script src="/config.js"></script>` before the main app script

##### File 3: Modify `src/integrations/supabase/client.ts`

**FIND** (lines 5-6):
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

**REPLACE WITH**:
```typescript
// Support both build-time (Vite) and runtime (window.ENV) variables
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof window !== 'undefined' ? (window as any).ENV?.SUPABASE_URL : undefined);

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof window !== 'undefined' ? (window as any).ENV?.SUPABASE_PUBLISHABLE_KEY : undefined);
```

##### File 4: Update `.gitignore`

**ADD**:
```bash
# Runtime environment configuration (contains credentials)
public/config.js
```

##### File 5: Create `public/config.example.js`
```javascript
// public/config.example.js
// Template for runtime environment configuration
window.ENV = {
  SUPABASE_URL: 'https://your-project-id.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'your-anon-key-here'
};
```

---

## Post-Implementation Verification

### Checklist
- [ ] Navigate to `https://aspiral.icu`
- [ ] Open browser DevTools (F12) → Console tab
- [ ] Verify NO error: `[Supabase] Client not initialized`
- [ ] Test email/password login
- [ ] Test Google OAuth login
- [ ] Verify authentication state persists on page refresh
- [ ] Check that authenticated routes are accessible

### Expected Console Output (Success)
```
✅ No Supabase initialization errors
✅ May see: "PostHog" or other analytics logs (normal)
✅ Authentication requests succeed (check Network tab)
```

### Rollback Plan (If Something Breaks)
```bash
# Revert code changes
git checkout HEAD -- src/integrations/supabase/client.ts index.html
git checkout HEAD -- public/

# Push revert
git add .
git commit -m "Revert: Supabase environment variable changes"
git push origin main
```

---

## Security Considerations

### Safe Practices ✅
- `SUPABASE_PUBLISHABLE_KEY` (anon key) is **designed** to be public
- Row Level Security (RLS) policies protect data server-side
- Never expose `SUPABASE_SERVICE_ROLE_KEY` (admin key)

### Never Commit 🚫
- Real credentials in code files
- `public/config.js` with actual values
- `.env` files with real keys

### Best Practice
- Use platform environment variables (Lovable/Netlify/Vercel)
- Keep credentials in secure variable management
- Use `.example` files for templates only

---

## Mobile Build Configuration (iOS/Android)

**Separate from web deployment** - uses CodeMagic

### If Mobile Apps Also Need Fix

#### Add to `codemagic.yaml`:

**FIND** (around line 21-26):
```yaml
environment:
  groups:
    - appstore_credentials
    - ios_credentials
  vars:
    BUNDLE_ID: "com.apex.aspiral"
```

**ADD**:
```yaml
environment:
  groups:
    - appstore_credentials
    - ios_credentials
    - supabase_credentials  # NEW
  vars:
    BUNDLE_ID: "com.apex.aspiral"
    VITE_SUPABASE_URL: $SUPABASE_URL  # NEW
    VITE_SUPABASE_PUBLISHABLE_KEY: $SUPABASE_PUBLISHABLE_KEY  # NEW
```

**Then** in CodeMagic dashboard:
1. Teams & Groups → Environment variable groups
2. Create `supabase_credentials` group
3. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`
4. Link group to workflow

---

## Troubleshooting Guide

### Issue: "Error persists after adding variables"
**Solution:**
1. Hard refresh browser (Cmd/Ctrl + Shift + R)
2. Clear all site data (DevTools → Application → Clear storage)
3. Verify variable names are exact: `VITE_SUPABASE_URL` (not `SUPABASE_URL`)
4. Check Supabase project status (not paused)

### Issue: "Build succeeds but app still broken"
**Solution:**
1. Verify Lovable triggered a **new build** (not just redeployment)
2. Check build logs for environment variable substitution
3. Inspect production JavaScript bundle (search for `import.meta.env`)

### Issue: "Google sign-in redirects but fails"
**Solution:**
1. Add `https://aspiral.icu` to Supabase redirect URLs
2. Path: Supabase Dashboard → Authentication → URL Configuration
3. Add to both "Redirect URLs" and "Site URL"

### Issue: "Works locally but not in production"
**Solution:**
- Local uses `.env` file (git-ignored)
- Production needs platform environment variables
- Ensure variables added to deployment platform (Lovable/Netlify/Vercel)

---

## Success Criteria

### Definition of Done
✅ Production app at `aspiral.icu` loads without Supabase errors
✅ Users can sign up with email/password
✅ Users can sign in with email/password
✅ Google OAuth sign-in works
✅ Authentication persists across page refreshes
✅ Protected routes are accessible when authenticated
✅ No console errors related to Supabase initialization

---

## Resources

### Required Information
- **Supabase Project URL:** Get from Supabase Dashboard → Settings → API
- **Supabase Anon Key:** Get from Supabase Dashboard → Settings → API → Project API Keys

### Documentation Links
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/initializing)
- [Lovable.dev Docs](https://docs.lovable.dev/)

---

## Execution Priority

1. **FIRST:** Try Platform Configuration (Lovable environment variables)
2. **IF BLOCKED:** Implement Runtime Environment Variables (code changes)
3. **VERIFY:** Test authentication thoroughly
4. **DOCUMENT:** Update team on configuration method used

---

## Final Notes

- This is a **configuration issue**, not a code bug
- The codebase defensively handles missing variables (mock client fallback)
- Fix requires either platform config OR code changes for runtime loading
- Both solutions are production-ready and secure
- Platform configuration is preferred (cleaner, no code changes)

**Estimated Time to Fix:** 5-10 minutes
**Risk Level:** Low (configuration only, no architectural changes)
**Rollback Complexity:** Low (revert environment variables or git revert)

---

**Execute with confidence. The codebase is well-architected for this fix.**
