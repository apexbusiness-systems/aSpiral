import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBreakthroughHistory,
  recordBreakthrough,
  getOverallStats,
  getVariantStats,
  clearBreakthroughHistory,
  refreshBreakthroughHistory
} from '../history';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    length: 0,
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

// Assign directly for bun test compatibility
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('BreakthroughHistory', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearBreakthroughHistory();
    refreshBreakthroughHistory();
  });

  it('should initialize with empty history', () => {
    const history = getBreakthroughHistory();
    expect(history.entries).toEqual([]);

    const stats = getOverallStats();
    expect(stats.totalPlays).toBe(0);
    expect(stats.uniqueVariants).toBe(0);
  });

  it('should record a breakthrough and update stats', () => {
    recordBreakthrough('v1', 123, 'medium', 'high', true, false);

    const history = getBreakthroughHistory();
    expect(history.entries.length).toBe(1);
    expect(history.entries[0].variantId).toBe('v1');

    const stats = getOverallStats();
    expect(stats.totalPlays).toBe(1);
    expect(stats.completionRate).toBe(1);
    expect(stats.fallbackRate).toBe(0);
    expect(stats.uniqueVariants).toBe(1);
    expect(stats.averageIntensity).toBe(2); // medium = 2
  });

  it('should calculate overall stats correctly with multiple entries', () => {
    recordBreakthrough('v1', 1, 'low', 'mid', true, false);    // intensity 1
    recordBreakthrough('v2', 2, 'medium', 'mid', false, true); // intensity 2
    recordBreakthrough('v1', 3, 'high', 'mid', true, false);   // intensity 3

    const stats = getOverallStats();
    expect(stats.totalPlays).toBe(3);
    expect(stats.completionRate).toBe(2/3);
    expect(stats.fallbackRate).toBe(1/3);
    expect(stats.uniqueVariants).toBe(2);
    expect(stats.averageIntensity).toBe((1 + 2 + 3) / 3);
  });

  it('should calculate variant stats correctly', () => {
    recordBreakthrough('v1', 1, 'low', 'mid', true, false);
    recordBreakthrough('v2', 2, 'medium', 'mid', false, true);
    recordBreakthrough('v1', 3, 'high', 'mid', false, false);

    const v1Stats = getVariantStats('v1');
    expect(v1Stats.playCount).toBe(2);
    expect(v1Stats.completionRate).toBe(0.5);
    expect(v1Stats.fallbackRate).toBe(0);

    const v2Stats = getVariantStats('v2');
    expect(v2Stats.playCount).toBe(1);
    expect(v2Stats.completionRate).toBe(0);
    expect(v2Stats.fallbackRate).toBe(1);

    const v3Stats = getVariantStats('v3');
    expect(v3Stats.playCount).toBe(0);
  });
});
