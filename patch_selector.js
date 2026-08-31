const fs = require('fs');
const content = fs.readFileSync('src/lib/breakthrough/selector.ts', 'utf8');

const target = `  const candidateTopVariants =
    mostRecentVariantId && topVariants.length > 1
      ? topVariants.filter((variant) => variant.id !== mostRecentVariantId)
      : topVariants;

  const totalTopScore = candidateTopVariants.reduce((sum, v) => sum + (scores.get(v.id) || 0), 0);
  let random = secureMathRandom() * totalTopScore;`;

const replacement = `  // Performance Optimization: Replace .filter() and .reduce() with a single-pass loop
  const candidateTopVariants = [];
  let totalTopScore = 0;

  if (mostRecentVariantId && topVariants.length > 1) {
    for (let i = 0; i < topVariants.length; i++) {
      if (topVariants[i].id !== mostRecentVariantId) {
        candidateTopVariants.push(topVariants[i]);
        totalTopScore += scores.get(topVariants[i].id) || 0;
      }
    }
  } else {
    for (let i = 0; i < topVariants.length; i++) {
      candidateTopVariants.push(topVariants[i]);
      totalTopScore += scores.get(topVariants[i].id) || 0;
    }
  }

  let random = secureMathRandom() * totalTopScore;`;

if (content.includes(target)) {
  fs.writeFileSync('src/lib/breakthrough/selector.ts', content.replace(target, replacement));
  console.log("Success");
} else {
  console.log("Target not found");
}
