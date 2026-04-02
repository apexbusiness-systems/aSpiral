import { describe, it, expect } from 'vitest';
import { secureMathRandom } from '../secureMathRandom';

describe('secureMathRandom', () => {
  it('should return a number between 0 and 1', () => {
    for (let i = 0; i < 100; i++) {
      const result = secureMathRandom();
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    }
  });

  it('should return different values', () => {
    const results = new Set();
    for (let i = 0; i < 100; i++) {
      results.add(secureMathRandom());
    }
    expect(results.size).toBeGreaterThan(95);
  });
});
