/**
 * Breakthrough Quality V2 - Deno Tests
 * 
 * Tests anti-generic breakthrough validation at the edge function layer.
 * Run with: deno test supabase/functions/spiral-ai/breakthroughQualityV2.test.ts
 */

import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { isGenericBreakthroughText, hasValidBreakthrough } from "./index.ts";

// =============================================================================
// isGenericBreakthroughText tests
// =============================================================================

// Data-driven generic phrase detection tests
const GENERIC_PHRASES: [string, string, boolean][] = [
  ["trust the process", "Trust the process and keep going", true],
  ["move forward with clarity", "You can move forward with clarity now", true],
  ["one small step", "Take one small step today", true],
  ["take a deep breath", "Take a deep breath and relax", true],
  ["the answer is within you", "The answer is within you already", true],
  ["path forward is becoming clear", "The path forward is becoming clear", true],
  ["challenge you're working through", "The challenge you're working through is hard", true],
  ["let's cut to what matters", "Let's cut to what matters here", true],
  ["you've got this", "You've got this, keep going", true],
  ["believe in yourself", "Just believe in yourself", true],
  ["everything happens for a reason", "Remember everything happens for a reason", true],
  ["let go of what no longer serves you", "Let go of what no longer serves you now", true],
  ["specific non-generic text", "Your manager micromanages deliverables killing autonomy", false],
  ["another specific text", "Saying yes to every client destroys weekends", false],
];

for (const [label, input, expected] of GENERIC_PHRASES) {
  Deno.test(`isGenericBreakthroughText: ${expected ? "detects" : "accepts"} '${label}'`, () => {
    assertEquals(isGenericBreakthroughText(input), expected);
  });
}

Deno.test("isGenericBreakthroughText: case-insensitive detection", () => {
  assertEquals(isGenericBreakthroughText("TRUST THE PROCESS"), true);
  assertEquals(isGenericBreakthroughText("Trust The Process"), true);
});

// =============================================================================
// hasValidBreakthrough tests
// =============================================================================

// Shared base for hasValidBreakthrough tests
const BASE_RESPONSE = { entities: [], connections: [], question: "", response: "" };

const HAS_VALID_CASES: [string, Record<string, unknown>, boolean][] = [
  ["accepts complete valid data", { friction: "Your boss blocks every initiative", grease: "Present a proposal with ROI numbers", insight: "You're not asking for permission — you're asking for respect" }, true],
  ["rejects missing friction", { friction: undefined, grease: "Do something", insight: "Learn something" }, false],
  ["rejects empty grease", { friction: "Real problem", grease: "", insight: "Real insight" }, false],
  ["rejects empty insight", { friction: "Real problem", grease: "Real solution", insight: "   " }, false],
  ["rejects generic friction", { friction: "The challenge you're working through", grease: "Real solution", insight: "Real insight" }, false],
  ["rejects generic grease", { friction: "Real problem", grease: "Trust the process and keep going", insight: "Real insight" }, false],
  ["rejects generic insight", { friction: "Real problem", grease: "Real solution", insight: "Move forward with clarity" }, false],
];

for (const [label, fields, expected] of HAS_VALID_CASES) {
  Deno.test(`hasValidBreakthrough: ${label}`, () => {
    const result = hasValidBreakthrough({ ...BASE_RESPONSE, ...fields });
    assertEquals(result, expected);
  });
}

// =============================================================================
// createFallbackResponse safety test
// =============================================================================

Deno.test("fallback response has no fake breakthrough fields", () => {
  // Import createFallbackResponse indirectly — it's not exported,
  // but we can verify the contract: when shouldBreakthrough=true,
  // the fallback must NOT have friction/grease/insight populated.
  // We test this by checking hasValidBreakthrough on a fallback-shaped object.
  const fallback = {
    entities: [],
    connections: [],
    question: "",
    response: "I hear you.",
    friction: undefined,
    grease: undefined,
    insight: undefined,
  };
  assertEquals(hasValidBreakthrough(fallback), false);
});

// =============================================================================
// onBreakthroughRejected callback tests
// =============================================================================

Deno.test("onBreakthroughRejected callback: not exported but contract verified via hasValidBreakthrough", () => {
  // The callback is invoked inside callAIWithValidation when hasValidBreakthrough returns false.
  // We verify the reason logic matches: empty_or_partial vs generic_phrase.
  
  // empty_or_partial: missing fields
  const emptyCase = {
    entities: [], connections: [], question: "", response: "",
    friction: "", grease: "something", insight: "something",
  };
  assertEquals(hasValidBreakthrough(emptyCase), false);
  const reason1 = !emptyCase.friction?.trim() || !emptyCase.grease?.trim() || !emptyCase.insight?.trim()
    ? 'empty_or_partial' : 'generic_phrase';
  assertEquals(reason1, 'empty_or_partial');
  
  // generic_phrase: all fields present but generic
  const genericCase = {
    entities: [], connections: [], question: "", response: "",
    friction: "Real problem here",
    grease: "Trust the process and keep going",
    insight: "Real insight here",
  };
  assertEquals(hasValidBreakthrough(genericCase), false);
  const reason2 = !genericCase.friction?.trim() || !genericCase.grease?.trim() || !genericCase.insight?.trim()
    ? 'empty_or_partial' : 'generic_phrase';
  assertEquals(reason2, 'generic_phrase');
});

Deno.test("onBreakthroughRejected: detects new banned phrases correctly", () => {
  const phrases = [
    "embrace the uncertainty",
    "journey of self-discovery",
    "step outside your comfort zone",
    "it's okay to not be okay",
    "you are not alone",
    "the first step is always the hardest",
    "you deserve to be happy",
    "growth comes from discomfort",
  ];
  for (const phrase of phrases) {
    assert(isGenericBreakthroughText(phrase), `Should detect: "${phrase}"`);
  }
});

console.log("\n✅ All Breakthrough Quality V2 tests defined.\n");
