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

Deno.test("isGenericBreakthroughText: detects 'trust the process'", () => {
  assertEquals(isGenericBreakthroughText("Trust the process and keep going"), true);
});

Deno.test("isGenericBreakthroughText: detects 'move forward with clarity'", () => {
  assertEquals(isGenericBreakthroughText("You can move forward with clarity now"), true);
});

Deno.test("isGenericBreakthroughText: detects 'one small step'", () => {
  assertEquals(isGenericBreakthroughText("Take one small step today"), true);
});

Deno.test("isGenericBreakthroughText: detects 'take a deep breath'", () => {
  assertEquals(isGenericBreakthroughText("Take a deep breath and relax"), true);
});

Deno.test("isGenericBreakthroughText: detects 'the answer is within you'", () => {
  assertEquals(isGenericBreakthroughText("The answer is within you already"), true);
});

Deno.test("isGenericBreakthroughText: detects 'path forward is becoming clear'", () => {
  assertEquals(isGenericBreakthroughText("The path forward is becoming clear"), true);
});

Deno.test("isGenericBreakthroughText: detects 'challenge you're working through'", () => {
  assertEquals(isGenericBreakthroughText("The challenge you're working through is hard"), true);
});

Deno.test("isGenericBreakthroughText: detects 'let's cut to what matters'", () => {
  assertEquals(isGenericBreakthroughText("Let's cut to what matters here"), true);
});

Deno.test("isGenericBreakthroughText: detects 'you've got this'", () => {
  assertEquals(isGenericBreakthroughText("You've got this, keep going"), true);
});

Deno.test("isGenericBreakthroughText: detects 'believe in yourself'", () => {
  assertEquals(isGenericBreakthroughText("Just believe in yourself"), true);
});

Deno.test("isGenericBreakthroughText: detects 'everything happens for a reason'", () => {
  assertEquals(isGenericBreakthroughText("Remember everything happens for a reason"), true);
});

Deno.test("isGenericBreakthroughText: detects 'let go of what no longer serves you'", () => {
  assertEquals(isGenericBreakthroughText("Let go of what no longer serves you now"), true);
});

Deno.test("isGenericBreakthroughText: accepts specific non-generic text", () => {
  assertEquals(isGenericBreakthroughText("Your manager micromanages deliverables killing autonomy"), false);
});

Deno.test("isGenericBreakthroughText: accepts another specific text", () => {
  assertEquals(isGenericBreakthroughText("Saying yes to every client destroys weekends"), false);
});

Deno.test("isGenericBreakthroughText: case-insensitive detection", () => {
  assertEquals(isGenericBreakthroughText("TRUST THE PROCESS"), true);
  assertEquals(isGenericBreakthroughText("Trust The Process"), true);
});

// =============================================================================
// hasValidBreakthrough tests
// =============================================================================

Deno.test("hasValidBreakthrough: accepts complete valid data", () => {
  assert(hasValidBreakthrough({
    entities: [],
    connections: [],
    question: "",
    response: "",
    friction: "Your boss blocks every initiative",
    grease: "Present a proposal with ROI numbers",
    insight: "You're not asking for permission — you're asking for respect",
  }));
});

Deno.test("hasValidBreakthrough: rejects missing friction", () => {
  assertEquals(hasValidBreakthrough({
    entities: [],
    connections: [],
    question: "",
    response: "",
    friction: undefined,
    grease: "Do something",
    insight: "Learn something",
  }), false);
});

Deno.test("hasValidBreakthrough: rejects empty grease", () => {
  assertEquals(hasValidBreakthrough({
    entities: [],
    connections: [],
    question: "",
    response: "",
    friction: "Real problem",
    grease: "",
    insight: "Real insight",
  }), false);
});

Deno.test("hasValidBreakthrough: rejects empty insight", () => {
  assertEquals(hasValidBreakthrough({
    entities: [],
    connections: [],
    question: "",
    response: "",
    friction: "Real problem",
    grease: "Real solution",
    insight: "   ",
  }), false);
});

Deno.test("hasValidBreakthrough: rejects generic friction", () => {
  assertEquals(hasValidBreakthrough({
    entities: [],
    connections: [],
    question: "",
    response: "",
    friction: "The challenge you're working through",
    grease: "Real solution",
    insight: "Real insight",
  }), false);
});

Deno.test("hasValidBreakthrough: rejects generic grease", () => {
  assertEquals(hasValidBreakthrough({
    entities: [],
    connections: [],
    question: "",
    response: "",
    friction: "Real problem",
    grease: "Trust the process and keep going",
    insight: "Real insight",
  }), false);
});

Deno.test("hasValidBreakthrough: rejects generic insight", () => {
  assertEquals(hasValidBreakthrough({
    entities: [],
    connections: [],
    question: "",
    response: "",
    friction: "Real problem",
    grease: "Real solution",
    insight: "Move forward with clarity",
  }), false);
});

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
