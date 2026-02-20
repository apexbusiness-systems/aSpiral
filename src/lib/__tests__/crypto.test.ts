import { describe, it, expect } from 'vitest';
import { generateSecureToken } from '../crypto';

describe('generateSecureToken', () => {
  it('should generate a token of the requested length', () => {
    const length = 40;
    const token = generateSecureToken(length);
    expect(token).toHaveLength(length);
  });

  it('should generate a token of a different length', () => {
    const length = 20;
    const token = generateSecureToken(length);
    expect(token).toHaveLength(length);
  });

  it('should only contain allowed characters', () => {
    const allowedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const token = generateSecureToken(1000);
    for (const char of token) {
      expect(allowedChars).toContain(char);
    }
  });

  it('should generate unique tokens', () => {
    const tokens = new Set();
    for (let i = 0; i < 100; i++) {
      const token = generateSecureToken(20);
      expect(tokens.has(token)).toBe(false);
      tokens.add(token);
    }
  });
});
