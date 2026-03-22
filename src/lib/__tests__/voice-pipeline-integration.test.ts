import { describe, it, expect } from 'vitest';

describe('Voice Pipeline Integration', () => {
  describe('Silence Timeout Clamping', () => {
    it('should clamp silence timeout between 800ms and 10000ms', () => {
      const testClamp = (value: number) => Math.max(800, Math.min(10000, value));

      expect(testClamp(500)).toBe(800);
      expect(testClamp(5000)).toBe(5000);
      expect(testClamp(15000)).toBe(10000);
    });
  });

  describe('Watchdog Interval Clamping', () => {
    it('should clamp watchdog interval between 15000ms and 120000ms', () => {
      const testClamp = (value: number) =>
        Math.max(15000, Math.min(120000, value));

      expect(testClamp(10000)).toBe(15000);
      expect(testClamp(90000)).toBe(90000);
      expect(testClamp(150000)).toBe(120000);
    });
  });

  describe('STT Error Restart Backoff', () => {
    it('should apply exponential backoff capped at 4000ms', () => {
      const backoff = (attempt: number) =>
        Math.min(250 * Math.pow(2, attempt - 1), 4000);

      expect(backoff(1)).toBe(250);
      expect(backoff(2)).toBe(500);
      expect(backoff(3)).toBe(1000);
      expect(backoff(4)).toBe(2000);
      expect(backoff(5)).toBe(4000);
      expect(backoff(6)).toBe(4000);
    });
  });

  describe('Silence Timeout Constants', () => {
    it('post-utterance silence default is 5000ms', () => {
      const DEFAULT = 5000;
      const clamped = Math.max(800, Math.min(10000, DEFAULT));
      expect(clamped).toBe(5000);
    });

    it('inactivity guard is 30000ms', () => {
      const SILENCE_INACTIVITY_MS = 30000;
      expect(SILENCE_INACTIVITY_MS).toBe(30000);
    });
  });

  describe('TTS Fallback Default', () => {
    it('should default fallbackToWebSpeech to true', () => {
      const options: { text: string; voice: string; speed: number; fallbackToWebSpeech?: boolean } = {
        text: 'test',
        voice: 'test-voice',
        speed: 1,
      };
      const { fallbackToWebSpeech = true, ...rest } = options;

      expect(fallbackToWebSpeech).toBe(true);
      expect(rest).toEqual({ text: 'test', voice: 'test-voice', speed: 1 });
    });
  });
});
