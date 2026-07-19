#!/usr/bin/env node
// verify-env.mjs — self-referential Supabase config validator.
// Source of truth: the anon/publishable key's JWT payload contains the
// authoritative project ref. We assert VITE_SUPABASE_URL's host matches it.
// This replaces a static bad-ref denylist, which only catches known past bugs.

function decodeJwtRef(jwt) {
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
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const urlMatch = url.match(/^https:\/\/([a-z0-9]{15,25})\.supabase\.co\/?$/);
if (!urlMatch) fail(`VITE_SUPABASE_URL is missing or malformed: "${url}"`);

if (!key) fail('No VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY set — cannot cross-validate.');

const jwtRef = decodeJwtRef(key);
if (!jwtRef) fail('Could not decode a project ref from the Supabase key — key is malformed.');

if (urlMatch[1] !== jwtRef) {
  fail(`Env drift: VITE_SUPABASE_URL ref "${urlMatch[1]}" does not match key's JWT ref "${jwtRef}".`);
}

console.log(`verify-env: OK — URL ref and key ref both resolve to "${jwtRef}"`);
