import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDebugOverlayState,
  addBreadcrumb,
  setFatalErrorSnapshot,
  clearFatalErrorSnapshot,
  subscribeDebugOverlay,
  _resetDebugState,
} from '../debugOverlay';

describe('debugOverlay', () => {
  // Use a fixed timestamp and mock Date.now manually for Bun compatibility
  const mockNow = 1715600000000;
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    originalDateNow = Date.now;
    Date.now = vi.fn(() => mockNow);
    _resetDebugState();
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  it('should have initial empty state', () => {
    const state = getDebugOverlayState();
    expect(state.breadcrumbs).toEqual([]);
    expect(state.fatalError).toBeNull();
  });

  describe('addBreadcrumb', () => {
    it('should add a breadcrumb with current timestamp', () => {
      addBreadcrumb({
        type: 'system',
        message: 'Test message',
        data: { foo: 'bar' },
      });

      const state = getDebugOverlayState();
      expect(state.breadcrumbs).toHaveLength(1);
      expect(state.breadcrumbs[0]).toEqual({
        type: 'system',
        message: 'Test message',
        data: { foo: 'bar' },
        timestamp: mockNow,
      });
    });

    it('should limit breadcrumbs to MAX_BREADCRUMBS (50)', () => {
      for (let i = 0; i < 60; i++) {
        addBreadcrumb({
          type: 'system',
          message: `Message ${i}`,
        });
      }

      const state = getDebugOverlayState();
      expect(state.breadcrumbs).toHaveLength(50);
      expect(state.breadcrumbs[0].message).toBe('Message 10');
      expect(state.breadcrumbs[49].message).toBe('Message 59');
    });
  });

  describe('fatalErrorSnapshot', () => {
    it('should set and clear fatal error snapshot', () => {
      setFatalErrorSnapshot({
        message: 'Fatal error',
        stack: 'Error stack',
      });

      let state = getDebugOverlayState();
      expect(state.fatalError).toEqual({
        message: 'Fatal error',
        stack: 'Error stack',
        timestamp: mockNow,
      });

      clearFatalErrorSnapshot();
      state = getDebugOverlayState();
      expect(state.fatalError).toBeNull();
    });
  });

  describe('subscription', () => {
    it('should call listener immediately upon subscription', () => {
      const listener = vi.fn();
      subscribeDebugOverlay(listener);
      expect(listener).toHaveBeenCalledWith({
        breadcrumbs: [],
        fatalError: null,
      });
    });

    it('should notify listener when state changes', () => {
      const listener = vi.fn();
      subscribeDebugOverlay(listener);
      listener.mockClear();

      addBreadcrumb({ type: 'system', message: 'test' });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        breadcrumbs: [expect.objectContaining({ message: 'test' })],
      }));

      setFatalErrorSnapshot({ message: 'fail' });
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
        fatalError: expect.objectContaining({ message: 'fail' }),
      }));
    });

    it('should stop notifying after unsubscription', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeDebugOverlay(listener);
      listener.mockClear();

      unsubscribe();
      addBreadcrumb({ type: 'system', message: 'test' });
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
