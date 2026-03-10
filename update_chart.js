import fs from 'node:fs';

let content = fs.readFileSync('src/components/ui/chart.tsx', 'utf8');

const oldFunc = String.raw`function sanitizeCssColor(color: string): string | null {
  if (!color) return null;

  // Allow CSS variables
  if (color.startsWith('var(--') && color.endsWith(')')) {
    return color;
  }

  // Allow valid CSS color formats (hex, rgb, rgba, hsl, hsla, named colors)
  const validColorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|[a-z]+)$/;

  if (validColorRegex.test(color.trim())) {
    return color.trim();
  }

  return null;
}`;

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

if (content.includes(oldFunc)) {
  console.log("Found old function, replacing...");
  content = content.replace(oldFunc, newFunc);
  fs.writeFileSync('src/components/ui/chart.tsx', content);
} else {
  console.log("Old function not found, perhaps already modified or regex mismatch.");
}
