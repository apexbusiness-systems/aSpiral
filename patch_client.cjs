const fs = require('fs');
const file = 'src/integrations/supabase/client.ts';
let code = fs.readFileSync(file, 'utf8');

const validationBlock = `
  // Guard against known-bad placeholder values that indicate provisioning hasn't occurred
  const KNOWN_BAD_REFS = ['egtwatyodujxofrdznen', 'your-project-id', 'YOUR_ACTUAL_PROJECT'];
  const isBadUrl = KNOWN_BAD_REFS.some(bad => SUPABASE_URL.includes(bad));
  if (isBadUrl) {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  SUPABASE INITIALIZATION FAILED — PLACEHOLDER URL DETECTED');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error(\`  VITE_SUPABASE_URL contains a known placeholder: \${SUPABASE_URL}\`);
    console.error('  The Supabase project has not been provisioned yet, or the');
    console.error('  credentials have not been updated after provisioning.');
    console.error('  See SUPABASE_SETUP.md for setup instructions.');
    console.error('═══════════════════════════════════════════════════════════════');
    // Set a global flag that the app UI can check to show a config error screen
    if (typeof window !== 'undefined') {
      (window as Window & { __SUPABASE_MISCONFIGURED__?: boolean }).__SUPABASE_MISCONFIGURED__ = true;
    }
    return createMockClient();
  }

  const KNOWN_BAD_KEYS = ['REPLACE_WITH_REAL_ANON_KEY', 'your-anon-key-here'];
  const isBadKey = KNOWN_BAD_KEYS.some(bad => SUPABASE_PUBLISHABLE_KEY?.includes(bad));
  if (isBadKey) {
    console.error('  VITE_SUPABASE_PUBLISHABLE_KEY is a placeholder — not a real anon key');
    if (typeof window !== 'undefined') {
      (window as Window & { __SUPABASE_MISCONFIGURED__?: boolean }).__SUPABASE_MISCONFIGURED__ = true;
    }
    return createMockClient();
  }

`;

code = code.replace("  // Create the real client\n  try {", validationBlock + "  // Create the real client\n  try {");

fs.writeFileSync(file, code);
