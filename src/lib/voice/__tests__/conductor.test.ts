import { describe, it, expect, beforeEach } from 'vitest';
import {
  humanizeText,
  chunkForStreaming,
  recordUserPause,
  getAdaptiveEndpointMs,
  resetEndpointer,
  recordUserUtterance,
  getMirroredRate,
  resetRateMirror,
  getReverbTailMs,
  recordBackendSuccess,
  recordBackendFailure,
  isBackendHealthy,
  getBackendPreference,
  resetBackendScorer,
  mintUtteranceId,
  registerUtterance,
  cancelUtterance,
  getUtteranceStatus,
  planUtterance,
} from '../conductor';

describe('humanizeText', () => {
  it('strips AI-tell prefixes', () => {
    expect(humanizeText("As an AI, I think you're brave.")).toBe("I think you're brave.");
    expect(humanizeText('Certainly! Here is the answer.')).toMatch(/Here is the answer/);
  });

  it('expands spoken abbreviations', () => {
    expect(humanizeText('Use one, e.g. coffee.')).toMatch(/for example/);
    expect(humanizeText('Tea vs. coffee')).toMatch(/versus/);
    expect(humanizeText('Bread & butter')).toMatch(/and/);
  });

  it('collapses whitespace and fixes punctuation spacing', () => {
    expect(humanizeText('Hello   world  ,  friend .')).toBe('Hello world, friend.');
  });

  it('returns empty string for empty input', () => {
    expect(humanizeText('')).toBe('');
    expect(humanizeText('   ')).toBe('');
  });
});

describe('chunkForStreaming', () => {
  it('produces one chunk per sentence under soft cap', () => {
    const chunks = chunkForStreaming('First. Second! Third?');
    expect(chunks).toHaveLength(3);
    expect(chunks[2].isFinal).toBe(true);
    expect(chunks[0].isFinal).toBe(false);
  });

  it('splits long sentences on clause boundaries', () => {
    const long = 'I was walking down the street, thinking about my day, when I saw a dog, a cat, a bird, and many strange and unusual things, all gathered together near the corner.';
    const chunks = chunkForStreaming(long.repeat(2));
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.text.length).toBeLessThanOrEqual(260));
  });

  it('assigns longer dwell after periods than commas', () => {
    const chunks = chunkForStreaming('A pause, then a stop.');
    // single sentence => one chunk, ending in period
    expect(chunks[0].trailingPauseMs).toBe(220);
  });

  it('returns [] for empty input', () => {
    expect(chunkForStreaming('')).toEqual([]);
  });
});

describe('adaptive endpointer', () => {
  beforeEach(() => resetEndpointer());

  it('returns default before calibration', () => {
    expect(getAdaptiveEndpointMs()).toBe(700);
  });

  it('learns from samples and clamps to bounds', () => {
    [200, 250, 300, 400, 500, 600].forEach(recordUserPause);
    const v = getAdaptiveEndpointMs();
    expect(v).toBeGreaterThanOrEqual(350);
    expect(v).toBeLessThanOrEqual(1400);
  });

  it('ignores invalid samples', () => {
    recordUserPause(-1);
    recordUserPause(NaN);
    recordUserPause(0);
    expect(getAdaptiveEndpointMs()).toBe(700);
  });
});

describe('rate mirror', () => {
  beforeEach(() => resetRateMirror());

  it('returns default rate before any samples', () => {
    expect(getMirroredRate()).toBe(1.05);
  });

  it('mirrors fast speakers within bounds', () => {
    // 30 words in 6s = 300 wpm → mirror should clamp to 1.25
    recordUserUtterance(30, 6000);
    expect(getMirroredRate()).toBe(1.25);
  });

  it('mirrors slow speakers within bounds', () => {
    // 10 words in 12s = 50 wpm → mirror should clamp to 0.85
    recordUserUtterance(10, 12000);
    expect(getMirroredRate()).toBe(0.85);
  });

  it('rejects unrealistic samples', () => {
    recordUserUtterance(2, 100);
    expect(getMirroredRate()).toBe(1.05);
  });
});

describe('reverb tail per device', () => {
  it('returns longest tail for iOS', () => {
    expect(getReverbTailMs('ios')).toBeGreaterThan(getReverbTailMs('desktop'));
    expect(getReverbTailMs('android')).toBeGreaterThan(getReverbTailMs('desktop'));
  });
});

describe('backend health scorer', () => {
  beforeEach(() => resetBackendScorer());

  it('starts all backends healthy', () => {
    expect(isBackendHealthy('groq')).toBe(true);
    expect(isBackendHealthy('openai')).toBe(true);
  });

  it('opens circuit after threshold failures', () => {
    recordBackendFailure('groq');
    recordBackendFailure('groq');
    expect(isBackendHealthy('groq')).toBe(true);
    recordBackendFailure('groq');
    expect(isBackendHealthy('groq')).toBe(false);
  });

  it('orders preference by EMA latency', () => {
    recordBackendSuccess('groq', 200);
    recordBackendSuccess('openai', 800);
    const order = getBackendPreference();
    expect(order[0]).toBe('groq');
    expect(order.indexOf('groq')).toBeLessThan(order.indexOf('openai'));
  });

  it('excludes tripped backends from preference', () => {
    recordBackendFailure('groq');
    recordBackendFailure('groq');
    recordBackendFailure('groq');
    expect(getBackendPreference()).not.toContain('groq');
  });

  it('success resets failure count', () => {
    recordBackendFailure('openai');
    recordBackendFailure('openai');
    recordBackendSuccess('openai', 300);
    recordBackendFailure('openai');
    recordBackendFailure('openai');
    expect(isBackendHealthy('openai')).toBe(true);
  });
});

describe('utterance ledger (atomic, idempotent)', () => {
  it('mints unique ids', () => {
    const a = mintUtteranceId();
    const b = mintUtteranceId();
    expect(a).not.toBe(b);
  });

  it('cancel is idempotent and only first call returns true', () => {
    let cancelled = 0;
    const id = mintUtteranceId();
    registerUtterance(id, () => { cancelled += 1; });
    expect(cancelUtterance(id)).toBe(true);
    expect(cancelUtterance(id)).toBe(false);
    expect(cancelUtterance(id)).toBe(false);
    expect(cancelled).toBe(1);
    expect(getUtteranceStatus(id)).toBe('cancelled');
  });

  it('cancel of unknown id is safe', () => {
    expect(cancelUtterance('utt_does_not_exist')).toBe(false);
  });

  it('swallows cancel callback errors', () => {
    const id = mintUtteranceId();
    registerUtterance(id, () => { throw new Error('boom'); });
    expect(() => cancelUtterance(id)).not.toThrow();
  });
});

describe('planUtterance façade', () => {
  it('produces a complete plan with stable shape', () => {
    const plan = planUtterance('Hello there. How are you today?');
    expect(plan.utteranceId).toMatch(/^utt_/);
    expect(plan.chunks.length).toBeGreaterThan(0);
    expect(plan.chunks[plan.chunks.length - 1].isFinal).toBe(true);
    expect(plan.recommendedRate).toBeGreaterThan(0);
    expect(plan.bargeInGateMs).toBeGreaterThan(0);
    expect(Array.isArray(plan.preferredBackends)).toBe(true);
  });

  it('produces empty chunks for empty input but still a valid plan', () => {
    const plan = planUtterance('');
    expect(plan.chunks).toEqual([]);
    expect(plan.utteranceId).toBeTruthy();
  });
});
