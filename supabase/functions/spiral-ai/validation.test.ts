/**
 * APEX Phase 3: AI Guardrails Unit Tests
 * Tests for Zod validation schemas and PII redaction
 * 
 * Run with: deno test supabase/functions/spiral-ai/validation.test.ts
 */

import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { 
  EntitySchema, 
  ConnectionSchema, 
  createResponseSchema, 
  getTierLimits,
  TIER_LIMITS 
} from "./ai-schema.ts";
import { redactPII } from "./pii-redactor.ts";

// =============================================================================
// HELPER FUNCTIONS & TYPES
// =============================================================================

type ValidSchemaTestCase<T> = {
  name: string;
  data: T;
  expected: boolean;
  errorMsg?: string;
};

// Generic test runner for Zod schemas to reduce duplication
function runSchemaTests<T>(
  schemaName: string, 
  schema: { safeParse: (data: unknown) => { success: boolean; error?: { errors: { message: string }[] } } }, 
  cases: ValidSchemaTestCase<unknown>[]
) {
  for (const { name, data, expected, errorMsg } of cases) {
    Deno.test(`${schemaName}: ${name}`, () => {
      const result = schema.safeParse(data);
      assertEquals(result.success, expected, `Failed: ${name}`);
      
      if (!result.success && errorMsg) {
        assert(
          result.error?.errors.some(e => e.message.includes(errorMsg)), 
          `Error message should include "${errorMsg}"`
        );
      }
    });
  }
}

// =============================================================================
// ENTITY SCHEMA TESTS
// =============================================================================

runSchemaTests("EntitySchema", EntitySchema, [
  {
    name: "accepts valid entity with all fields",
    data: {
      type: "problem",
      label: "Work stress",
      role: "external_irritant",
      emotionalValence: -0.7,
      importance: 0.9,
    },
    expected: true
  },
  {
    name: "accepts valid entity with minimal fields",
    data: { type: "emotion", label: "Anxiety" },
    expected: true
  },
  {
    name: "rejects invalid type",
    data: { type: "invalid_type", label: "Test" },
    expected: false
  },
  {
    name: "rejects label over 50 chars",
    data: { type: "problem", label: "A".repeat(51) },
    expected: false,
    errorMsg: "50 characters"
  },
  {
    name: "rejects emotionalValence out of range (-1.5)",
    data: { type: "emotion", label: "Sad", emotionalValence: -1.5 },
    expected: false
  },
  {
    name: "rejects emotionalValence out of range (1.5)",
    data: { type: "emotion", label: "Happy", emotionalValence: 1.5 },
    expected: false
  },
  {
    name: "rejects importance out of range (-0.1)",
    data: { type: "value", label: "Freedom", importance: -0.1 },
    expected: false
  },
  {
    name: "rejects importance out of range (1.5)",
    data: { type: "value", label: "Security", importance: 1.5 },
    expected: false
  }
]);

// Dynamic tests for valid types and roles
[
  "problem", "emotion", "value", "action", "friction", "grease"
].forEach(type => {
  Deno.test(`EntitySchema: accepts valid type ${type}`, () => {
    const result = EntitySchema.safeParse({ type, label: "Test" });
    assertEquals(result.success, true);
  });
});

[
  "external_irritant", "internal_conflict", "desire", "fear", "constraint", "solution"
].forEach(role => {
  Deno.test(`EntitySchema: accepts valid role ${role}`, () => {
    const result = EntitySchema.safeParse({ type: "problem", label: "Test", role });
    assertEquals(result.success, true);
  });
});

// =============================================================================
// CONNECTION SCHEMA TESTS
// =============================================================================

runSchemaTests("ConnectionSchema", ConnectionSchema, [
  {
    name: "accepts valid connection",
    data: { from: 0, to: 1, type: "causes", strength: 0.8 },
    expected: true
  },
  {
    name: "rejects negative indices",
    data: { from: -1, to: 0, type: "blocks", strength: 0.5 },
    expected: false
  },
  {
    name: "rejects invalid connection type",
    data: { from: 0, to: 1, type: "invalid", strength: 0.5 },
    expected: false
  },
  {
    name: "rejects strength out of range (-0.1)",
    data: { from: 0, to: 1, type: "causes", strength: -0.1 },
    expected: false
  },
  {
    name: "rejects strength out of range (1.5)",
    data: { from: 0, to: 1, type: "causes", strength: 1.5 },
    expected: false
  }
]);

[
  "causes", "blocks", "enables", "resolves", "opposes"
].forEach(type => {
  Deno.test(`ConnectionSchema: accepts valid connection type ${type}`, () => {
    const result = ConnectionSchema.safeParse({ from: 0, to: 1, type, strength: 0.5 });
    assertEquals(result.success, true);
  });
});

// =============================================================================
// TIER-AWARE RESPONSE SCHEMA TESTS
// =============================================================================

function createEntities(count: number) {
  return Array.from({ length: count }, (_, i) => ({ type: "problem", label: `E${i}` }));
}

const tierCases = [
  { tier: "free", maxEntities: 5, expected: true, testCount: 5 },
  { tier: "free", maxEntities: 5, expected: false, testCount: 6, errorMsg: "5 entities" },
  { tier: "pro", maxEntities: 8, expected: true, testCount: 8 },
  { tier: "pro", maxEntities: 8, expected: false, testCount: 9 },
  { tier: "enterprise", maxEntities: 12, expected: true, testCount: 12 },
  { tier: "enterprise", maxEntities: 12, expected: false, testCount: 13 },
];

for (const { tier, expected, testCount, errorMsg } of tierCases) {
  Deno.test(`createResponseSchema: ${tier} tier ${expected ? 'allows' : 'rejects'} ${testCount} entities`, () => {
    const limits = getTierLimits(tier);
    const ResponseSchema = createResponseSchema(limits);
    
    const data = {
      entities: createEntities(testCount),
      connections: [],
      question: "Test",
      response: "Test",
    };
    
    const result = ResponseSchema.safeParse(data);
    assertEquals(result.success, expected);
    if (!result.success && errorMsg) {
      assert(result.error.errors.some(e => e.message.includes(errorMsg)));
    }
  });
}

Deno.test("createResponseSchema: connection limits are tier-aware", () => {
  const freeLimits = getTierLimits("free");
  const proLimits = getTierLimits("pro");
  assertEquals(freeLimits.maxConnections, 10);
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

const responseSchemaTests = [
  {
    name: "accepts valid full response",
    data: {
      entities: [{ type: "problem", label: "Stress" }, { type: "emotion", label: "Anxiety" }],
      connections: [{ from: 0, to: 1, type: "causes", strength: 0.8 }],
      question: "What's the source?",
      response: "I hear you.",
      friction: "Work overload",
      grease: "Set boundaries",
      insight: "You can't pour from an empty cup.",
    },
    expected: true
  },
  {
    name: "accepts empty arrays",
    data: { entities: [], connections: [], question: "", response: "" },
    expected: true
  },
  {
    name: "rejects more than 10 connections (free tier)",
    data: {
      entities: [{ type: "problem", label: "A" }, { type: "problem", label: "B" }],
      connections: Array.from({ length: 11 }, () => ({ from: 0, to: 1, type: "causes", strength: 0.5 })),
      question: "Test",
      response: "Test",
    },
    expected: false
  },
  {
    name: "rejects question over 100 chars",
    data: { entities: [], connections: [], question: "Q".repeat(101), response: "OK" },
    expected: false
  },
  {
    name: "rejects response over 50 chars",
    data: { entities: [], connections: [], question: "OK", response: "R".repeat(51) },
    expected: false
  },
  {
    name: "boundary: max question (100 chars)",
    data: { entities: [], connections: [], question: "Q".repeat(100), response: "R" },
    expected: true
  },
  {
    name: "boundary: max response (50 chars)",
    data: { entities: [], connections: [], question: "Q", response: "R".repeat(50) },
    expected: true
  }
];

runSchemaTests(
  "ResponseSchema (free)", 
  createResponseSchema(getTierLimits("free")), 
  responseSchemaTests
);

// =============================================================================
// PII REDACTION TESTS
// =============================================================================

type PiiTestCase = {
  name: string;
  input: string;
  // Use arrays of strings to verify presence or absence of text
  shouldInclude?: string[];
  shouldNotInclude?: string[];
  // Check if specific PII types were reported in the result list
  expectedPiiTypes?: string[];
  exactMatch?: string;
};

const piiTests: PiiTestCase[] = [
  {
    name: "redacts email addresses",
    input: "Contact me at john.doe@example.com for more info",
    exactMatch: "Contact me at [REDACTED_EMAIL] for more info",
    expectedPiiTypes: ["email"]
  },
  {
    name: "redacts multiple emails",
    input: "Email alice@test.com or bob@company.org",
    shouldNotInclude: ["alice@", "bob@"],
    expectedPiiTypes: ["email"]
  },
  {
    name: "redacts phone numbers",
    input: "Call 555-123-4567",
    shouldInclude: ["[REDACTED_PHONE]"],
    expectedPiiTypes: ["phone"]
  },
  {
    name: "redacts SSN",
    input: "SSN: 123-45-6789",
    shouldInclude: ["[REDACTED_SSN]"],
    expectedPiiTypes: ["ssn"]
  },
  {
    name: "redacts credit card numbers",
    input: "Card: 4111-1111-1111-1111",
    shouldInclude: ["[REDACTED_CREDITCARD]"],
    expectedPiiTypes: ["creditCard"]
  },
  {
    name: "redacts IP addresses",
    input: "Server at 192.168.1.1",
    shouldNotInclude: ["192.168"],
    expectedPiiTypes: ["ipAddress"]
  },
  {
    name: "handles text with no PII",
    input: "Just a normal message about work stress",
    exactMatch: "Just a normal message about work stress",
    expectedPiiTypes: []
  },
  {
    name: "handles multiple PII types",
    input: "Email test@example.com, call 555-123-4567, SSN 123-45-6789",
    shouldInclude: ["[REDACTED_EMAIL]", "[REDACTED_PHONE]", "[REDACTED_SSN]"],
  },
  {
    name: "preserves message structure",
    input: "My email is user@domain.com and my feelings are valid",
    shouldInclude: ["My email is [REDACTED_EMAIL] and my feelings are valid"]
  },
  // Obfuscated Email Tests
  {
    name: "redacts obfuscated email 'dot at dot'",
    input: "Contact me at john dot doe at gmail dot com",
    shouldInclude: ["[REDACTED_OBFUSCATED_EMAIL]"],
    expectedPiiTypes: ["obfuscatedEmail"]
  },
  {
    name: "redacts obfuscated email bracket style",
    input: "Email: j[dot]doe[at]gmail[dot]com",
    shouldInclude: ["[REDACTED_OBFUSCATED_EMAIL]"],
    expectedPiiTypes: ["obfuscatedEmail"]
  },
  {
    name: "redacts obfuscated email parenthesis style",
    input: "My email: john (dot) doe (at) example (dot) org",
    shouldInclude: ["[REDACTED_OBFUSCATED_EMAIL]"],
    expectedPiiTypes: ["obfuscatedEmail"]
  },
];

for (const { name, input, shouldInclude, shouldNotInclude, expectedPiiTypes, exactMatch } of piiTests) {
  Deno.test(`redactPII: ${name}`, () => {
    const { redacted, piiFound } = redactPII(input);
    
    if (exactMatch) {
      assertEquals(redacted, exactMatch);
    }
    
    if (shouldInclude) {
      for (const snippet of shouldInclude) {
        assert(redacted.includes(snippet), `Redacted text missing expected snippet: ${snippet}. Got: ${redacted}`);
      }
    }
    
    if (shouldNotInclude) {
      for (const snippet of shouldNotInclude) {
        assert(!redacted.includes(snippet), `Redacted text still contains secret: ${snippet}`);
      }
    }
    
    // Check PII types if specified
    if (expectedPiiTypes) {
      if (expectedPiiTypes.length === 0) {
        assertEquals(piiFound.length, 0);
      } else {
        const found = expectedPiiTypes.every(t => piiFound.some(p => p.includes(t)));
        assert(found, `Expected PII types ${expectedPiiTypes} not found in ${piiFound}`);
      }
    }
  });
}

// Extra Loop for Phone Formats
Deno.test("redactPII: handles various phone formats", () => {
  const formats = [
    "Call me at 555-123-4567",
    "Phone: (555) 123-4567",
    "Mobile: 555.123.4567",
    "Tel: +1 555 123 4567",
    "5551234567",
  ];
  for (const fmt of formats) {
    const { redacted } = redactPII(fmt);
    assert(redacted.includes("[REDACTED_PHONE]"), `Failed for format: ${fmt}`);
  }
});

console.log("\n✅ All validation tests passed!\n");
