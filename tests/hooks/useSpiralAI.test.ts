import { describe, expect, it, vi } from 'vitest';
import { computeCircuitBreakerState, isCorsLikeError } from '@/hooks/useSpiralAI';

describe('useSpiralAI resilience logic', () => {
  it('detects CORS/network typed errors', () => {
    expect(isCorsLikeError(new TypeError('CORS blocked by policy'))).toBe(true);
    expect(isCorsLikeError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(true);
    expect(isCorsLikeError(new Error('HTTP_500'))).toBe(false);
  });

  it('enters DEGRADED after 3 consecutive failures within 60s', () => {
    const now = Date.now();
    const first = computeCircuitBreakerState([], now - 5000);
    const second = computeCircuitBreakerState(first.next, now - 3000);
    const third = computeCircuitBreakerState(second.next, now);
    expect(first.active).toBe(false);
    expect(second.active).toBe(false);
    expect(third.active).toBe(true);
  });

  it('circuit breaker resets after 60s window', () => {
    vi.useFakeTimers();
    const t0 = Date.now();
    const a = computeCircuitBreakerState([], t0);
    const b = computeCircuitBreakerState(a.next, t0 + 1000);
    const c = computeCircuitBreakerState(b.next, t0 + 2000);
    expect(c.active).toBe(true);

    const reset = computeCircuitBreakerState(c.next, t0 + 63_000);
    expect(reset.next.length).toBe(1);
    expect(reset.active).toBe(false);
    vi.useRealTimers();
  });
});
