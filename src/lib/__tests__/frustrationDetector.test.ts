import { describe, it, expect } from 'vitest';
import { isUserFrustrated, wantsToSkip, detectFrustrationLevel } from '../frustrationDetector';

describe('frustrationDetector', () => {
  describe('isUserFrustrated', () => {
    it('should return true for obvious frustration patterns', () => {
      expect(isUserFrustrated('this is annoying')).toBe(true);
      expect(isUserFrustrated('stop it')).toBe(true);
      expect(isUserFrustrated('wtf is this?')).toBe(true);
      expect(isUserFrustrated('seriously?')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isUserFrustrated('STOP')).toBe(true);
      expect(isUserFrustrated('ANNOYING')).toBe(true);
    });

    it('should return false for neutral or positive input', () => {
      expect(isUserFrustrated('hello')).toBe(false);
      expect(isUserFrustrated('thank you')).toBe(false);
      expect(isUserFrustrated('this is great')).toBe(false);
    });

    it('should catch complex phrases', () => {
      expect(isUserFrustrated('cut the crap now')).toBe(true);
      expect(isUserFrustrated('cut the bullshit')).toBe(true);
      expect(isUserFrustrated('you\'re not helping at all')).toBe(true);
    });
  });

  describe('wantsToSkip', () => {
    it('should return true for skip requests', () => {
      expect(wantsToSkip('skip this')).toBe(true);
      expect(wantsToSkip('just tell me the answer')).toBe(true);
      expect(wantsToSkip('get to the point')).toBe(true);
    });

    it('should return false for input that doesn\'t express skip intent', () => {
      expect(wantsToSkip('tell me more')).toBe(false);
      expect(wantsToSkip('i like this')).toBe(false);
    });
  });

  describe('detectFrustrationLevel', () => {
    it('should return "none" when no patterns match', () => {
      expect(detectFrustrationLevel('i am happy')).toBe('none');
    });

    it('should return "mild" when one pattern matches', () => {
      expect(detectFrustrationLevel('this is annoying')).toBe('mild');
    });

    it('should return "high" when two or more patterns match', () => {
      // "stop" and "annoying" are both patterns
      expect(detectFrustrationLevel('stop, this is annoying')).toBe('high');
      // "wtf" and "seriously"
      expect(detectFrustrationLevel('wtf seriously?')).toBe('high');
    });

    it('should count distinct patterns', () => {
       // "stop" is one pattern. If repeated, it might still only count as one in the current implementation?
       // Let's check the implementation: FRUSTRATION_PATTERNS.filter((p) => p.test(transcript)).length;
       // Yes, it filters the patterns, not the occurrences of the same pattern.
       expect(detectFrustrationLevel('stop stop stop')).toBe('mild');
       expect(detectFrustrationLevel('stop annoying')).toBe('high');
    });
  });
});
