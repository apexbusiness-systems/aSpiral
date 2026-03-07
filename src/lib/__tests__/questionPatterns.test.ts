import { describe, it, expect } from 'vitest';
import {
  getAvailablePatterns,
  getRandomPattern,
  STAGE_PATTERNS,
  QUESTION_PATTERNS
} from '../questionPatterns';

describe('questionPatterns', () => {
  describe('getAvailablePatterns', () => {
    it('should return patterns for a valid stage', () => {
      const patterns = getAvailablePatterns('surface', new Set());
      expect(patterns).toEqual(STAGE_PATTERNS.surface);
    });

    it('should default to surface patterns for an unknown stage', () => {
      const patterns = getAvailablePatterns('non-existent', new Set());
      expect(patterns).toEqual(STAGE_PATTERNS.surface);
    });

    it('should filter out used categories', () => {
      const used = new Set(['direct']);
      const patterns = getAvailablePatterns('surface', used);
      // surface patterns are ["direct", "reflection", "curiosity"]
      expect(patterns).toEqual(['reflection', 'curiosity']);
      expect(patterns).not.toContain('direct');
    });

    it('should reset (return all) when all categories for the stage are used', () => {
      const allSurfaceUsed = new Set(STAGE_PATTERNS.surface);
      const patterns = getAvailablePatterns('surface', allSurfaceUsed);
      expect(patterns).toEqual(STAGE_PATTERNS.surface);
    });

    it('should handle empty usedCategories', () => {
      const patterns = getAvailablePatterns('excavation', new Set());
      expect(patterns).toEqual(STAGE_PATTERNS.excavation);
    });
  });

  describe('getRandomPattern', () => {
    it('should return a pattern from the specified category', () => {
      const category = 'direct';
      const pattern = getRandomPattern(category);
      expect(QUESTION_PATTERNS.direct).toContain(pattern);
    });

    it('should return a pattern from another specified category', () => {
      const category = 'reflection';
      const pattern = getRandomPattern(category);
      expect(QUESTION_PATTERNS.reflection).toContain(pattern);
    });

    it('should return different patterns over multiple calls (probabilistic)', () => {
      const category = 'direct';
      const results = new Set();
      // 'direct' has 4 patterns.
      for (let i = 0; i < 20; i++) {
        results.add(getRandomPattern(category));
      }
      // With 20 tries and 4 patterns, we should almost certainly hit more than 1
      expect(results.size).toBeGreaterThan(1);
    });
  });
});
