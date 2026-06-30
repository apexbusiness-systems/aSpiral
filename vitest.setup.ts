import '@testing-library/jest-dom/vitest';

// Polyfill webcrypto for Node/JSDOM environments
if (globalThis.crypto === undefined || !globalThis.crypto?.subtle) {
  globalThis.crypto = require('node:crypto').webcrypto;
}
