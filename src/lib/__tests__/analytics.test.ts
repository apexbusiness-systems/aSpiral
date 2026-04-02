/**
 * Analytics Module Tests
 * Verifies that analytics tracking functions call PostHog correctly and handle errors via safeExecute
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock logger
const loggerMock = {
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
};

vi.mock('../logger', () => ({
  createLogger: () => loggerMock,
}));

// Mock PostHog
const posthogMock = {
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  people: { set: vi.fn() },
};

// Use manual mock for Bun test compatibility if needed, but here we still use vi.mock
vi.mock('posthog-js', () => ({
  default: posthogMock,
}));

// Mock localStorage for Node/Bun environment
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

// Import the module to test
import {
  trackSessionStart,
  trackBreakthrough,
  trackEntityCreated,
  initAnalytics,
  setAnalyticsEnabled
} from '../analytics';

describe('Analytics Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackSessionStart', () => {
    it('calls posthog.capture with correct data', () => {
      const data = {
        sessionId: 'test-session',
        userId: 'test-user',
        isAuthenticated: true,
        deviceType: 'desktop' as const,
      };

      trackSessionStart(data);

      expect(posthogMock.capture).toHaveBeenCalledWith('session_started', expect.objectContaining({
        sessionId: 'test-session',
        userId: 'test-user',
        isAuthenticated: true,
      }));
    });

    it('handles errors via logger.error', () => {
      posthogMock.capture.mockImplementationOnce(() => {
        throw new Error('PostHog capture failed');
      });

      trackSessionStart({
        sessionId: 'test-session',
        userId: 'test-user',
        isAuthenticated: true,
        deviceType: 'desktop',
      });

      expect(loggerMock.error).toHaveBeenCalledWith(
        'Failed to track session start',
        expect.any(Error)
      );
    });
  });

  describe('trackBreakthrough', () => {
    it('truncates long strings before capturing', () => {
      const data = {
        sessionId: 'test-session',
        friction: 'f'.repeat(300),
        grease: 'g'.repeat(300),
        insight: 'i'.repeat(600),
        timeToBreakthrough: 100,
        entityCount: 5,
        questionCount: 3,
        ultraFastMode: false,
      };

      trackBreakthrough(data);

      const captureCall = posthogMock.capture.mock.calls[0];
      const capturedData = captureCall[1];

      expect(capturedData.friction.length).toBe(200);
      expect(capturedData.grease.length).toBe(200);
      expect(capturedData.insight.length).toBe(500);
    });
  });

  describe('setAnalyticsEnabled', () => {
    it('calls posthog opt-in/out methods', () => {
      initAnalytics();

      setAnalyticsEnabled(true);
      expect(posthogMock.opt_in_capturing).toHaveBeenCalled();

      setAnalyticsEnabled(false);
      expect(posthogMock.opt_out_capturing).toHaveBeenCalled();
    });
  });

  describe('trackEntityCreated', () => {
    it('tracks entity creation', () => {
      const data = {
        sessionId: 'test-session',
        entityId: 'ent-1',
        entityType: 'thought',
        totalEntities: 1,
        method: 'manual' as const,
      };

      trackEntityCreated(data);

      expect(posthogMock.capture).toHaveBeenCalledWith('entity_created', expect.objectContaining({
        entityId: 'ent-1',
        totalEntities: 1,
      }));
    });
  });
});
