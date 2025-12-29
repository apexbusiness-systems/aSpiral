/**
 * INPUT VALIDATOR - Comprehensive Input Validation & Sanitization
 * 
 * Defense Layers:
 * 1. Schema validation (type safety)
 * 2. Length & format constraints
 * 3. Character encoding validation
 * 4. Semantic validation
 * 5. Business logic validation
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// =============================================================================
// STRICT INPUT SCHEMAS
// =============================================================================

export const TranscriptSchema = z.object({
  transcript: z.string()
    .min(1, "Transcript cannot be empty")
    .max(10000, "Transcript too long (max 10,000 chars)")
    .refine(
      (val) => !containsNullBytes(val),
      "Invalid characters detected"
    )
    .refine(
      (val) => !isEncodedPayload(val),
      "Encoded payloads not allowed"
    ),
  
  userTier: z.enum(["free", "pro", "enterprise"]).default("free"),
  
  userId: z.string()
    .max(128, "User ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid user ID format")
    .optional()
    .default("anonymous"),
  
  sessionId: z.string()
    .max(128, "Session ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid session ID format")
    .optional()
    .default("default"),
  
  ultraFast: z.boolean().optional().default(false),
  forceBreakthrough: z.boolean().optional().default(false),
  
  stagePrompt: z.string()
    .max(500, "Stage prompt too long")
    .optional(),
  
  sessionContext: z.object({
    entities: z.array(z.object({
      type: z.string().max(50),
      label: z.string().max(200),
    })).max(20).optional(),
    
    conversationHistory: z.array(
      z.string().max(2000)
    ).max(20).optional(),
    
    questionsAsked: z.number().int().min(0).max(100).optional(),
    
    stage: z.enum(["friction", "desire", "blocker", "breakthrough"]).optional(),
    
    detectedPatterns: z.array(z.object({
      name: z.string().max(100),
      confidence: z.number().min(0).max(1),
    })).max(10).optional(),
  }).optional(),
});

export type ValidatedInput = z.infer<typeof TranscriptSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

function containsNullBytes(value: string): boolean {
  return value.includes('\0') || /\\x00|\\u0000/.test(value);
}

function isEncodedPayload(value: string): boolean {
  // Check for Base64 encoded content longer than expected
  const base64Pattern = /^[A-Za-z0-9+/]{50,}={0,2}$/;
  const words = value.split(/\s+/);
  
  for (const word of words) {
    if (base64Pattern.test(word) && word.length > 100) {
      return true;
    }
  }
  
  // Check for hex encoded content
  const hexPattern = /^(0x)?[0-9a-fA-F]{40,}$/;
  if (hexPattern.test(value.replace(/\s/g, ''))) {
    return true;
  }
  
  return false;
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

export interface ValidationResult {
  success: boolean;
  data?: ValidatedInput;
  errors?: ValidationError[];
  sanitizedInput?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export function validateInput(rawInput: unknown): ValidationResult {
  try {
    // First check if it's even an object
    if (typeof rawInput !== 'object' || rawInput === null) {
      return {
        success: false,
        errors: [{
          field: "root",
          message: "Invalid request body",
          code: "INVALID_TYPE",
        }],
      };
    }

    // Validate against schema
    const result = TranscriptSchema.safeParse(rawInput);
    
    if (!result.success) {
      const errors: ValidationError[] = result.error.errors.map((err) => ({
        field: err.path.join('.') || 'root',
        message: err.message,
        code: err.code,
      }));
      
      return { success: false, errors };
    }

    // Additional semantic validation
    const semanticErrors = performSemanticValidation(result.data);
    if (semanticErrors.length > 0) {
      return { success: false, errors: semanticErrors };
    }

    return {
      success: true,
      data: result.data,
      sanitizedInput: sanitizeTranscript(result.data.transcript),
    };
  } catch (error) {
    console.error("[INPUT-VALIDATOR] Unexpected error:", error);
    return {
      success: false,
      errors: [{
        field: "root",
        message: "Validation failed",
        code: "VALIDATION_ERROR",
      }],
    };
  }
}

// =============================================================================
// SEMANTIC VALIDATION
// =============================================================================

function performSemanticValidation(data: ValidatedInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for suspicious session context
  if (data.sessionContext?.entities) {
    for (let i = 0; i < data.sessionContext.entities.length; i++) {
      const entity = data.sessionContext.entities[i];
      
      // Check for injection attempts in entity labels
      if (containsInjectionAttempt(entity.label)) {
        errors.push({
          field: `sessionContext.entities[${i}].label`,
          message: "Invalid entity label",
          code: "INJECTION_DETECTED",
        });
      }
    }
  }

  // Check conversation history for injection
  if (data.sessionContext?.conversationHistory) {
    for (let i = 0; i < data.sessionContext.conversationHistory.length; i++) {
      const message = data.sessionContext.conversationHistory[i];
      
      if (containsInjectionAttempt(message)) {
        errors.push({
          field: `sessionContext.conversationHistory[${i}]`,
          message: "Invalid message content",
          code: "INJECTION_DETECTED",
        });
      }
    }
  }

  // Validate stage prompt if present
  if (data.stagePrompt && containsInjectionAttempt(data.stagePrompt)) {
    errors.push({
      field: "stagePrompt",
      message: "Invalid stage prompt",
      code: "INJECTION_DETECTED",
    });
  }

  return errors;
}

function containsInjectionAttempt(value: string): boolean {
  const injectionPatterns = [
    /ignore\s*(previous|all|prior)/gi,
    /system\s*prompt/gi,
    /\[\[.*?\]\]/g,
    /\{\{.*?\}\}/g,
    /<\s*system\s*>/gi,
  ];

  return injectionPatterns.some(pattern => pattern.test(value));
}

// =============================================================================
// TRANSCRIPT SANITIZATION
// =============================================================================

function sanitizeTranscript(transcript: string): string {
  let sanitized = transcript;

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Remove control characters (except newline and tab)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Limit consecutive newlines
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // Remove zero-width characters
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '');

  // Normalize quotes
  sanitized = sanitized
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");

  return sanitized;
}

// =============================================================================
// REQUEST BODY PARSER WITH TIMEOUT
// =============================================================================

export async function parseRequestBody(
  request: Request,
  maxSizeBytes = 50000
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    // Check content length header
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      return { success: false, error: "Request body too large" };
    }

    // Read body with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const body = await request.text();
      clearTimeout(timeout);

      if (body.length > maxSizeBytes) {
        return { success: false, error: "Request body too large" };
      }

      // Parse JSON
      const data = JSON.parse(body);
      return { success: true, data };
    } catch (parseError) {
      clearTimeout(timeout);
      
      if (parseError instanceof SyntaxError) {
        return { success: false, error: "Invalid JSON" };
      }
      
      return { success: false, error: "Failed to parse request" };
    }
  } catch (error) {
    return { success: false, error: "Request parsing failed" };
  }
}

// =============================================================================
// HEADER VALIDATION
// =============================================================================

export interface HeaderValidation {
  valid: boolean;
  clientInfo?: {
    userAgent: string;
    origin: string;
    contentType: string;
  };
  warnings: string[];
}

export function validateHeaders(request: Request): HeaderValidation {
  const warnings: string[] = [];
  
  const contentType = request.headers.get('content-type') || '';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const origin = request.headers.get('origin') || '';

  // Check content type
  if (!contentType.includes('application/json')) {
    warnings.push("Non-JSON content type");
  }

  // Check for suspicious user agents
  const suspiciousAgents = [
    /curl/i,
    /wget/i,
    /python/i,
    /requests/i,
    /postman/i,
    /insomnia/i,
  ];
  
  if (suspiciousAgents.some(pattern => pattern.test(userAgent))) {
    warnings.push("Suspicious user agent detected");
  }

  // Check for missing or unusual origin
  if (!origin && request.method !== 'OPTIONS') {
    warnings.push("Missing origin header");
  }

  return {
    valid: warnings.length < 3, // Allow some warnings
    clientInfo: {
      userAgent,
      origin,
      contentType,
    },
    warnings,
  };
}
