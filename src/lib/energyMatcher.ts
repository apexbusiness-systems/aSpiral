/**
 * Energy matching system
 * Matches question tone to user's vibe
 */

export interface EnergyProfile {
  tone: "casual" | "direct" | "formal" | "intense";
  intensity: "low" | "medium" | "high";
}

/**
 * Analyze user input to determine energy profile
 */
export function matchEnergy(userInput: string): EnergyProfile {
  const input = userInput.toLowerCase();

  // Analyze language patterns
  const hasProfanity = /fuck|shit|damn|hell|crap|piss|ass/i.test(userInput);
  const hasUrgency = /!{2,}|really|so\s|very|just|totally/i.test(userInput);
  const hasEmphasis = userInput !== userInput.toLowerCase(); // Has caps
  const isCasual = /like|kinda|sorta|dunno|gonna|wanna|yeah|nah/i.test(input);
  const isFormal = /however|therefore|regarding|concerning|perhaps/i.test(input);

  // Average word length (longer = more formal)
  // Performance Optimization: Replaced O(N) .split().filter().reduce() which creates
  // intermediate arrays with a single-pass O(N) string iteration using charCodeAt().
  // This reduces memory overhead from O(N) to O(1) and speeds up execution.
  let wordCount = 0;
  let totalLength = 0;
  let inWord = false;

  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    // Fast check for whitespace characters (space, tab, newline, carriage return)
    if (code === 32 || code === 9 || code === 10 || code === 13) {
      inWord = false;
    } else {
      if (!inWord) {
        wordCount++;
        inWord = true;
      }
      totalLength++;
    }
  }

  const avgWordLength = wordCount > 0 ? totalLength / wordCount : 0;

  // Determine profile
  let tone: EnergyProfile["tone"];
  let intensity: EnergyProfile["intensity"];

  if (hasProfanity || (hasUrgency && hasEmphasis)) {
    tone = "intense";
    intensity = "high";
  } else if (isCasual) {
    tone = "casual";
    intensity = "low";
  } else if (isFormal || avgWordLength > 6) {
    tone = "formal";
    intensity = "medium";
  } else {
    tone = "direct";
    intensity = "medium";
  }

  return { tone, intensity };
}

/**
 * Adjust question to match user's energy
 */
export function adjustQuestionEnergy(
  baseQuestion: string,
  energy: EnergyProfile
): string {
  let adjusted = baseQuestion;

  switch (energy.tone) {
    case "casual":
      // Add casual markers
      if (!adjusted.toLowerCase().startsWith("so")) {
        adjusted = "So, " + adjusted.charAt(0).toLowerCase() + adjusted.slice(1);
      }
      break;

    case "intense":
      // Make it punchy
      adjusted = adjusted.replace(/^What if\s/i, "Real talk: ");
      adjusted = adjusted.replace(/^Could you\s/i, "Can you ");
      adjusted = adjusted.replace(/^Would you\s/i, "Will you ");
      break;

    case "formal":
      // Keep professional - no changes
      break;

    case "direct":
      // Strip fluff
      adjusted = adjusted.replace(/^I'm curious[,:]?\s*/i, "");
      adjusted = adjusted.replace(/^Can I ask[,:]?\s*/i, "");
      adjusted = adjusted.replace(/^If you don't mind[,:]?\s*/i, "");
      adjusted = adjusted.replace(/^I was wondering[,:]?\s*/i, "");
      break;
  }

  return adjusted;
}
