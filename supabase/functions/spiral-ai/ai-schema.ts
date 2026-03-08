/**
 * AI SCHEMA - Tier-Aware Zod Schemas for Spiral AI Response Validation
 * 
 * Features:
 * - Dynamic entity/connection caps based on user tier
 * - Shared schema definitions between prompt and validation
 * - Type exports for TypeScript integration
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// =============================================================================
// TIER CONFIGURATION
// =============================================================================

export interface TierLimits {
  maxEntities: number;
  maxConnections: number;
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  free: { maxEntities: 5, maxConnections: 10 },
  pro: { maxEntities: 8, maxConnections: 20 },
  enterprise: { maxEntities: 12, maxConnections: 30 },
};

/**
 * Get tier limits with fallback to free tier
 */
export function getTierLimits(tier: string | undefined): TierLimits {
  const normalizedTier = (tier || "free").toLowerCase();
  return TIER_LIMITS[normalizedTier] || TIER_LIMITS.free;
}

// =============================================================================
// BASE SCHEMAS (Reusable components)
// =============================================================================

export const EntitySchema = z.object({
  type: z.enum(["problem", "emotion", "value", "action", "friction", "grease"]),
  label: z.string().max(50, "Label must be under 50 characters"),
  role: z.enum([
    "external_irritant",
    "internal_conflict",
    "desire",
    "fear",
    "constraint",
    "solution"
  ]).optional(),
  emotionalValence: z.number().min(-1).max(1).optional(),
  importance: z.number().min(0).max(1).optional(),
});

export const ConnectionSchema = z.object({
  from: z.number().int().min(0),
  to: z.number().int().min(0),
  type: z.enum(["causes", "blocks", "enables", "resolves", "opposes"]),
  strength: z.number().min(0).max(1),
});

// =============================================================================
// DYNAMIC RESPONSE SCHEMA FACTORY
// =============================================================================

/**
 * Create a response schema with tier-specific limits
 */
export function createResponseSchema(limits: TierLimits) {
  return z.object({
    entities: z.array(EntitySchema).max(
      limits.maxEntities, 
      `Maximum ${limits.maxEntities} entities allowed`
    ),
    connections: z.array(ConnectionSchema).max(
      limits.maxConnections, 
      `Maximum ${limits.maxConnections} connections allowed`
    ),
    question: z.string().max(100, "Question must be under 100 characters"),
    response: z.string().max(500, "Response must be under 500 characters"),
    friction: z.string().max(300).optional(),
    grease: z.string().max(300).optional(),
    insight: z.string().max(500).optional(),
  });
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Entity = z.infer<typeof EntitySchema>;
export type Connection = z.infer<typeof ConnectionSchema>;

// Response type using free tier limits as base (most restrictive)
const BaseResponseSchema = createResponseSchema(TIER_LIMITS.free);
export type SpiralAIResponse = z.infer<typeof BaseResponseSchema>;

// =============================================================================
// PROMPT GENERATION
// =============================================================================

/**
 * Generate tier-specific validation rules for inclusion in prompts
 */
export function getPromptValidationRules(tier: string | undefined): string {
  const limits = getTierLimits(tier);
  
  return `VALIDATION RULES:
- entities: array, max ${limits.maxEntities} items
- connections: array, max ${limits.maxConnections} items
- label: string, max 50 chars
- question: string, max 100 chars  
- response: string, max 50 chars
- emotionalValence: number -1 to 1
- importance: number 0 to 1
- connection strength: number 0 to 1

NEVER exceed limits. Schema validation is enforced.`;
}

/**
 * Generate tier-specific entity extraction rules
 */
export function getEntityExtractionRules(tier: string | undefined): string {
  const limits = getTierLimits(tier);
  
  return `ENTITY RULES:
1. Extract MAX ${limits.maxEntities} entities (HARD LIMIT - violating this breaks the product)
2. Combine similar concepts
3. Only extract what MATTERS to the friction`;
}
