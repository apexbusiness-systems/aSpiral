const fs = require('node:fs');

let content = fs.readFileSync('src/components/ui/chart.tsx', 'utf8');

const regexToReplace = /function sanitizeCssColor\(color: string\): string \| null \{[\s\S]*?return null;\n\}/;

const newFunc = String.raw`function sanitizeCssColor(color: string): string | null {
  if (!color) return null;

  const trimmed = color.trim();

  // Strict character set allowance to prevent CSS injection.
  // Allowed: alphanumeric, #, (, ), -, ., ,, %, space.
  if (!/^[a-zA-Z0-9#().,\s%-]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}`;

if (regexToReplace.test(content)) {
  console.log("Found old function, replacing...");
  content = content.replace(regexToReplace, newFunc);
  fs.writeFileSync('src/components/ui/chart.tsx', content);
} else {
  console.log("Old function not found, perhaps already modified or regex mismatch.");
}
