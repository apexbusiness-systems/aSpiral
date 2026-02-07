/**
 * APEX Phase 3: AI Guardrails Unit Tests
 * Tests for Zod validation schemas and PII redaction
 * 
 * Run with: deno test supabase/functions/spiral-ai/validation.test.ts
 */

import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";


// Import from shared modules
import { 
  EntitySchema, 
  ConnectionSchema, 
  createResponseSchema, 
  getTierLimits,
  TIER_LIMITS 
} from "./ai-schema.ts";
import { redactPII } from "./pii-redactor.ts";

// =============================================================================
// ENTITY SCHEMA TESTS
// =============================================================================

Deno.test("EntitySchema: accepts valid entity with all fields", () => {
  const valid = {
    type: "problem",
    label: "Work stress",
    role: "external_irritant",
    emotionalValence: -0.7,
    importance: 0.9,
  };
  
  const result = EntitySchema.safeParse(valid);
  assertEquals(result.success, true);
});

Deno.test("EntitySchema: accepts valid entity with minimal fields", () => {
  const minimal = {
    type: "emotion",
    label: "Anxiety",
  };
  
  const result = EntitySchema.safeParse(minimal);
  assertEquals(result.success, true);
});

Deno.test("EntitySchema: rejects invalid type", () => {
  const invalid = {
    type: "invalid_type",
    label: "Test",
  };
  
  const result = EntitySchema.safeParse(invalid);
  assertEquals(result.success, false);
});

Deno.test("EntitySchema: rejects label over 50 chars", () => {
  const invalid = {
    type: "problem",
    label: "A".repeat(51),
  };
  
  const result = EntitySchema.safeParse(invalid);
  assertEquals(result.success, false);
  if (!result.success) {
    assert(result.error.errors[0].message.includes("50 characters"));
  }
});

Deno.test("EntitySchema: rejects emotionalValence out of range", () => {
  const invalidLow = {
    type: "emotion",
    label: "Sad",
    emotionalValence: -1.5,
  };
  
  const invalidHigh = {
    type: "emotion", 
    label: "Happy",
    emotionalValence: 1.5,
  };
  
  assertEquals(EntitySchema.safeParse(invalidLow).success, false);
  assertEquals(EntitySchema.safeParse(invalidHigh).success, false);
});

Deno.test("EntitySchema: rejects importance out of range", () => {
  const invalidLow = {
    type: "value",
    label: "Freedom",
    importance: -0.1,
  };
  
  const invalidHigh = {
    type: "value",
    label: "Security",
    importance: 1.5,
  };
  
  assertEquals(EntitySchema.safeParse(invalidLow).success, false);
  assertEquals(EntitySchema.safeParse(invalidHigh).success, false);
});

// =============================================================================
// CONNECTION SCHEMA TESTS
// =============================================================================

Deno.test("ConnectionSchema: accepts valid connection", () => {
  const valid = {
    from: 0,
    to: 1,
    type: "causes",
    strength: 0.8,
  };
  
  const result = ConnectionSchema.safeParse(valid);
  assertEquals(result.success, true);
});

Deno.test("ConnectionSchema: rejects negative indices", () => {
  const invalid = {
    from: -1,
    to: 0,
    type: "blocks",
    strength: 0.5,
  };
  
  assertEquals(ConnectionSchema.safeParse(invalid).success, false);
});

Deno.test("ConnectionSchema: rejects invalid connection type", () => {
  const invalid = {
    from: 0,
    to: 1,
    type: "invalid",
    strength: 0.5,
  };
  
  assertEquals(ConnectionSchema.safeParse(invalid).success, false);
});

Deno.test("ConnectionSchema: rejects strength out of range", () => {
  const invalidLow = { from: 0, to: 1, type: "causes", strength: -0.1 };
  const invalidHigh = { from: 0, to: 1, type: "causes", strength: 1.5 };
  
  assertEquals(ConnectionSchema.safeParse(invalidLow).success, false);
  assertEquals(ConnectionSchema.safeParse(invalidHigh).success, false);
});

// =============================================================================
// TIER-AWARE RESPONSE SCHEMA TESTS
// =============================================================================

Deno.test("createResponseSchema: free tier rejects more than 5 entities", () => {
  const limits = getTierLimits("free");
  const ResponseSchema = createResponseSchema(limits);
  
  const invalid = {
    entities: [
      { type: "problem", label: "1" },
      { type: "problem", label: "2" },
      { type: "problem", label: "3" },
      { type: "problem", label: "4" },
      { type: "problem", label: "5" },
      { type: "problem", label: "6" }, // 6th - should fail
    ],
    connections: [],
    question: "Test",
    response: "Test",
  };
  
  const result = ResponseSchema.safeParse(invalid);
  assertEquals(result.success, false);
  if (!result.success) {
    assert(result.error.errors.some(e => e.message.includes("5 entities")));
  }
});

Deno.test("createResponseSchema: free tier accepts exactly 5 entities", () => {
  const limits = getTierLimits("free");
  const ResponseSchema = createResponseSchema(limits);
  
  const valid = {
    entities: [
      { type: "problem", label: "1" },
      { type: "problem", label: "2" },
      { type: "problem", label: "3" },
      { type: "problem", label: "4" },
      { type: "problem", label: "5" },
    ],
    connections: [],
    question: "Test",
    response: "Test",
  };
  
  const result = ResponseSchema.safeParse(valid);
  assertEquals(result.success, true);
});

Deno.test("createResponseSchema: pro tier allows 8 entities", () => {
  const limits = getTierLimits("pro");
  const ResponseSchema = createResponseSchema(limits);
  
  const valid = {
    entities: [
      { type: "problem", label: "1" },
      { type: "problem", label: "2" },
      { type: "problem", label: "3" },
      { type: "problem", label: "4" },
      { type: "problem", label: "5" },
      { type: "problem", label: "6" },
      { type: "problem", label: "7" },
      { type: "problem", label: "8" },
    ],
    connections: [],
    question: "Test",
    response: "Test",
  };
  
  const result = ResponseSchema.safeParse(valid);
  assertEquals(result.success, true);
});

Deno.test("createResponseSchema: pro tier rejects more than 8 entities", () => {
  const limits = getTierLimits("pro");
  const ResponseSchema = createResponseSchema(limits);
  
  const invalid = {
    entities: Array.from({ length: 9 }, (_, i) => ({ type: "problem", label: `E${i}` })),
    connections: [],
    question: "Test",
    response: "Test",
  };
  
  const result = ResponseSchema.safeParse(invalid);
  assertEquals(result.success, false);
});

Deno.test("createResponseSchema: enterprise tier allows 12 entities", () => {
  const limits = getTierLimits("enterprise");
  const ResponseSchema = createResponseSchema(limits);
  
  const valid = {
    entities: Array.from({ length: 12 }, (_, i) => ({ type: "problem", label: `E${i}` })),
    connections: [],
    question: "Test",
    response: "Test",
  };
  
  const result = ResponseSchema.safeParse(valid);
  assertEquals(result.success, true);
});

Deno.test("createResponseSchema: enterprise tier rejects more than 12 entities", () => {
  const limits = getTierLimits("enterprise");
  const ResponseSchema = createResponseSchema(limits);
  
  const invalid = {
    entities: Array.from({ length: 13 }, (_, i) => ({ type: "problem", label: `E${i}` })),
    connections: [],
    question: "Test",
    response: "Test",
  };
  
  const result = ResponseSchema.safeParse(invalid);
  assertEquals(result.success, false);
});

Deno.test("createResponseSchema: connection limits are tier-aware", () => {
  const freeLimits = getTierLimits("free");
  const proLimits = getTierLimits("pro");
  
  // Free tier: max 10 connections
  assertEquals(freeLimits.maxConnections, 10);
  
  // Pro tier: max 20 connections
  assertEquals(proLimits.maxConnections, 20);
});

Deno.test("getTierLimits: unknown tier defaults to free", () => {
  const limits = getTierLimits("unknown_tier");
  assertEquals(limits.maxEntities, TIER_LIMITS.free.maxEntities);
  assertEquals(limits.maxConnections, TIER_LIMITS.free.maxConnections);
});

// =============================================================================
// RESPONSE SCHEMA GENERAL TESTS
// =============================================================================

Deno.test("ResponseSchema: accepts valid full response", () => {
  const limits = getTierLimits("free");
  const ResponseSchema = createResponseSchema(limits);
  
  const valid = {
    entities: [
      { type: "problem", label: "Stress" },
      { type: "emotion", label: "Anxiety" },
    ],
    connections: [{ from: 0, to: 1, type: "causes", strength: 0.8 }],
    question: "What's the source?",
    response: "I hear you.",
    friction: "Work overload",
    grease: "Set boundaries",
    insight: "You can't pour from an empty cup.",
  };
  
  const result = ResponseSchema.safeParse(valid);
  assertEquals(result.success, true);
});

Deno.test("ResponseSchema: accepts empty arrays", () => {
  const limits = getTierLimits("free");
  const ResponseSchema = createResponseSchema(limits);
  
  const valid = {
    entities: [],
    connections: [],
    question: "",
    response: "",
  };
  
  const result = ResponseSchema.safeParse(valid);
  assertEquals(result.success, true);
});

Deno.test("ResponseSchema: rejects more than 10 connections (free tier)", () => {
  const limits = getTierLimits("free");
  const ResponseSchema = createResponseSchema(limits);
  
  const connections = Array.from({ length: 11 }, (_, i) => ({
    from: 0,
    to: 1,
    type: "causes" as const,
    strength: 0.5,
  }));
  
  const invalid = {
    entities: [{ type: "problem", label: "A" }, { type: "problem", label: "B" }],
    connections,
    question: "Test",
    response: "Test",
  };
  
  const result = ResponseSchema.safeParse(invalid);
  assertEquals(result.success, false);
});

Deno.test("ResponseSchema: rejects question over 100 chars", () => {
  const limits = getTierLimits("free");
  const ResponseSchema = createResponseSchema(limits);
  
  const invalid = {
    entities: [],
    connections: [],
    question: "Q".repeat(101),
    response: "OK",
  };
  
  const result = ResponseSchema.safeParse(invalid);
  assertEquals(result.success, false);
});

Deno.test("ResponseSchema: rejects response over 50 chars", () => {
  const limits = getTierLimits("free");
  const ResponseSchema = createResponseSchema(limits);
  
  const invalid = {
    entities: [],
    connections: [],
    question: "OK",
    response: "R".repeat(51),
  };
  
  const result = ResponseSchema.safeParse(invalid);
  assertEquals(result.success, false);
});

// =============================================================================
// PII REDACTION TESTS
// =============================================================================

Deno.test("redactPII: redacts email addresses", () => {
  const input = "Contact me at john.doe@example.com for more info";
  const { redacted, piiFound } = redactPII(input);
  
  assertEquals(redacted, "Contact me at [REDACTED_EMAIL] for more info");
  assertEquals(piiFound.length, 1);
  assert(piiFound[0].includes("email"));
});

Deno.test("redactPII: redacts multiple emails", () => {
  const input = "Email alice@test.com or bob@company.org";
  const { redacted, piiFound } = redactPII(input);
  
  assert(!redacted.includes("alice@"));
  assert(!redacted.includes("bob@"));
  assert(piiFound[0].includes("2 instance"));
});

Deno.test("redactPII: redacts phone numbers (various formats)", () => {
  const formats = [
    "Call me at 555-123-4567",
    "Phone: (555) 123-4567",
    "Mobile: 555.123.4567",
    "Tel: +1 555 123 4567",
    "5551234567",
  ];
  
  for (const input of formats) {
    const { redacted, piiFound } = redactPII(input);
    assert(redacted.includes("[REDACTED_PHONE]"), `Failed for: ${input}`);
    assert(piiFound.some(p => p.includes("phone")));
  }
});

Deno.test("redactPII: redacts SSN", () => {
  const inputs = [
    "SSN: 123-45-6789",
    "Social: 123456789",
  ];
  
  for (const input of inputs) {
    const { redacted, piiFound } = redactPII(input);
    assert(redacted.includes("[REDACTED_SSN]"), `Failed for: ${input}`);
  }
});

Deno.test("redactPII: redacts credit card numbers", () => {
  const inputs = [
    "Card: 4111-1111-1111-1111",
    "CC: 4111 1111 1111 1111",
    "Payment: 4111111111111111",
  ];
  
  for (const input of inputs) {
    const { redacted, piiFound } = redactPII(input);
    assert(redacted.includes("[REDACTED_CREDITCARD]"), `Failed for: ${input}`);
  }
});

Deno.test("redactPII: redacts IP addresses", () => {
  const input = "Server at 192.168.1.1 and 10.0.0.255";
  const { redacted, piiFound } = redactPII(input);
  
  assert(!redacted.includes("192.168"));
  assert(!redacted.includes("10.0.0"));
  assert(piiFound.some(p => p.includes("ipAddress")));
});

Deno.test("redactPII: handles text with no PII", () => {
  const input = "Just a normal message about work stress";
  const { redacted, piiFound } = redactPII(input);
  
  assertEquals(redacted, input);
  assertEquals(piiFound.length, 0);
});

Deno.test("redactPII: handles multiple PII types in one message", () => {
  const input = "Email me at test@example.com, call 555-123-4567, SSN 123-45-6789";
  const { redacted, piiFound } = redactPII(input);
  
  assert(redacted.includes("[REDACTED_EMAIL]"));
  assert(redacted.includes("[REDACTED_PHONE]"));
  assert(redacted.includes("[REDACTED_SSN]"));
  assertEquals(piiFound.length, 3);
});

Deno.test("redactPII: preserves message structure", () => {
  const input = "My email is user@domain.com and my feelings are valid";
  const { redacted } = redactPII(input);
  
  assert(redacted.startsWith("My email is "));
  assert(redacted.endsWith(" and my feelings are valid"));
});

// =============================================================================
// OBFUSCATED EMAIL TESTS
// =============================================================================

Deno.test("redactPII: redacts obfuscated email 'word dot word at domain dot com'", () => {
  const input = "Contact me at john dot doe at gmail dot com";
  const { redacted, piiFound } = redactPII(input);
  
  assert(redacted.includes("[REDACTED_OBFUSCATED_EMAIL]"), `Got: ${redacted}`);
  assert(piiFound.some(p => p.includes("obfuscatedEmail")));
});

Deno.test("redactPII: redacts obfuscated email with brackets", () => {
  const input = "Email: j[dot]doe[at]gmail[dot]com";
  const { redacted, piiFound } = redactPII(input);
  
  assert(redacted.includes("[REDACTED_OBFUSCATED_EMAIL]"), `Got: ${redacted}`);
  assert(piiFound.some(p => p.includes("obfuscatedEmail")));
});

Deno.test("redactPII: redacts obfuscated email with parentheses", () => {
  const input = "My email: john (dot) doe (at) example (dot) org";
  const { redacted, piiFound } = redactPII(input);
  
  assert(redacted.includes("[REDACTED_OBFUSCATED_EMAIL]"), `Got: ${redacted}`);
  assert(piiFound.some(p => p.includes("obfuscatedEmail")));
});

Deno.test("redactPII: redacts 'word at domain dot tld' pattern", () => {
  const input = "Reach me at johndoe at example dot com";
  const { redacted, piiFound } = redactPII(input);
  
  assert(redacted.includes("[REDACTED_OBFUSCATED_EMAIL]"), `Got: ${redacted}`);
  assert(piiFound.some(p => p.includes("obfuscatedEmail")));
});

// =============================================================================
// EDGE CASES
// =============================================================================

Deno.test("EntitySchema: all valid types", () => {
  const types = ["problem", "emotion", "value", "action", "friction", "grease"];
  
  for (const type of types) {
    const result = EntitySchema.safeParse({ type, label: "Test" });
    assertEquals(result.success, true, `Failed for type: ${type}`);
  }
});

Deno.test("EntitySchema: all valid roles", () => {
  const roles = [
    "external_irritant",
    "internal_conflict", 
    "desire",
    "fear",
    "constraint",
    "solution"
  ];
  
  for (const role of roles) {
    const result = EntitySchema.safeParse({ type: "problem", label: "Test", role });
    assertEquals(result.success, true, `Failed for role: ${role}`);
  }
});

Deno.test("ConnectionSchema: all valid connection types", () => {
  const types = ["causes", "blocks", "enables", "resolves", "opposes"];
  
  for (const type of types) {
    const result = ConnectionSchema.safeParse({ from: 0, to: 1, type, strength: 0.5 });
    assertEquals(result.success, true, `Failed for type: ${type}`);
  }
});

Deno.test("ResponseSchema: boundary values", () => {
  const limits = getTierLimits("free");
  const ResponseSchema = createResponseSchema(limits);
  
  // Exactly 5 entities (max for free tier)
  const maxEntities = {
    entities: Array.from({ length: 5 }, (_, i) => ({ type: "problem", label: `E${i}` })),
    connections: [],
    question: "Q",
    response: "R",
  };
  assertEquals(ResponseSchema.safeParse(maxEntities).success, true);
  
  // Exactly 100 char question (max)
  const maxQuestion = {
    entities: [],
    connections: [],
    question: "Q".repeat(100),
    response: "R",
  };
  assertEquals(ResponseSchema.safeParse(maxQuestion).success, true);
  
  // Exactly 50 char response (max)
  const maxResponse = {
    entities: [],
    connections: [],
    question: "Q",
    response: "R".repeat(50),
  };
  assertEquals(ResponseSchema.safeParse(maxResponse).success, true);
});

console.log("\n✅ All validation tests passed!\n");
