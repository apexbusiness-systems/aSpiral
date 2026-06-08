const fs = require('fs');
const file = 'src/integrations/supabase/client.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `  // Create the real client
  try {
    return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (error) {`;

const replace = `  // Create the real client
  try {
    return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        // FIX: Use localStorage (not sessionStorage) to persist auth sessions
        // across tab closes, PWA backgrounding, and page reloads on mobile.
        // sessionStorage was causing users to be logged out constantly on iOS/Android.
        storage: window.localStorage,
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'aspiral-auth-token', // Namespaced to avoid conflicts
      },
    });
  } catch (error) {`;

code = code.replace(target, replace);
fs.writeFileSync(file, code);
