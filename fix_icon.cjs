const fs = require('fs');

let content = fs.readFileSync('src/components/cinematics/CinematicThumbnail.tsx', 'utf8');

content = content.replace(
  '  if (!style) { console.warn("Missing style for variant:", variant); return null; }\n  const Icon = style.icon;',
  '  if (!style) { console.warn("Missing style for variant:", variant); return null; }\n  const Icon = style.icon;'
);

// I already added the fallback. Let's make sure it handles dummy undefined values nicely.
// Actually the previous step modified the code to early return. Let's see if there are other errors.
