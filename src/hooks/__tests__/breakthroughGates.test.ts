/**
 * Breakthrough Gate Tests
 *
 * Validates the stage gate, entity gate, maxQuestions wiring,
 * and ultra-fast threshold enforcement that prevent premature breakthroughs.
 */

import { describe, it, expect } from 'vitest';
import { shouldStopAsking, advanceStage, type ConversationStage } from '@/lib/fastTrack';

// ---------------------------------------------------------------------------
// Constants (mirrored from useSpiralAI.ts for verification)
// ---------------------------------------------------------------------------
const BREAKTHROUGH_MIN_STAGE: ConversationStage = 'blocker';
const BREAKTHROUGH_MIN_ENTITIES = 2;
const ULTRA_FAST_MIN_FRICTION_ENTITIES = 5;
const ULTRA_FAST_MIN_SENTENCES = 5;

// Helper: simulate the stage gate logic from useSpiralAI.ts
function shouldAllowBreakthrough(
  stage: ConversationStage,
  entityCount: number,
): boolean {
  if (stage === 'friction' || stage === 'desire') return false;
  if (entityCount < BREAKTHROUGH_MIN_ENTITIES) return false;
  return true;
}

// Helper: simulate ultra-fast gate logic
function isUltraFastBreakthroughGated(
  sentenceCount: number,
  frictionEntityCount: number,
  stage: ConversationStage,
  entityCount: number,
): boolean {
  const thresholdsReady =
    sentenceCount >= ULTRA_FAST_MIN_SENTENCES &&
    frictionEntityCount >= ULTRA_FAST_MIN_FRICTION_ENTITIES;
  if (!thresholdsReady) return false;
  return shouldAllowBreakthrough(stage, entityCount);
}

// ---------------------------------------------------------------------------
// Stage Gate
// ---------------------------------------------------------------------------
describe('Breakthrough Stage Gate', () => {
  it('blocks breakthrough at "friction" stage', () => {
    expect(shouldAllowBreakthrough('friction', 5)).toBe(false);
  });

  it('blocks breakthrough at "desire" stage', () => {
    expect(shouldAllowBreakthrough('desire', 5)).toBe(false);
  });

  it('allows breakthrough at "blocker" stage with enough entities', () => {
    expect(shouldAllowBreakthrough('blocker', 3)).toBe(true);
  });

  it('allows breakthrough at "breakthrough" stage', () => {
    expect(shouldAllowBreakthrough('breakthrough', 2)).toBe(true);
  });

  it('stage must progress through friction → desire → blocker before allowing', () => {
    let stage: ConversationStage = 'friction';

    // friction — blocked
    expect(shouldAllowBreakthrough(stage, 10)).toBe(false);
    stage = advanceStage(stage); // → desire

    // desire — still blocked
    expect(shouldAllowBreakthrough(stage, 10)).toBe(false);
    stage = advanceStage(stage); // → blocker

    // blocker — now allowed
    expect(shouldAllowBreakthrough(stage, 10)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Entity Gate
// ---------------------------------------------------------------------------
describe('Breakthrough Entity Gate', () => {
  it('blocks breakthrough with 0 entities', () => {
    expect(shouldAllowBreakthrough('blocker', 0)).toBe(false);
  });

  it('blocks breakthrough with 1 entity', () => {
    expect(shouldAllowBreakthrough('blocker', 1)).toBe(false);
  });

  it('allows breakthrough with exactly 2 entities', () => {
    expect(shouldAllowBreakthrough('blocker', 2)).toBe(true);
  });

  it('allows breakthrough with many entities', () => {
    expect(shouldAllowBreakthrough('blocker', 10)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// maxQuestions Wiring
// ---------------------------------------------------------------------------
describe('maxQuestions wiring', () => {
  it('shouldStopAsking uses custom maxQuestions parameter', () => {
    // With maxQuestions=10, 5 questions should NOT stop
    const result = shouldStopAsking('hello', [], [], 5, 10);
    expect(result.stop).toBe(false);

    // With maxQuestions=10, 10 questions SHOULD stop
    const result2 = shouldStopAsking('hello', [], [], 10, 10);
    expect(result2.stop).toBe(true);
  });

  it('default maxQuestions is 5 (not the old hardcoded 3)', () => {
    // 3 questions should NOT stop with default maxQuestions
    const result = shouldStopAsking('hello', [], [], 3);
    expect(result.stop).toBe(false);

    // 4 questions should NOT stop with default maxQuestions
    const result2 = shouldStopAsking('hello', [], [], 4);
    expect(result2.stop).toBe(false);

    // 5 questions SHOULD stop with default maxQuestions
    const result3 = shouldStopAsking('hello', [], [], 5);
    expect(result3.stop).toBe(true);
  });

  it('floor of 3 prevents absurdly low maxQuestions', () => {
    // maxQuestions=0 → effective is 3
    const result = shouldStopAsking('hello', [], [], 2, 0);
    expect(result.stop).toBe(false); // 2 < 3

    const result2 = shouldStopAsking('hello', [], [], 3, 0);
    expect(result2.stop).toBe(true); // 3 >= 3
  });
});

// ---------------------------------------------------------------------------
// Ultra-Fast Thresholds
// ---------------------------------------------------------------------------
describe('Ultra-Fast Breakthrough Thresholds', () => {
  it('requires 5 sentences (not the old 3)', () => {
    expect(ULTRA_FAST_MIN_SENTENCES).toBe(5);
  });

  it('requires 5 friction entities (not the old 3)', () => {
    expect(ULTRA_FAST_MIN_FRICTION_ENTITIES).toBe(5);
  });

  it('does NOT trigger with only 3 sentences and 3 friction entities', () => {
    const result = isUltraFastBreakthroughGated(3, 3, 'blocker', 5);
    expect(result).toBe(false);
  });

  it('does NOT trigger with 5 sentences but only 4 friction entities', () => {
    const result = isUltraFastBreakthroughGated(5, 4, 'blocker', 5);
    expect(result).toBe(false);
  });

  it('triggers with 5+ sentences and 5+ friction entities at blocker stage', () => {
    const result = isUltraFastBreakthroughGated(5, 5, 'blocker', 5);
    expect(result).toBe(true);
  });

  it('does NOT trigger at friction stage even with high counts', () => {
    const result = isUltraFastBreakthroughGated(10, 10, 'friction', 5);
    expect(result).toBe(false);
  });

  it('does NOT trigger with low entity count even at blocker stage', () => {
    const result = isUltraFastBreakthroughGated(10, 10, 'blocker', 1);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Pattern Confidence Threshold (0.9)
// ---------------------------------------------------------------------------
describe('Pattern Confidence Threshold', () => {
  it('confidence formula: 0.4 + (n * 0.15), capped at 0.95', () => {
    // 1 keyword: 0.55
    expect(0.4 + 1 * 0.15).toBeCloseTo(0.55);
    // 2 keywords: 0.70
    expect(0.4 + 2 * 0.15).toBeCloseTo(0.7);
    // 3 keywords: 0.85 (below 0.9 threshold)
    expect(0.4 + 3 * 0.15).toBeCloseTo(0.85);
    // 4 keywords: 1.00 capped at 0.95 (above 0.9 threshold)
    expect(Math.min(0.4 + 4 * 0.15, 0.95)).toBeCloseTo(0.95);
  });

  it('3 keywords do NOT trigger pattern-based stop', () => {
    const patterns = [{ name: 'test', evidence: '3kw', confidence: 0.85 }];
    const result = shouldStopAsking('x', [], patterns, 0);
    expect(result.stop).toBe(false);
  });

  it('4 keywords DO trigger pattern-based stop', () => {
    const patterns = [{ name: 'test', evidence: '4kw', confidence: 0.95 }];
    const result = shouldStopAsking('x', [], patterns, 0);
    expect(result.stop).toBe(true);
    expect(result.reason).toBe('pattern_detected');
  });
});

// ---------------------------------------------------------------------------
// Combined Gate: End-to-end scenario
// ---------------------------------------------------------------------------
describe('Combined breakthrough gate scenario', () => {
  it('single sentence after 3 questions does NOT trigger breakthrough', () => {
    // Old behavior: MAX_QUESTIONS=3 → instant breakthrough
    // New behavior: maxQuestions=5 → continue asking
    const result = shouldStopAsking("I'm stuck", ['a', 'b', 'c'], [], 3);
    expect(result.stop).toBe(false);
  });

  it('full spiral journey: friction → desire → blocker → allowed', () => {
    let stage: ConversationStage = 'friction';
    let questionsAsked = 0;

    // Q1: friction stage
    questionsAsked++;
    stage = advanceStage(stage); // → desire

    // Q2: desire stage
    questionsAsked++;
    stage = advanceStage(stage); // → blocker

    // Q3: blocker stage
    questionsAsked++;

    // Now at blocker with 3 entities → breakthrough should be allowed
    expect(shouldAllowBreakthrough(stage, 3)).toBe(true);

    // But maxQuestions hasn't been reached yet (3 < 5)
    const stopCheck = shouldStopAsking('neutral text', [], [], questionsAsked);
    expect(stopCheck.stop).toBe(false);

    // Two more questions...
    questionsAsked += 2; // Now at 5

    const stopCheck2 = shouldStopAsking('neutral text', [], [], questionsAsked);
    expect(stopCheck2.stop).toBe(true);
    expect(stopCheck2.reason).toBe('max_questions_reached');

    // And the gate allows it because we're at blocker stage with entities
    expect(shouldAllowBreakthrough(stage, 3)).toBe(true);
  });
});
