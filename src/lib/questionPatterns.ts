/**
 * Diverse question pattern library for natural conversation
 * NOT: All "what" questions
 * YES: Varied, conversational, human
 */

export const QUESTION_PATTERNS = {
  // DIRECT (no fluff)
  direct: [
    "{specific} - when did that start?",
    "So {paraphrase}. Then what?",
    "Walk me through that. What happens first?",
    "That {emotion} you mentioned - where do you feel it?",
  ],

  // REFLECTION (mirror their words)
  reflection: [
    "You said '{quote}' - what's grinding there?",
    "'{quote}' - that's the gear, isn't it?",
    "So it's not {dismissed}, it's actually {real}?",
    "You mentioned {X} but then said {Y}. Which one's louder?",
  ],

  // EXCAVATION (dig deeper)
  excavation: [
    "Okay, but underneath that {surface}, what else?",
    "If {constraint} wasn't a factor, what would you do?",
    "What's the version of you that doesn't have to {cope}?",
    "Strip away {external}. What's left?",
  ],

  // CONTRAST (reveal through comparison)
  contrast: [
    "When you're NOT feeling {negative}, what's different?",
    "Compare: {A} versus {B}. Which grinds more?",
    "You want {desire}, but you're doing {current}. What's that about?",
    "Past you would've {old}. Present you says {new}. What changed?",
  ],

  // EMBODIED (physical sensations)
  embodied: [
    "Close your eyes. Where in your body is that {emotion} sitting?",
    "If that friction had a temperature, hot or cold?",
    "That tightness - chest? Gut? Throat?",
    "When {trigger} happens, what does your body do first?",
  ],

  // HYPOTHETICAL (safe exploration)
  hypothetical: [
    "Imagine it's 6 months from now and this is handled. How'd you do it?",
    "If {person} wasn't in the picture, would this still grind?",
    "Pretend you have a magic wand. One thing you'd change?",
    "Fast forward: you figured this out. What was the grease?",
  ],

  // CHALLENGE (gentle confrontation)
  challenge: [
    "You keep saying '{word}' - but is it really {word}, or is it {reframe}?",
    "I hear you, but that sounds like the story you tell yourself. What's the truth?",
    "Bullshit. What are you NOT saying?",
    "Every time you mention {X}, you tense up. What's that protecting?",
  ],

  // COMPLETION (finish the thought)
  completion: [
    "If I could just {partial}... then what?",
    "The worst part isn't {obvious}, it's actually...",
    "I'd be okay with {situation} if only...",
    "This would be easier if {missing}...",
  ],

  // PERMISSION (unlock stuck thoughts)
  permission: [
    "What would you say if you weren't worried about {concern}?",
    "If you could be brutally honest, what's the real issue?",
    "Forget politeness. What do you ACTUALLY want?",
    "Stop optimizing for {external}. What do YOU need?",
  ],

  // TEMPORAL (time-based insight)
  temporal: [
    "When's the last time you DIDN'T feel {emotion}?",
    "This grinding - is it new, or has it been building?",
    "A year ago, would this have bothered you?",
    "How long can you sit with this before you crack?",
  ],

  // STAKES (make it real)
  stakes: [
    "What happens if you do nothing?",
    "If this keeps grinding for another year, then what?",
    "Who pays the price if you can't figure this out?",
    "What's the cost of staying stuck?",
  ],

  // BINARY (force a choice)
  binary: [
    "Simple: stay or go?",
    "Truth: are you trying to fix this, or just venting?",
    "Be honest: do you want a solution, or permission?",
    "Real talk: fear or laziness?",
  ],

  // REFRAME (shift perspective)
  reframe: [
    "What if {problem} isn't the problem, but actually {deeper}?",
    "You're calling it {label}. What if it's really {newLabel}?",
    "Flip it: what if {weakness} is your superpower?",
    "Instead of 'I can't {X}', try 'I won't {X}'. Does that feel different?",
  ],

  // CURIOSITY (genuine interest)
  curiosity: [
    "I'm curious - why {choice}?",
    "Help me understand: how does {behavior} serve you?",
    "Tell me more about {detail}.",
    "That's interesting. What made you land on {word} specifically?",
  ],

  // SILENCE (let them fill it)
  silence: [
    "...",
    "And?",
    "Keep going.",
    "What else?",
  ],
};

export type PatternCategory = keyof typeof QUESTION_PATTERNS;

/**
 * Pattern selection based on conversation stage
 */
export const STAGE_PATTERNS: Record<string, PatternCategory[]> = {
  surface: ["direct", "reflection", "curiosity"],
  excavation: ["excavation", "embodied", "temporal"],
  pattern: ["contrast", "challenge", "reframe"],
  breakthrough: ["hypothetical", "stakes", "binary", "permission"],
};

/**
 * Get random pattern from category
 */
export function getRandomPattern(category: PatternCategory): string {
  const patterns = QUESTION_PATTERNS[category];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

/**
 * Get pattern categories for a stage, excluding already used ones
 */
export function getAvailablePatterns(
  stage: string,
  usedCategories: Set<string>
): PatternCategory[] {
  const stagePatterns = STAGE_PATTERNS[stage] || STAGE_PATTERNS.surface;
  const available = stagePatterns.filter((p) => !usedCategories.has(p));
  
  // If all used, reset
  return available.length > 0 ? available : stagePatterns;
}
