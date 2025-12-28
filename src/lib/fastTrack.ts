/**
 * Fast-Track to Breakthrough
 * 
 * 3-Question Framework (Max):
 * Q1: What's grinding? (surface friction)
 * Q2: What do you really want? (desire/grease candidate)
 * Q3: What's stopping you? (blocker)
 * 
 * BREAKTHROUGH: Synthesize and deliver the insight
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("FastTrack");

export type ConversationStage = "friction" | "desire" | "blocker" | "breakthrough";

export interface Pattern {
  name: string;
  evidence: string;
  confidence: number;
}

export interface Breakthrough {
  friction: string;
  grease: string;
  insight: string;
  patterns: Pattern[];
}

export interface FastTrackState {
  stage: ConversationStage;
  questionsAsked: number;
  detectedPatterns: Pattern[];
  readyForBreakthrough: boolean;
}

// Common behavioral patterns we look for
const BEHAVIORAL_PATTERNS = {
  "control-vs-chaos": {
    keywords: ["control", "can't control", "out of control", "unpredictable", "chaos", "random", "helpless"],
    insight: "You're fighting to control what can't be controlled",
  },
  "people-pleasing": {
    keywords: ["they want", "they expect", "disappoint", "let down", "what they think", "approval"],
    insight: "You're prioritizing others' needs over your own",
  },
  "avoidance": {
    keywords: ["scared", "afraid", "avoid", "don't want to", "can't face", "putting off"],
    insight: "You're running from something that needs to be faced",
  },
  "perfectionism": {
    keywords: ["perfect", "not good enough", "need to be", "should be", "failure", "mistake"],
    insight: "Perfect is the enemy of done",
  },
  "scarcity": {
    keywords: ["not enough", "lose", "miss out", "too late", "running out", "never get"],
    insight: "You're focused on what you might lose, not what you might gain",
  },
  "external-validation": {
    keywords: ["they think", "looks like", "appear", "judge", "opinion", "impress"],
    insight: "You're seeking outside what can only come from within",
  },
  "all-or-nothing": {
    keywords: ["either", "or", "only way", "have to", "must", "no choice", "completely"],
    insight: "There's a middle path you're not seeing",
  },
  "catastrophizing": {
    keywords: ["worst", "disaster", "ruin", "end of", "never recover", "everything"],
    insight: "The worst case is rarely the likely case",
  },
};

/**
 * Detect patterns early - don't wait for 5+ messages
 */
export function detectPatternsEarly(
  transcript: string,
  conversationHistory: string[]
): Pattern[] {
  const allText = [...conversationHistory, transcript].join(" ").toLowerCase();
  const detected: Pattern[] = [];

  for (const [name, config] of Object.entries(BEHAVIORAL_PATTERNS)) {
    const matchingKeywords = config.keywords.filter(kw => 
      allText.includes(kw.toLowerCase())
    );
    
    if (matchingKeywords.length > 0) {
      const confidence = Math.min(0.4 + (matchingKeywords.length * 0.15), 0.95);
      detected.push({
        name,
        evidence: matchingKeywords.join(", "),
        confidence,
      });
    }
  }

  // Sort by confidence
  return detected.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/**
 * Determine if we should stop asking questions
 */
export function shouldStopAsking(
  transcript: string,
  conversationHistory: string[],
  patterns: Pattern[],
  questionsAsked: number
): { stop: boolean; reason: string } {
  
  // Hard limit: 3 questions max
  if (questionsAsked >= 3) {
    return { stop: true, reason: "max_questions_reached" };
  }

  // Check for "I don't know" pattern (2+ times = stuck)
  const iDontKnowCount = conversationHistory.filter(msg =>
    /i don't know|idk|not sure|dunno|no idea/i.test(msg)
  ).length;
  
  if (iDontKnowCount >= 2) {
    logger.info("User stuck - 2+ 'I don't know' responses");
    return { stop: true, reason: "user_stuck" };
  }

  // Check for high-confidence pattern (we know enough)
  const highConfidencePatterns = patterns.filter(p => p.confidence > 0.8);
  if (highConfidencePatterns.length > 0) {
    logger.info("High confidence pattern detected", { pattern: highConfidencePatterns[0].name });
    return { stop: true, reason: "pattern_detected" };
  }

  // Check for explicit request to skip
  if (/just tell me|what's the answer|cut to|skip|get to the point|answer/i.test(transcript)) {
    return { stop: true, reason: "user_requested_skip" };
  }

  // Check for repetition (user saying same thing)
  if (conversationHistory.length >= 2) {
    const lastTwo = conversationHistory.slice(-2).map(m => m.toLowerCase());
    const similarity = calculateSimilarity(lastTwo[0], lastTwo[1]);
    if (similarity > 0.6) {
      logger.info("User repeating - forcing breakthrough");
      return { stop: true, reason: "user_repeating" };
    }
  }

  return { stop: false, reason: "" };
}

/**
 * Simple word overlap similarity
 */
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 3));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  let overlap = 0;
  wordsA.forEach(word => {
    if (wordsB.has(word)) overlap++;
  });
  
  return overlap / Math.max(wordsA.size, wordsB.size);
}

/**
 * Get the strategic question for current stage
 */
export function getStageQuestion(stage: ConversationStage): {
  systemPrompt: string;
  maxWords: number;
} {
  switch (stage) {
    case "friction":
      return {
        systemPrompt: `Ask ONE direct question to identify what's grinding.
        
EXAMPLES:
- "So it's the traffic. What's the real grind there?"
- "Stuck on the decision. What's making it hard?"
- "Feeling overwhelmed. What's the biggest piece?"

Be DIRECT. Reference their words. Under 15 words.`,
        maxWords: 15,
      };
    
    case "desire":
      return {
        systemPrompt: `Ask ONE question to identify what they actually want.

EXAMPLES:
- "Okay. What do you want instead?"
- "If this wasn't grinding, what would you have?"
- "Strip away the noise. What matters?"

Be DIRECT. Under 15 words.`,
        maxWords: 15,
      };
    
    case "blocker":
      return {
        systemPrompt: `Ask ONE question to identify what's blocking them.

EXAMPLES:
- "So what's stopping you?"
- "If you could do that, what's in the way?"
- "What's the real blocker here?"

Be DIRECT. Under 15 words.`,
        maxWords: 15,
      };
    
    default:
      return {
        systemPrompt: "",
        maxWords: 0,
      };
  }
}

/**
 * Synthesize breakthrough from conversation
 */
export function getBreakthroughPrompt(patterns: Pattern[]): string {
  const patternHints = patterns.length > 0
    ? `\n\nDETECTED PATTERNS (use these!):\n${patterns.map(p => `- ${p.name}: ${p.evidence}`).join("\n")}`
    : "";

  return `Synthesize the breakthrough from this conversation.

You have the full context. Now deliver the insight.
${patternHints}

OUTPUT JSON:
{
  "friction": "The two gears grinding (concise, specific to their situation)",
  "grease": "The solution that eases it (actionable, not generic)",
  "insight": "The one-liner breakthrough (memorable, quotable)"
}

RULES:
1. Be SPECIFIC to their situation - don't give generic advice
2. Reference their actual words
3. Make the insight memorable - something they'll remember
4. The grease must be ACTIONABLE
5. Keep each under 25 words

EXAMPLES:

Input: Traffic anger conversation with control pattern
Output: {
  "friction": "Your need for order vs the chaos of traffic",
  "grease": "Accept what you can't control. Your only move is how YOU respond.",
  "insight": "You can't change the drivers. You can change how much space they take in your head."
}

Input: Job decision with security vs fulfillment pattern
Output: {
  "friction": "Security pulling one way, fulfillment pulling the other",
  "grease": "Test the water before burning the boats. Start small on the side.",
  "insight": "You don't need to leap. You need to take the first step."
}

Be SPECIFIC. Be ACTIONABLE. Be MEMORABLE.`;
}

/**
 * Create the initial state for a new fast-track session
 */
export function createFastTrackState(): FastTrackState {
  return {
    stage: "friction",
    questionsAsked: 0,
    detectedPatterns: [],
    readyForBreakthrough: false,
  };
}

/**
 * Advance to next stage
 */
export function advanceStage(current: ConversationStage): ConversationStage {
  switch (current) {
    case "friction": return "desire";
    case "desire": return "blocker";
    case "blocker": return "breakthrough";
    default: return "breakthrough";
  }
}
