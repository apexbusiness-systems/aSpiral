const fs = require('fs');
const file = 'DEPLOYMENT_INSTRUCTIONS.md';
let code = fs.readFileSync(file, 'utf8');

const target = `## Cloudflare Pages Setup`;

const replacement = `### Verify Correct Supabase URL is Baked Into Bundle
After deploying, verify the production bundle contains the correct Supabase URL:
\`\`\`bash
# Should output: eqtwatyodujxofrdznen (with 'q', NOT 'g')
curl -s https://aspiral.icu/assets/index-*.js | grep -o 'eqtwatyodujxofrdznen\\|egtwatyodujxofrdznen' | head -1

# Expected output: eqtwatyodujxofrdznen
# If output is: egtwatyodujxofrdznen → build used wrong env var, redeploy with correct values
# If no output → URL may be in a different chunk, check /assets/vendor-supabase-*.js
\`\`\`

## Cloudflare Pages Setup`;

if (!code.includes("Verify Correct Supabase URL is Baked Into Bundle")) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
}
