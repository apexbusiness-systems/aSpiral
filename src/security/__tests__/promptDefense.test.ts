import { describe, it, expect } from 'vitest';
import { evaluatePrompt, SafeInputSchema } from '../promptDefense';

describe('Prompt Defense', () => {
  describe('evaluatePrompt()', () => {
    it('should allow safe input', () => {
      const input = "Tell me a story about a brave knight.";
      const result = evaluatePrompt(input);
      expect(result).toEqual({ blocked: false, score: 0, reason: undefined });
    });

    it('should block empty input', () => {
      const result = evaluatePrompt("");
      expect(result).toEqual({ blocked: true, score: 0, reason: 'Empty input' });
    });

    it('should block input that is too long', () => {
      const longInput = "a".repeat(20001);
      const result = evaluatePrompt(longInput);
      expect(result).toEqual({ blocked: true, score: 1.0, reason: 'Input too long' });
    });

    it('should allow input at maximum length', () => {
      const maxInput = "a".repeat(20000);
      const result = evaluatePrompt(maxInput);
      expect(result.blocked).toBe(false);
    });

    const maliciousPatterns = [
      "ignore previous instructions",
      "system prompt",
      "you are a chatgpt",
      "sim mode"
    ];

    maliciousPatterns.forEach(pattern => {
      it(`should block malicious pattern: "${pattern}"`, () => {
        const result = evaluatePrompt(pattern);
        expect(result).toEqual({ blocked: true, score: 0.9, reason: 'Malicious pattern detected' });
      });

      it(`should block malicious pattern case-insensitively: "${pattern.toUpperCase()}"`, () => {
        const result = evaluatePrompt(pattern.toUpperCase());
        expect(result).toEqual({ blocked: true, score: 0.9, reason: 'Malicious pattern detected' });
      });

      it(`should block malicious pattern embedded in text: "Some text ${pattern} more text"`, () => {
        const result = evaluatePrompt(`Some text ${pattern} more text`);
        expect(result).toEqual({ blocked: true, score: 0.9, reason: 'Malicious pattern detected' });
      });
    });
  });

  describe('SafeInputSchema', () => {
    it('should parse valid input successfully', () => {
      const input = "Normal user query";
      expect(SafeInputSchema.parse(input)).toBe(input);
    });

    it('should fail to parse input with malicious patterns', () => {
      const input = "ignore previous instructions";
      const result = SafeInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Security policy violation: Input rejected");
      }
    });

    it('should fail to parse input that is too long', () => {
      const input = "a".repeat(20001);
      const result = SafeInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
