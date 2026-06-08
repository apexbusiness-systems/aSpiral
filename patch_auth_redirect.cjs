const fs = require('fs');
const file = 'src/contexts/AuthContext.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const redirectUrl = `${window.location.origin}/app`;",
  `// FIX: HashRouter requires hash-based redirect URL (/#/app not /app).
      // Without the hash, post-email-verification redirect lands on Landing page.
      const redirectUrl = \`\${window.location.origin}/#/app\`;`
);

code = code.replace(
  "redirectTo: `${window.location.origin}/app`,",
  `// FIX: HashRouter requires hash-based redirect URL (/#/app not /app).
          redirectTo: \`\${window.location.origin}/#/app\`,`
);

fs.writeFileSync(file, code);
