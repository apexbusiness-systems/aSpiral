/// <reference types="node" />
import { vi } from 'vitest';

// Polyfill webcrypto for Node/JSDOM environments
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  vi.stubGlobal('crypto', require('node:crypto').webcrypto);
}

// Global mock for secureMathRandom to ensure deterministic test execution and backward compatibility with tests that mock Math.random()
vi.mock('@/lib/secureMathRandom', () => ({
  secureMathRandom: () => Math.random(),
}));
