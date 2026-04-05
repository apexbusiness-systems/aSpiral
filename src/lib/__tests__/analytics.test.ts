import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockLogger, mockPosthog } = vi.hoisted(() => ({
  mockLogger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
  mockPosthog: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    people: { set: vi.fn() },
  }
}));

vi.mock('@/lib/logger', () => ({ createLogger: () => mockLogger }));
vi.mock('../logger', () => ({ createLogger: () => mockLogger }));

vi.mock('posthog-js', () => ({
  default: mockPosthog,
}));

vi.mock('../analytics-utils', () => {
  return {
    ANALYTICS_ENABLED_KEY: 'aspiral_analytics_enabled',
    isAnalyticsEnabled: vi.fn(() => true),
  };
});

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
Object.defineProperty(globalThis, 'localStorage', { value: storageMock, configurable: true });
Object.defineProperty(globalThis, 'location', { value: { href: 'http://localhost' }, configurable: true });

// Mock import.meta.env
vi.stubEnv('VITE_POSTHOG_KEY', 'test-key');
vi.stubEnv('VITE_POSTHOG_HOST', 'test-host');

import * as analyticsUtils from '../analytics-utils';
import posthog from 'posthog-js';
import { createLogger } from '../logger';

describe('Analytics Integration', () => {
  const PREF_KEY = 'aspiral_analytics_enabled';

  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.clear();
    storageMock.setItem(PREF_KEY, 'true');
    vi.mocked(analyticsUtils.isAnalyticsEnabled).mockReturnValue(true);
  });

  afterEach(() => {
    storageMock.clear();
    vi.resetModules();
  });

  describe('Tracking Logic', () => {
    it('captures session start with device context', async () => {
      const { trackSessionStart, initAnalytics } = await import('../analytics');
      initAnalytics();

      trackSessionStart({
        sessionId: 's-123',
        userId: 'u-456',
        isAuthenticated: true,
        deviceType: 'desktop',
      });

      expect(posthog.capture).toHaveBeenCalledWith('session_started', expect.objectContaining({
        sessionId: 's-123',
        userId: 'u-456',
      }));
    });

    it('safely handles tracker failures', async () => {
      const { trackSessionStart, initAnalytics } = await import('../analytics');
      initAnalytics();

      vi.mocked(posthog.capture).mockImplementationOnce(() => {
        throw new Error('Tracker crashed');
      });

      trackSessionStart({
        sessionId: 's-1',
        userId: 'u-1',
        isAuthenticated: true,
        deviceType: 'desktop',
      });

      const mockedLogger = createLogger('Context');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to track session start',
        expect.any(Error)
      );
    });

    it('limits string lengths for complex event data', async () => {
      const { trackBreakthrough, initAnalytics } = await import('../analytics');
      initAnalytics();

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

      const args = vi.mocked(posthog.capture).mock.calls[0][1] as any;
      expect(args.friction.length).toBe(200);
      expect(args.grease.length).toBe(200);
      expect(args.insight.length).toBe(500);
    });

    it('logs entity creation events', async () => {
      const { trackEntityCreated, initAnalytics } = await import('../analytics');
      initAnalytics();

      trackEntityCreated({
        sessionId: 's-1',
        entityId: 'e-1',
        entityType: 'fact',
        totalEntities: 10,
        method: 'ai_extracted',
      });

      expect(posthog.capture).toHaveBeenCalledWith('entity_created', expect.objectContaining({
        entityId: 'e-1',
      }));
    });
  });

  describe('Preference Persistence', () => {
    it('synchronizes user choice with localStorage and tracker state', async () => {
      const { setAnalyticsEnabled, initAnalytics } = await import('../analytics');
      initAnalytics();

      setAnalyticsEnabled(false);
      expect(storageMock.setItem).toHaveBeenCalledWith(PREF_KEY, 'false');
      expect(posthog.opt_out_capturing).toHaveBeenCalled();

      setAnalyticsEnabled(true);
      expect(storageMock.setItem).toHaveBeenCalledWith(PREF_KEY, 'true');
      expect(posthog.opt_in_capturing).toHaveBeenCalled();
    });

    it('reloads saved preferences from storage logic uses analyticsUtils', async () => {
      const { isAnalyticsEnabled } = await import('../analytics');

      vi.mocked(analyticsUtils.isAnalyticsEnabled).mockReturnValue(false);
      expect(isAnalyticsEnabled()).toBe(false);

      vi.mocked(analyticsUtils.isAnalyticsEnabled).mockReturnValue(true);
      expect(isAnalyticsEnabled()).toBe(true);
    });
  });
});
