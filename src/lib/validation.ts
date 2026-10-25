import { z } from "zod";
import { ValidationError } from "./errors";

/**
 * aSpiral Validation Schemas
 * Enterprise-grade input validation
 */

export const schemas = {
  // Session schemas
  createSession: z.object({
    userId: z.string().min(1),
    idempotencyKey: z.string().optional(),
  }),

  // Message schemas
  message: z.object({
    sessionId: z.string().min(1),
    content: z.string().min(1).max(10000),
    context: z.record(z.unknown()).optional(),
  }),

  // AI conversation schemas
  conversationInput: z.object({
    message: z.string().min(1).max(10000),
    sessionId: z.string().optional(),
    context: z
      .object({
        entities: z.array(z.unknown()).optional(),
        connections: z.array(z.unknown()).optional(),
        previousMessages: z.array(z.unknown()).optional(),
      })
      .optional(),
  }),

  // Entity schemas
  entity: z.object({
    id: z.string(),
    type: z.enum(["problem", "emotion", "value", "action", "friction", "grease"]),
    label: z.string().min(1).max(200),
    position: z
      .object({
        x: z.number(),
        y: z.number(),
        z: z.number().optional(),
      })
      .optional(),
  }),

  // Export schemas
  exportRequest: z.object({
    sessionId: z.string().min(1),
    format: z.enum(["3d-link", "video", "infographic", "action-plan"]),
  }),
};

/**
 * Validate input against schema with typed output
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError("Invalid input", error.errors || error.issues);
    }
    throw error;
  }
}

/**
 * Safe validation that returns result object
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ValidationError } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: new ValidationError("Invalid input", error.errors || error.issues),
      };
    }
    return {
      success: false,
      error: new ValidationError("Unknown validation error"),
    };
  }
}
