const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const importStatement = `import { useSupabaseConfigError, SupabaseConfigError } from '@/components/SupabaseConfigError';
`;
code = code.replace("import { lazy, Suspense, useEffect, useState } from \"react\";", "import { lazy, Suspense, useEffect, useState } from \"react\";\n" + importStatement);

const hookUsage = `
  const isSupabaseMisconfigured = useSupabaseConfigError();
  if (isSupabaseMisconfigured) {
    return <SupabaseConfigError />;
  }
`;

code = code.replace("  return (\n    <I18nextProvider", hookUsage + "\n  return (\n    <I18nextProvider");

fs.writeFileSync(file, code);
