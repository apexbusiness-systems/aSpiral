const fs = require('fs');
const file = 'src/contexts/AuthContext.tsx';
let code = fs.readFileSync(file, 'utf8');

const catchRegex = /\} catch \(err\) \{\n\s*return \{ error: err as Error \};\n\s*\}/g;
code = code.replace(
  /} catch \(err\) {\n\s*return { error: err as Error };\n\s*}/g,
  `} catch (err) {\n      return { error: normalizeAuthError(err) };\n    }`
);

fs.writeFileSync(file, code);
