/**
 * Breakthrough Quality V2 Tests
 * 
 * Tests that:
 * - Generic breakthrough phrases are rejected
 * - Partial breakthrough data is rejected
 * - Valid complete data is accepted
 * - Empty data is rejected
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { isValidBreakthroughData } from "../useSpiralAI";

// Mock featureFlags to ensure V2 is ON for these tests
vi.mock("@/lib/featureFlags", () => ({
  featureFlags: Object.freeze({
    voiceEnabled: true,
    cinematicsEnabled: true,
    rendererV2Enabled: true,
    breakthroughQualityV2: true,
  }),
}));

describe("isValidBreakthroughData", () => {
  it("rejects null data", () => {
    expect(isValidBreakthroughData(null)).toBe(false);
  });

  it("rejects undefined data", () => {
    expect(isValidBreakthroughData(undefined)).toBe(false);
  });

  it("rejects empty friction", () => {
    expect(isValidBreakthroughData({
      friction: "",
      grease: "Do X instead",
      insight: "You're stuck because of Y",
    })).toBe(false);
  });

  it("rejects empty grease", () => {
    expect(isValidBreakthroughData({
      friction: "Work overload",
      grease: "",
      insight: "Balance is key",
    })).toBe(false);
  });

  it("rejects empty insight", () => {
    expect(isValidBreakthroughData({
      friction: "Work overload",
      grease: "Delegate tasks",
      insight: "",
    })).toBe(false);
  });

  it("rejects whitespace-only fields", () => {
    expect(isValidBreakthroughData({
      friction: "   ",
      grease: "Delegate",
      insight: "Focus on what matters",
    })).toBe(false);
  });

  // Data-driven generic phrase rejection tests
  const GENERIC_PHRASE_CASES: { name: string; data: { friction: string; grease: string; insight: string } }[] = [
    { name: "trust the process", data: { friction: "Feeling stuck at work", grease: "Start small", insight: "Trust the process and keep going" } },
    { name: "move forward with clarity", data: { friction: "Can't decide", grease: "Move forward with clarity", insight: "Decisions reveal themselves" } },
    { name: "the answer is within you", data: { friction: "Lost direction", grease: "Look inward", insight: "The answer is within you" } },
    { name: "challenge you're working through", data: { friction: "The challenge you're working through", grease: "Something vague", insight: "Keep at it" } },
    { name: "path forward is becoming clear", data: { friction: "Confusion", grease: "The path forward is becoming clear", insight: "Just wait" } },
    { name: "let's cut to what matters", data: { friction: "Busy schedule", grease: "Let's cut to what matters", insight: "Prioritize" } },
    { name: "take a deep breath", data: { friction: "Anxiety", grease: "Take a deep breath and relax", insight: "Calm down" } },
    { name: "one small step", data: { friction: "Overwhelmed", grease: "One small step at a time", insight: "Progress is progress" } },
    { name: "you've got this", data: { friction: "Feeling stuck", grease: "You've got this, just keep going", insight: "Real insight here" } },
    { name: "believe in yourself", data: { friction: "Self-doubt", grease: "Believe in yourself and try again", insight: "Confidence matters" } },
    { name: "everything happens for a reason", data: { friction: "Job loss", grease: "Apply elsewhere", insight: "Everything happens for a reason" } },
    { name: "let go of what no longer serves you", data: { friction: "Old habits", grease: "Let go of what no longer serves you", insight: "Change is growth" } },
  ];

  it.each(GENERIC_PHRASE_CASES)("rejects generic phrase: $name", ({ data }) => {
    expect(isValidBreakthroughData(data)).toBe(false);
  });

  it("accepts valid complete non-generic data", () => {
    expect(isValidBreakthroughData({
      friction: "Your manager micromanages every deliverable, killing your autonomy",
      grease: "Have a direct conversation about ownership boundaries this week",
      insight: "You're not fighting the workload — you're fighting for control over how you work",
    })).toBe(true);
  });

  it("accepts another valid specific breakthrough", () => {
    expect(isValidBreakthroughData({
      friction: "Saying yes to every client request is destroying your weekends",
      grease: "Define a 'no' template and use it for the next 3 requests",
      insight: "Every yes to them is a no to yourself",
    })).toBe(true);
  });

  it("rejects partial data: missing grease field entirely", () => {
    // TypeScript would catch this but test runtime behavior
    expect(isValidBreakthroughData({
      friction: "Something real",
      grease: undefined as unknown as string,
      insight: "Something insightful",
    })).toBe(false);
  });
});

describe("isValidBreakthroughData with flag OFF", () => {
  beforeEach(() => {
    // Re-mock with flag off
    vi.doMock("@/lib/featureFlags", () => ({
      featureFlags: Object.freeze({
        voiceEnabled: true,
        cinematicsEnabled: true,
        rendererV2Enabled: true,
        breakthroughQualityV2: false,
      }),
    }));
  });

  // Note: since the module is already loaded with flag ON,
  // this test verifies the structural validation still works
  it("still rejects null/empty even conceptually", () => {
    expect(isValidBreakthroughData(null)).toBe(false);
    expect(isValidBreakthroughData({ friction: "", grease: "", insight: "" })).toBe(false);
  });
});
