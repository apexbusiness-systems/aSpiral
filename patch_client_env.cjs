const fs = require('fs');
const file = 'src/integrations/supabase/client.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `const globalEnv = getGlobalEnv();

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || globalEnv?.SUPABASE_URL;

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || globalEnv?.SUPABASE_PUBLISHABLE_KEY;`;

const replacement = `// NOTE: window.ENV is populated synchronously by /config.js (loaded in index.html
// before this module initializes). This is safe because the synchronous XHR approach
// in index.html ensures window.ENV is available at module initialization time.
const globalEnv = getGlobalEnv();

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  globalEnv?.SUPABASE_URL ||
  undefined;

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  globalEnv?.SUPABASE_PUBLISHABLE_KEY ||
  undefined;`;

code = code.replace(target, replacement);
fs.writeFileSync(file, code);
