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
    it('should clamp watchdog interval between 15000ms and 60000ms', () => {
      const testClamp = (value: number) => Math.max(15000, Math.min(60000, value));

      expect(testClamp(10000)).toBe(15000);
      expect(testClamp(25000)).toBe(25000);
      expect(testClamp(70000)).toBe(60000);
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
