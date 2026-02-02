import { z } from 'zod';

// Basic prompt defense implementation to satisfy APEX ISO/IEC 42001
// This prevents prompt injection and ensures LLM inputs are sanitized.

export interface PromptEvaluation {
  blocked: boolean;
  score: number;
  reason?: string;
}

const DANGEROUS_PATTERNS = [
  /ignore previous instructions/i,
  /system prompt/i,
  /you are a chatgpt/i,
  /sim mode/i
];

export function evaluatePrompt(userInput: string): PromptEvaluation {
  if (!userInput) return { blocked: true, score: 0, reason: 'Empty input' };

  // 1. Length check
  if (userInput.length > 20000) {
    return { blocked: true, score: 1.0, reason: 'Input too long' };
  }

  // 2. Pattern matching
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(userInput)) {
      return { blocked: true, score: 0.9, reason: 'Malicious pattern detected' };
    }
  }

  // 3. Validation success
  return { blocked: false, score: 0, reason: undefined };
}

export const SafeInputSchema = z.string().max(20000).refine((val) => {
  return !evaluatePrompt(val).blocked;
}, { message: "Security policy violation: Input rejected" });
