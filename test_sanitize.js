function sanitizeCssColor(color) {
  if (!color) return null;

  const trimmed = color.trim();

  // Strict character set allowance to prevent CSS injection.
  // Allowed: alphanumeric, #, (, ), -, ., ,, %, space.
  // This safely covers hex, rgb, rgba, hsl, hsla, var(--name), and named colors.
  if (!/^[a-zA-Z0-9#\(\)\-\.,\s%]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

console.log("hsl(var(--primary)) :", sanitizeCssColor("hsl(var(--primary))"));
console.log("var(--test-var) :", sanitizeCssColor("var(--test-var)"));
console.log("bad color :", sanitizeCssColor("var(--primary); } body { color: red; /*)"));
console.log("expression :", sanitizeCssColor("expression(alert(1))"));
console.log("hex color :", sanitizeCssColor("#FFF000"));
