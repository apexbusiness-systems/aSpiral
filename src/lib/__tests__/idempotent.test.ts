import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  idempotentExecute,
  generateIdempotencyKey,
  debounce,
  throttle
} from '../idempotent';

describe('Idempotency Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateIdempotencyKey', () => {
    it('generates a consistent key for the same inputs', () => {
      const key1 = generateIdempotencyKey('operation', 'arg1', 123);
      const key2 = generateIdempotencyKey('operation', 'arg1', 123);
      expect(key1).toBe(key2);
    });

    it('generates different keys for different operations', () => {
      const key1 = generateIdempotencyKey('op1', 'arg1');
      const key2 = generateIdempotencyKey('op2', 'arg1');
      expect(key1).not.toBe(key2);
    });

    it('generates different keys for different parameters', () => {
      const key1 = generateIdempotencyKey('op', 'arg1');
      const key2 = generateIdempotencyKey('op', 'arg2');
      expect(key1).not.toBe(key2);
    });

    it('includes the date in the key', () => {
      const key = generateIdempotencyKey('op', 'arg1');
      // Use the exact same date string generation as the implementation to be timezone-agnostic in tests
      const expectedDate = new Date().toDateString();
      expect(key).toContain(expectedDate);
    });
  });

  describe('idempotentExecute', () => {
    it('executes the operation and returns the result', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const key = 'test-key-1';

      const result = await idempotentExecute(key, operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent requests', async () => {
      let resolveOp: (value: string) => void;
      const operation = vi.fn().mockReturnValue(new Promise(resolve => {
        resolveOp = resolve;
      }));
      const key = 'test-key-2';

      const promise1 = idempotentExecute(key, operation);
      const promise2 = idempotentExecute(key, operation);

      expect(operation).toHaveBeenCalledTimes(1);

      resolveOp!('success');

      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1).toBe('success');
      expect(result2).toBe('success');
    });

    it('returns cached result for subsequent calls within TTL', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const key = 'test-key-3';

      await idempotentExecute(key, operation);

      // Advance time slightly, but within TTL (60s)
      vi.advanceTimersByTime(30000);

      const result = await idempotentExecute(key, operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('re-executes operation after cache expires', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const key = 'test-key-4';

      await idempotentExecute(key, operation);

      // Advance time beyond TTL (60s)
      vi.advanceTimersByTime(60001);

      const result = await idempotentExecute(key, operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('handles errors correctly and allows retry', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('failure'))
        .mockResolvedValueOnce('success');
      const key = 'test-key-5';

      await expect(idempotentExecute(key, operation)).rejects.toThrow('failure');

      // Should be able to retry immediately as it shouldn't be cached or in-flight
      const result = await idempotentExecute(key, operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('respects cache size limit', async () => {
       // The limit is 100. We'll add 200 items to flush any previous state and trigger eviction.
       const operation = vi.fn().mockResolvedValue('success');

       // Fill the cache
       for (let i = 0; i < 200; i++) {
         await idempotentExecute(`key-bulk-${i}`, operation);
       }

       // Verify the first item (key-bulk-0) is evicted.
       // Calling it again should trigger re-execution.
       operation.mockClear();
       await idempotentExecute('key-bulk-0', operation);
       expect(operation).toHaveBeenCalledTimes(1);

       // Verify the last item (key-bulk-199) is still cached.
       operation.mockClear();
       await idempotentExecute('key-bulk-199', operation);
       expect(operation).toHaveBeenCalledTimes(0);
    });
  });

  describe('debounce', () => {
    it('delays execution of the function', () => {
      const callback = vi.fn();
      const debouncedFn = debounce(callback, 100);

      debouncedFn();
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(51);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('cancels previous calls if invoked repeatedly', () => {
      const callback = vi.fn();
      const debouncedFn = debounce(callback, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);

      debouncedFn(); // Should cancel the first one
      vi.advanceTimersByTime(50);
      expect(callback).not.toHaveBeenCalled(); // Total 100ms from first, but only 50ms from second

      vi.advanceTimersByTime(51);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('passes arguments to the debounced function', () => {
      const callback = vi.fn();
      const debouncedFn = debounce(callback, 100);

      debouncedFn('arg1', 123);
      vi.advanceTimersByTime(101);

      expect(callback).toHaveBeenCalledWith('arg1', 123);
    });
  });

  describe('throttle', () => {
    it('executes the function immediately on first call', () => {
      const callback = vi.fn();
      const throttledFn = throttle(callback, 100);

      throttledFn();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('ignores calls within the throttle limit', () => {
      const callback = vi.fn();
      const throttledFn = throttle(callback, 100);

      throttledFn();
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(50);
      throttledFn();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('allows execution again after the limit', () => {
      const callback = vi.fn();
      const throttledFn = throttle(callback, 100);

      throttledFn();
      expect(callback).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(101);
      throttledFn();
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('passes arguments to the throttled function', () => {
      const callback = vi.fn();
      const throttledFn = throttle(callback, 100);

      throttledFn('arg1', 123);
      expect(callback).toHaveBeenCalledWith('arg1', 123);
    });
  });
});
