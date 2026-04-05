import { expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Polyfill webcrypto for Node/JSDOM environments
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  globalThis.crypto = require('node:crypto').webcrypto;
}
