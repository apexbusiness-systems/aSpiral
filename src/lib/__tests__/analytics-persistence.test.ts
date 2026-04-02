/**
 * Analytics Persistence Tests
 * Verifies that user preference persists across sessions via localStorage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock PostHog before importing analytics
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    people: { set: vi.fn() },
  },
}));

// Mock localStorage for Node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Import after mocks are set up
import { isAnalyticsEnabled, setAnalyticsEnabled } from '../analytics';

describe('Analytics Persistence', () => {
  const STORAGE_KEY = 'aspiral_analytics_enabled';

  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('manages analytics preferences in localStorage', () => {
    // Initial state
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(isAnalyticsEnabled()).toBe(true);

    // Opt out
    setAnalyticsEnabled(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    expect(isAnalyticsEnabled()).toBe(false);

    // Opt in
    setAnalyticsEnabled(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it('reads persisted preferences', () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    expect(isAnalyticsEnabled()).toBe(false);

    localStorage.setItem(STORAGE_KEY, 'true');
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it('handles localStorage errors gracefully', () => {
    const originalGetItem = localStorageMock.getItem;
    localStorageMock.getItem = () => {
      throw new Error('localStorage unavailable');
    };

    expect(isAnalyticsEnabled()).toBe(true);
    localStorageMock.getItem = originalGetItem;
  });
});
