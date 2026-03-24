import { vi } from 'vitest';

// Global mock for secureMathRandom to ensure deterministic test execution and backward compatibility with tests that mock Math.random()
vi.mock('@/lib/secureMathRandom', () => ({
  secureMathRandom: () => Math.random(),
}));
