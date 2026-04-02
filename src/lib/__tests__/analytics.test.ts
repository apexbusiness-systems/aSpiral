/**
 * Analytics Module Integrated Tests
 * Verifies tracking logic, error handling, and preference persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// --- Mocks ---

const loggerMock = {
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
};

vi.mock('../logger', () => ({
  createLogger: () => loggerMock,
}));

const posthogMock = {
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  people: { set: vi.fn() },
};

vi.mock('posthog-js', () => ({
  default: posthogMock,
}));

const storageMock = (() => {
  let data: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => data[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { data[k] = v; }),
    removeItem: vi.fn((k: string) => { delete data[k]; }),
    clear: vi.fn(() => { data = {}; }),
    get length() { return Object.keys(data).length; },
    key: (i: number) => Object.keys(data)[i] ?? null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: storageMock });

// --- Imports ---

import {
  trackSessionStart,
  trackBreakthrough,
  trackEntityCreated,
  initAnalytics,
  setAnalyticsEnabled,
  isAnalyticsEnabled
} from '../analytics';

// --- Tests ---

describe('Analytics Integration', () => {
  const PREF_KEY = 'aspiral_analytics_enabled';

  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.clear();
  });

  afterEach(() => {
    storageMock.clear();
  });

  describe('Tracking Logic', () => {
    it('captures session start with device context', () => {
      trackSessionStart({
        sessionId: 's-123',
        userId: 'u-456',
        isAuthenticated: true,
        deviceType: 'desktop',
      });

      expect(posthogMock.capture).toHaveBeenCalledWith('session_started', expect.objectContaining({
        sessionId: 's-123',
        userId: 'u-456',
      }));
    });

    it('safely handles tracker failures', () => {
      posthogMock.capture.mockImplementationOnce(() => {
        throw new Error('Tracker crashed');
      });

      trackSessionStart({
        sessionId: 's-1',
        userId: 'u-1',
        isAuthenticated: true,
        deviceType: 'desktop',
      });

      expect(loggerMock.error).toHaveBeenCalledWith(
        'Failed to track session start',
        expect.any(Error)
      );
    });

    it('limits string lengths for complex event data', () => {
      trackBreakthrough({
        sessionId: 's-1',
        friction: 'f'.repeat(500),
        grease: 'g'.repeat(500),
        insight: 'i'.repeat(1000),
        timeToBreakthrough: 45,
        entityCount: 2,
        questionCount: 2,
        ultraFastMode: true,
      });

      const args = posthogMock.capture.mock.calls[0][1];
      expect(args.friction.length).toBe(200);
      expect(args.grease.length).toBe(200);
      expect(args.insight.length).toBe(500);
    });

    it('logs entity creation events', () => {
      trackEntityCreated({
        sessionId: 's-1',
        entityId: 'e-1',
        entityType: 'fact',
        totalEntities: 10,
        method: 'ai_extracted',
      });

      expect(posthogMock.capture).toHaveBeenCalledWith('entity_created', expect.objectContaining({
        entityId: 'e-1',
      }));
    });
  });

  describe('Preference Persistence', () => {
    it('synchronizes user choice with localStorage and tracker state', () => {
      initAnalytics();

      setAnalyticsEnabled(false);
      expect(storageMock.getItem(PREF_KEY)).toBe('false');
      expect(isAnalyticsEnabled()).toBe(false);
      expect(posthogMock.opt_out_capturing).toHaveBeenCalled();

      setAnalyticsEnabled(true);
      expect(storageMock.getItem(PREF_KEY)).toBe('true');
      expect(isAnalyticsEnabled()).toBe(true);
      expect(posthogMock.opt_in_capturing).toHaveBeenCalled();
    });

    it('reloads saved preferences from storage', () => {
      storageMock.getItem.mockReturnValue('false');
      expect(isAnalyticsEnabled()).toBe(false);

      storageMock.getItem.mockReturnValue('true');
      expect(isAnalyticsEnabled()).toBe(true);
    });

    it('defaults to enabled when storage access fails', () => {
      storageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Privacy sandbox restricted');
      });

      expect(isAnalyticsEnabled()).toBe(true);
    });
  });
});
