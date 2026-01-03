// ════════════════════════════════════════════════════════════════════════════
// Runtime Environment Configuration (Template)
// ════════════════════════════════════════════════════════════════════════════
//
// INSTRUCTIONS:
// 1. Copy this file to `public/config.js`
// 2. Replace placeholder values with your actual Supabase credentials
// 3. NEVER commit `public/config.js` to git (already in .gitignore)
//
// WHERE TO FIND YOUR CREDENTIALS:
// → Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api
//   - Project URL: Copy from "Project URL" field
//   - Anon Key: Copy from "Project API keys" → "anon public" key
//
// ════════════════════════════════════════════════════════════════════════════

window.ENV = {
  // Your Supabase project URL (e.g., https://xyzabc123.supabase.co)
  SUPABASE_URL: 'https://your-project-id.supabase.co',

  // Your Supabase anonymous/public key (starts with "eyJ...")
  SUPABASE_PUBLISHABLE_KEY: 'your-anon-key-here'
};
