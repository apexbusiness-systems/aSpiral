const fs = require('node:fs');

let content = fs.readFileSync('src/components/ui/chart.tsx', 'utf8');

const regexToReplace = /\/^[a-zA-Z0-9#().,\s%-]+$\//;
const newRegex = String.raw`/^[a-zA-Z0-9#().,\s%-]+$/`;

if (content.includes(String.raw`/^[a-zA-Z0-9#\(\)\-\.,\s%]+$/`)) {
  console.log("Found old regex, replacing...");
  content = content.replace(String.raw`/^[a-zA-Z0-9#\(\)\-\.,\s%]+$/`, newRegex);
  fs.writeFileSync('src/components/ui/chart.tsx', content);
} else {
  console.log("Regex not found.");
}
