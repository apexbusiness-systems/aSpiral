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

  it("rejects generic phrase: trust the process", () => {
    expect(isValidBreakthroughData({
      friction: "Feeling stuck at work",
      grease: "Start small",
      insight: "Trust the process and keep going",
    })).toBe(false);
  });

  it("rejects generic phrase: move forward with clarity", () => {
    expect(isValidBreakthroughData({
      friction: "Can't decide",
      grease: "Move forward with clarity",
      insight: "Decisions reveal themselves",
    })).toBe(false);
  });

  it("rejects generic phrase: the answer is within you", () => {
    expect(isValidBreakthroughData({
      friction: "Lost direction",
      grease: "Look inward",
      insight: "The answer is within you",
    })).toBe(false);
  });

  it("rejects generic phrase: challenge you're working through", () => {
    expect(isValidBreakthroughData({
      friction: "The challenge you're working through",
      grease: "Something vague",
      insight: "Keep at it",
    })).toBe(false);
  });

  it("rejects generic phrase: path forward is becoming clear", () => {
    expect(isValidBreakthroughData({
      friction: "Confusion",
      grease: "The path forward is becoming clear",
      insight: "Just wait",
    })).toBe(false);
  });

  it("rejects generic phrase: let's cut to what matters", () => {
    expect(isValidBreakthroughData({
      friction: "Busy schedule",
      grease: "Let's cut to what matters",
      insight: "Prioritize",
    })).toBe(false);
  });

  it("rejects generic phrase: take a deep breath", () => {
    expect(isValidBreakthroughData({
      friction: "Anxiety",
      grease: "Take a deep breath and relax",
      insight: "Calm down",
    })).toBe(false);
  });

  it("rejects generic phrase: one small step", () => {
    expect(isValidBreakthroughData({
      friction: "Overwhelmed",
      grease: "One small step at a time",
      insight: "Progress is progress",
    })).toBe(false);
  });

  it("rejects generic phrase: you've got this", () => {
    expect(isValidBreakthroughData({
      friction: "Feeling stuck",
      grease: "You've got this, just keep going",
      insight: "Real insight here",
    })).toBe(false);
  });

  it("rejects generic phrase: believe in yourself", () => {
    expect(isValidBreakthroughData({
      friction: "Self-doubt",
      grease: "Believe in yourself and try again",
      insight: "Confidence matters",
    })).toBe(false);
  });

  it("rejects generic phrase: everything happens for a reason", () => {
    expect(isValidBreakthroughData({
      friction: "Job loss",
      grease: "Apply elsewhere",
      insight: "Everything happens for a reason",
    })).toBe(false);
  });

  it("rejects generic phrase: let go of what no longer serves you", () => {
    expect(isValidBreakthroughData({
      friction: "Old habits",
      grease: "Let go of what no longer serves you",
      insight: "Change is growth",
    })).toBe(false);
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
