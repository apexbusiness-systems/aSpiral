#!/usr/bin/env node
// verify-env.mjs — self-referential Supabase config validator.
// Source of truth: the anon/publishable key's JWT payload contains the
// authoritative project ref. We assert VITE_SUPABASE_URL's host matches it.
// This replaces a static bad-ref denylist, which only catches known past bugs.

// Only Supabase's legacy anon/publishable key format is a JWT with a decodable
// `ref` claim. The newer sb_publishable_* key format is an opaque token and
// cannot be used for this check — return null rather than treating it as
// malformed, so callers can fall back to a JWT-format key if one is available.
function decodeJwtRef(jwt) {
  if (!jwt || jwt.split('.').length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
    return payload.ref || null;
  } catch { return null; }
}

function fail(msg) {
  console.error('═'.repeat(63));
  console.error(`  BUILD BLOCKED: ${msg}`);
  console.error('  Fix in Cloudflare Pages → Settings → Environment Variables');
  console.error('  (Production) AND in GitHub → Settings → Secrets → Actions,');
  console.error('  then redeploy. Do not edit .env.production to "fix" this —');
  console.error('  it is not the source of the deployed value.');
  console.error('═'.repeat(63));
  process.exit(1);
}

const url = process.env.VITE_SUPABASE_URL || '';
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Cloudflare Pages Preview deployments don't inherit Production env vars, so
// PR previews build with no Supabase config at all — that's not drift, it's
// just an unconfigured preview. Only cross-validate when config is present.
if (!url && !publishableKey && !anonKey) {
  console.log('verify-env: skipped — no Supabase env vars set (expected for unconfigured preview builds)');
  process.exit(0);
}

const urlMatch = url.match(/^https:\/\/([a-z0-9]{15,25})\.supabase\.co\/?$/);
if (!urlMatch) fail(`VITE_SUPABASE_URL is missing or malformed: "${url}"`);

if (!publishableKey && !anonKey) {
  fail('No VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY set — cannot cross-validate.');
}

// Prefer whichever configured key is actually JWT-format and decodable —
// don't assume PUBLISHABLE_KEY always is, since Supabase's newer opaque
// sb_publishable_* keys don't carry a decodable ref.
const jwtRef = decodeJwtRef(publishableKey) || decodeJwtRef(anonKey);

if (!jwtRef) {
  console.log('verify-env: skipped cross-validation — no JWT-format key available to decode a ref from (opaque sb_publishable_* key only)');
  process.exit(0);
}

if (urlMatch[1] !== jwtRef) {
  fail(`Env drift: VITE_SUPABASE_URL ref "${urlMatch[1]}" does not match key's JWT ref "${jwtRef}".`);
}

console.log(`verify-env: OK — URL ref and key ref both resolve to "${jwtRef}"`);
