const fs = require('fs');
const file = 'DEPLOYMENT_INSTRUCTIONS.md';
let code = fs.readFileSync(file, 'utf8');

const target = `### Build Cache
If env var changes don't take effect, purge the build cache:
- Dashboard: Settings → Build cache → "Clear Cache"
- API: \`POST /accounts/{id}/pages/projects/aspiral/purge_build_cache\``;

const replacement = `### Build Cache
If env var changes don't take effect, purge the build cache:
- Dashboard: Settings → Build cache → "Clear Cache"
- API: \`POST /accounts/{id}/pages/projects/aspiral/purge_build_cache\`

### Verify Correct Supabase URL is Baked Into Bundle
After deploying, verify the production bundle contains the correct Supabase URL:
\`\`\`bash
# Should output: eqtwatyodujxofrdznen (with 'q', NOT 'g')
curl -s https://aspiral.icu/assets/index-*.js | grep -o 'eqtwatyodujxofrdznen\\|egtwatyodujxofrdznen' | head -1

# Expected output: eqtwatyodujxofrdznen
# If output is: egtwatyodujxofrdznen → build used wrong env var, redeploy with correct values
# If no output → URL may be in a different chunk, check /assets/vendor-supabase-*.js
\`\`\`
`;

code = code.replace(target, replacement);
fs.writeFileSync(file, code);
