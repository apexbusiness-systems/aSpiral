/**
 * FastTrack Tests
 *
 * Covers: shouldStopAsking, detectPatternsEarly, advanceStage,
 * pattern confidence thresholds, maxQuestions parameterization,
 * stage progression, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  shouldStopAsking,
  detectPatternsEarly,
  advanceStage,
  createFastTrackState,
  getStageQuestion,
} from '@/lib/fastTrack';

// ---------------------------------------------------------------------------
// shouldStopAsking
// ---------------------------------------------------------------------------
describe('shouldStopAsking', () => {
  const empty: string[] = [];

  // ---------- maxQuestions enforcement ----------
  describe('maxQuestions enforcement', () => {
    it('stops when questionsAsked reaches default maxQuestions (5)', () => {
      const result = shouldStopAsking('hello', ['a', 'b', 'c', 'd', 'e'], [], 5);
      expect(result.stop).toBe(true);
      expect(result.reason).toBe('max_questions_reached');
    });

    it('does NOT stop when questionsAsked is below maxQuestions', () => {
      const result = shouldStopAsking('hello', ['a', 'b'], [], 2);
      expect(result.stop).toBe(false);
    });

    it('respects custom maxQuestions parameter', () => {
      // 7 questions asked, maxQuestions = 7 → stop
      const result = shouldStopAsking('hello', [], [], 7, 7);
      expect(result.stop).toBe(true);
      expect(result.reason).toBe('max_questions_reached');
    });

    it('enforces floor of 3 even if maxQuestions is lower', () => {
      // maxQuestions=1 but floor is 3 → should NOT stop at 2
      const result = shouldStopAsking('hello', [], [], 2, 1);
      expect(result.stop).toBe(false);

      // Should stop at 3 (the floor)
      const result2 = shouldStopAsking('hello', [], [], 3, 1);
      expect(result2.stop).toBe(true);
    });
  });

  // ---------- "I don't know" detection ----------
  describe('I dont know detection', () => {
    it('stops after 2+ "I dont know" responses', () => {
      const history = ["i don't know", "idk what to say"];
      const result = shouldStopAsking('hello', history, [], 0);
      expect(result.stop).toBe(true);
      expect(result.reason).toBe('user_stuck');
    });

    it('does NOT stop after 1 "I dont know"', () => {
      const history = ["i don't know", "something else"];
      const result = shouldStopAsking('hello', history, [], 0);
      expect(result.stop).toBe(false);
    });

    it('detects variant phrasings: "not sure", "no idea", "dunno"', () => {
      const history = ["not sure about that", "no idea really"];
      const result = shouldStopAsking('hello', history, [], 0);
      expect(result.stop).toBe(true);
      expect(result.reason).toBe('user_stuck');
    });
  });

  // ---------- Pattern confidence threshold ----------
  describe('pattern confidence threshold', () => {
    it('stops when a pattern has confidence > 0.9', () => {
      const patterns = [{ name: 'test-pattern', evidence: 'many keywords', confidence: 0.95 }];
      const result = shouldStopAsking('hello', empty, patterns, 0);
      expect(result.stop).toBe(true);
      expect(result.reason).toBe('pattern_detected');
    });

    it('does NOT stop when pattern confidence is exactly 0.9', () => {
      const patterns = [{ name: 'test-pattern', evidence: 'some keywords', confidence: 0.9 }];
      const result = shouldStopAsking('hello', empty, patterns, 0);
      expect(result.stop).toBe(false);
    });

    it('does NOT stop when pattern confidence is 0.85 (old threshold)', () => {
      const patterns = [{ name: 'test-pattern', evidence: 'keywords', confidence: 0.85 }];
      const result = shouldStopAsking('hello', empty, patterns, 0);
      expect(result.stop).toBe(false);
    });
  });

  // ---------- User skip request ----------
  describe('user skip request', () => {
    it('stops when user says "just tell me"', () => {
      const result = shouldStopAsking('just tell me already', empty, [], 0);
      expect(result.stop).toBe(true);
      expect(result.reason).toBe('user_requested_skip');
    });

    it('stops when user says "skip"', () => {
      const result = shouldStopAsking('skip this please', empty, [], 0);
      expect(result.stop).toBe(true);
    });

    it('stops when user says "get to the point"', () => {
      const result = shouldStopAsking('get to the point', empty, [], 0);
      expect(result.stop).toBe(true);
    });
  });

  // ---------- User repetition ----------
  describe('user repetition detection', () => {
    it('stops when user repeats same thing twice', () => {
      const history = [
        "I feel stuck in my work and overwhelmed",
        "I feel stuck in my work and overwhelmed",
      ];
      const result = shouldStopAsking('next', history, [], 0);
      expect(result.stop).toBe(true);
      expect(result.reason).toBe('user_repeating');
    });

    it('does NOT stop when messages are different', () => {
      const history = [
        "I feel stuck in my work",
        "My boss is causing problems",
      ];
      const result = shouldStopAsking('next', history, [], 0);
      expect(result.stop).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// detectPatternsEarly
// ---------------------------------------------------------------------------
describe('detectPatternsEarly', () => {
  it('detects control-vs-chaos pattern from keywords', () => {
    const patterns = detectPatternsEarly("I can't control anything, it's chaos", []);
    const match = patterns.find(p => p.name === 'control-vs-chaos');
    expect(match).toBeDefined();
    expect(match!.confidence).toBeGreaterThan(0);
  });

  it('increases confidence with more keyword matches', () => {
    const low = detectPatternsEarly("I feel helpless", []);
    const high = detectPatternsEarly("I feel helpless, out of control, chaos everywhere, can't control anything", []);

    const lowMatch = low.find(p => p.name === 'control-vs-chaos');
    const highMatch = high.find(p => p.name === 'control-vs-chaos');

    expect(highMatch!.confidence).toBeGreaterThan(lowMatch!.confidence);
  });

  it('requires 4+ keywords to exceed 0.9 confidence', () => {
    // 3 keywords: 0.4 + 3*0.15 = 0.85 (below 0.9)
    const threeKw = detectPatternsEarly("control chaos helpless", []);
    const match3 = threeKw.find(p => p.name === 'control-vs-chaos');
    expect(match3).toBeDefined();
    expect(match3!.confidence).toBeLessThanOrEqual(0.9);

    // 4 keywords: 0.4 + 4*0.15 = 1.0 capped at 0.95 (above 0.9)
    const fourKw = detectPatternsEarly("control chaos helpless unpredictable", []);
    const match4 = fourKw.find(p => p.name === 'control-vs-chaos');
    expect(match4).toBeDefined();
    expect(match4!.confidence).toBeGreaterThan(0.9);
  });

  it('accumulates keywords from conversation history', () => {
    const history = ["I feel out of control"];
    const patterns = detectPatternsEarly("everything is chaos and unpredictable", history);
    const match = patterns.find(p => p.name === 'control-vs-chaos');
    expect(match).toBeDefined();
    // "control" + "out of control" from history + "chaos" + "unpredictable" = 4+ keywords
    expect(match!.confidence).toBeGreaterThan(0.7);
  });

  it('returns empty array for no pattern matches', () => {
    const patterns = detectPatternsEarly("the weather is nice today", []);
    expect(patterns).toHaveLength(0);
  });

  it('returns at most 3 patterns sorted by confidence', () => {
    // Trigger many patterns at once
    const text = "I can't control anything, they expect me to be perfect, I'm scared and avoiding it, not enough time, they judge me, either this or nothing, worst disaster ever";
    const patterns = detectPatternsEarly(text, []);
    expect(patterns.length).toBeLessThanOrEqual(3);
    // Sorted by confidence descending
    for (let i = 1; i < patterns.length; i++) {
      expect(patterns[i - 1].confidence).toBeGreaterThanOrEqual(patterns[i].confidence);
    }
  });
});

// ---------------------------------------------------------------------------
// advanceStage
// ---------------------------------------------------------------------------
describe('advanceStage', () => {
  it('advances friction → desire', () => {
    expect(advanceStage('friction')).toBe('desire');
  });

  it('advances desire → blocker', () => {
    expect(advanceStage('desire')).toBe('blocker');
  });

  it('advances blocker → breakthrough', () => {
    expect(advanceStage('blocker')).toBe('breakthrough');
  });

  it('breakthrough stays at breakthrough', () => {
    expect(advanceStage('breakthrough')).toBe('breakthrough');
  });
});

// ---------------------------------------------------------------------------
// createFastTrackState
// ---------------------------------------------------------------------------
describe('createFastTrackState', () => {
  it('creates clean initial state', () => {
    const state = createFastTrackState();
    expect(state.stage).toBe('friction');
    expect(state.questionsAsked).toBe(0);
    expect(state.detectedPatterns).toEqual([]);
    expect(state.readyForBreakthrough).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getStageQuestion
// ---------------------------------------------------------------------------
describe('getStageQuestion', () => {
  it('returns prompts for friction stage', () => {
    const q = getStageQuestion('friction');
    expect(q.systemPrompt).toContain('grinding');
    expect(q.maxWords).toBe(15);
  });

  it('returns prompts for desire stage', () => {
    const q = getStageQuestion('desire');
    expect(q.systemPrompt).toContain('want');
    expect(q.maxWords).toBe(15);
  });

  it('returns prompts for blocker stage', () => {
    const q = getStageQuestion('blocker');
    expect(q.systemPrompt).toContain('block');
    expect(q.maxWords).toBe(15);
  });

  it('returns empty for breakthrough stage', () => {
    const q = getStageQuestion('breakthrough');
    expect(q.systemPrompt).toBe('');
    expect(q.maxWords).toBe(0);
  });
});
