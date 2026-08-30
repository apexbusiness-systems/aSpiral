const fs = require('fs');

const path = 'src/lib/energyMatcher.ts';
let code = fs.readFileSync(path, 'utf8');

const search = `  // Average word length (longer = more formal)
  const words = input.split(/\\s+/).filter((w) => w.length > 0);
  const avgWordLength =
    words.reduce((sum, w) => sum + w.length, 0) / (words.length || 1);`;

const replace = `  // Average word length (longer = more formal)
  // Performance Optimization: Replaced O(N) .split().filter().reduce() with a single-pass loop
  // that avoids creating intermediate arrays for counting words and calculating total string length.
  let totalLength = 0;
  let wordCount = 0;
  let inWord = false;

  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);
    // ASCII check for space, tab, newline, carriage return
    if (charCode === 32 || charCode === 9 || charCode === 10 || charCode === 13) {
      inWord = false;
    } else {
      if (!inWord) {
        inWord = true;
        wordCount++;
      }
      totalLength++;
    }
  }

  const avgWordLength = totalLength / (wordCount || 1);`;

code = code.replace(search, replace);
fs.writeFileSync(path, code);
console.log("Patched!");
