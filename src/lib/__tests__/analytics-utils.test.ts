/**
 * Analytics Utils Tests
 * Verifies core analytics logic and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isAnalyticsEnabled, ANALYTICS_ENABLED_KEY } from '../analytics-utils';

// Mock localStorage for Node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('isAnalyticsEnabled', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('returns true when no preference is set', () => {
    localStorageMock.getItem.mockReturnValue(null);
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it('returns true when preference is set to "true"', () => {
    localStorageMock.getItem.mockReturnValue('true');
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it('returns false when preference is set to "false"', () => {
    localStorageMock.getItem.mockReturnValue('false');
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it('returns true when localStorage.getItem throws an error', () => {
    // Force an error to test the catch block
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    // The catch block should return true (default to enabled)
    expect(isAnalyticsEnabled()).toBe(true);
    expect(localStorageMock.getItem).toHaveBeenCalledWith(ANALYTICS_ENABLED_KEY);
  });

  it('correctly uses the expected storage key', () => {
    isAnalyticsEnabled();
    expect(localStorageMock.getItem).toHaveBeenCalledWith('aspiral_analytics_enabled');
    expect(ANALYTICS_ENABLED_KEY).toBe('aspiral_analytics_enabled');
  });
});
