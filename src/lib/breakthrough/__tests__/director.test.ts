/**
 * Breakthrough Director Unit Tests
 * Tests for lifecycle management, safe mode, and idempotency
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  analytics: {
    trackCinematic: vi.fn(),
    trackPerformance: vi.fn(),
  },
}));

import {
  BreakthroughDirector,
  getBreakthroughDirector,
  resetBreakthroughDirector,
} from '../director';
import { clearBreakthroughHistory } from '../history';

describe('Breakthrough Director', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearBreakthroughHistory();
    resetBreakthroughDirector();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const director1 = getBreakthroughDirector();
      const director2 = getBreakthroughDirector();
      
      expect(director1).toBe(director2);
    });

    it('should reset the instance', () => {
      const director1 = getBreakthroughDirector();
      resetBreakthroughDirector();
      const director2 = getBreakthroughDirector();
      
      expect(director1).not.toBe(director2);
    });
  });

  describe('Initial State', () => {
    it('should start in idle phase', () => {
      const director = getBreakthroughDirector();
      const state = director.getState();
      
      expect(state.phase).toBe('idle');
      expect(state.currentVariant).toBeNull();
      expect(state.isSafeMode).toBe(false);
    });
  });

  describe('Prewarm', () => {
    it('should prewarm and return a variant', async () => {
      const director = getBreakthroughDirector();
      
      const variant = await director.prewarm([], undefined, 'mid', false);
      
      expect(variant).toBeDefined();
      expect(variant.id).toBeDefined();
      expect(variant.finalDuration).toBeGreaterThan(0);
    });

    it('should transition to ready phase after prewarm', async () => {
      const director = getBreakthroughDirector();
      
      await director.prewarm([], undefined, 'mid', false);
      
      const state = director.getState();
      expect(state.phase).toBe('ready');
    });
  });

  describe('Play', () => {
    it('should transition to playing phase', async () => {
      const director = getBreakthroughDirector();
      
      await director.prewarm([], undefined, 'mid', false);
      await director.play();
      
      const state = director.getState();
      expect(state.phase).toBe('playing');
    });

    it('should set current variant', async () => {
      const director = getBreakthroughDirector();
      
      const variant = await director.prewarm([], undefined, 'mid', false);
      await director.play(variant);
      
      expect(director.getCurrentVariant()).toBe(variant);
    });
  });

  describe('Complete', () => {
    it('should transition through settling to cleanup', async () => {
      const director = getBreakthroughDirector();
      const phases: string[] = [];
      
      director.setCallbacks({
        onPhaseChange: (phase) => phases.push(phase),
      });
      
      await director.prewarm([], undefined, 'mid', false);
      await director.play();
      director.complete();
      
      // Fast forward through settle duration (SETTLE_DURATION_MS = 1500ms)
      vi.advanceTimersByTime(1600);

      expect(phases).toContain('settling');
      expect(phases).toContain('cleanup');
    });

    it('should call onComplete callback', async () => {
      const director = getBreakthroughDirector();
      const onComplete = vi.fn();
      
      director.setCallbacks({ onComplete });

      await director.prewarm([], undefined, 'mid', false);
      await director.play();
      director.complete();

      // SETTLE_DURATION_MS = 1500ms
      vi.advanceTimersByTime(1600);

      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Abort', () => {
    it('should transition to cleanup on abort', async () => {
      const director = getBreakthroughDirector();
      
      await director.prewarm([], undefined, 'mid', false);
      await director.play();
      director.abort('test_abort');
      
      const state = director.getState();
      expect(state.phase).toBe('idle'); // After cleanup
    });

    it('should call onAbort callback with reason', async () => {
      const director = getBreakthroughDirector();
      const onAbort = vi.fn();
      
      director.setCallbacks({ onAbort });
      
      await director.prewarm([], undefined, 'mid', false);
      await director.play();
      director.abort('user_skip');
      
      expect(onAbort).toHaveBeenCalledWith('user_skip');
    });
  });

  describe('Idempotency', () => {
    it('should cancel prior instance when play called twice', async () => {
      const director = getBreakthroughDirector();
      const onAbort = vi.fn();
      
      director.setCallbacks({ onAbort });
      
      await director.prewarm([], undefined, 'mid', false);
      await director.play();
      
      // Play again while still playing
      await director.play();
      
      // Should have aborted the first play
      expect(onAbort).toHaveBeenCalledWith('new_play_requested');
    });
  });

  describe('FPS Monitoring', () => {
    it('should accept FPS reports', async () => {
      const director = getBreakthroughDirector();
      
      await director.prewarm([], undefined, 'mid', false);
      await director.play();
      
      // Report some FPS values
      for (let i = 0; i < 10; i++) {
        director.reportFPS(60);
      }
      
      const state = director.getState();
      expect(state.fpsHistory.length).toBe(10);
    });

    it('should not accept FPS reports when not playing', () => {
      const director = getBreakthroughDirector();
      
      director.reportFPS(60);
      
      const state = director.getState();
      expect(state.fpsHistory.length).toBe(0);
    });
  });

  describe('Safe Mode', () => {
    it('should trigger safe mode on low FPS', async () => {
      const director = getBreakthroughDirector();
      
      await director.prewarm([], undefined, 'mid', false);
      await director.play();
      
      // Report low FPS values
      for (let i = 0; i < 35; i++) {
        director.reportFPS(20); // Below 30 threshold
      }
      
      // Advance timer for FPS check interval
      vi.advanceTimersByTime(600);
      
      expect(director.isSafeMode()).toBe(true);
    });

    it('should not trigger safe mode on good FPS', async () => {
      const director = getBreakthroughDirector();
      
      await director.prewarm([], undefined, 'mid', false);
      await director.play();
      
      // Report good FPS values
      for (let i = 0; i < 35; i++) {
        director.reportFPS(60);
      }
      
      // Advance timer for FPS check interval
      vi.advanceTimersByTime(600);
      
      expect(director.isSafeMode()).toBe(false);
    });
  });

  describe('Max Duration Timeout', () => {
    it('should force completion after max duration', async () => {
      const director = getBreakthroughDirector();
      const onComplete = vi.fn();
      
      director.setCallbacks({ onComplete });
      
      await director.prewarm([], undefined, 'mid', false);
      await director.play();
      
      // Advance past max duration (15s) + settle duration (1.5s)
      vi.advanceTimersByTime(17000);

      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should dispose resources', async () => {
      const director = getBreakthroughDirector();
      
      await director.prewarm([], undefined, 'mid', false);
      await director.play();
      director.dispose();
      
      const state = director.getState();
      expect(state.phase).toBe('idle');
      expect(state.currentVariant).toBeNull();
    });
  });
});
