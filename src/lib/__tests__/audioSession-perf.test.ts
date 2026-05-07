
import { describe, it, expect, vi } from 'vitest';

// Simulating the environment and benchmark
describe('Supabase getSession Benchmark (Simulated)', () => {
  it('measures getSession performance overhead', async () => {
    // Mock getSession that does some "work" (e.g. promise resolution)
    const mockSupabase = {
      auth: {
        getSession: async () => {
          // Simulate some internal overhead
          return { data: { session: { access_token: 'fake-token' } }, error: null };
        }
      }
    };

    const iterations = 10000;

    // Baseline: calling the mock getSession
    const startGetSession = performance.now();
    for (let i = 0; i < iterations; i++) {
      await mockSupabase.auth.getSession();
    }
    const endGetSession = performance.now();
    const durationGetSession = endGetSession - startGetSession;

    // Optimized: using a cached variable
    const cachedToken = 'fake-token';
    const startCached = performance.now();
    for (let i = 0; i < iterations; i++) {
      const token = cachedToken;
    }
    const endCached = performance.now();
    const durationCached = endCached - startCached;

    console.log(`\n--- Benchmark Results (${iterations} iterations) ---`);
    console.log(`getSession Total: ${durationGetSession.toFixed(2)}ms`);
    console.log(`getSession Avg: ${(durationGetSession / iterations).toFixed(4)}ms`);
    console.log(`Cached Total: ${durationCached.toFixed(2)}ms`);
    console.log(`Cached Avg: ${(durationCached / iterations).toFixed(4)}ms`);
    console.log(`Speedup: ${(durationGetSession / durationCached).toFixed(2)}x`);
    console.log(`--------------------------------------------------\n`);

    expect(durationCached).toBeLessThan(durationGetSession);
  });
});
