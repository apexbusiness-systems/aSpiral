import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { moderateContent, SAFE_RESPONSES, type ModerationResult } from "./content-guard.ts";
import { checkRateLimit, checkSessionLimit, type RateLimitResult } from "./rate-limiter.ts";
import { ComplianceLogger, detectJurisdiction } from "./compliance-logger.ts";
import { detectPromptInjection, validateOutput, detectAnomaly, INJECTION_RESPONSES } from "./prompt-shield.ts";
import { validateInput, parseRequestBody, validateHeaders, type ValidatedInput } from "./input-validator.ts";

// =============================================================================
// PHASE 4: FULL GUARDRAILS - Content Moderation, Rate Limiting, Compliance
// =============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// =============================================================================
// ZOD SCHEMAS - Strict Output Validation
// =============================================================================

const EntitySchema = z.object({
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

const ConnectionSchema = z.object({
  from: z.number().int().min(0),
  to: z.number().int().min(0),
  type: z.enum(["causes", "blocks", "enables", "resolves", "opposes"]),
  strength: z.number().min(0).max(1),
});

// Main response schema - HARD LIMITS enforced
const ResponseSchema = z.object({
  entities: z.array(EntitySchema).max(5, "Maximum 5 entities allowed"),
  connections: z.array(ConnectionSchema).max(10, "Maximum 10 connections allowed"),
  question: z.string().max(100, "Question must be under 100 characters"),
  response: z.string().max(50, "Response must be under 50 characters"),
  friction: z.string().max(100).optional(),
  grease: z.string().max(100).optional(),
  insight: z.string().max(150).optional(),
});

type ValidatedResponse = z.infer<typeof ResponseSchema>;

// =============================================================================
// PII REDACTION - Security Layer
// =============================================================================

const PII_PATTERNS = {
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Phone numbers (various formats)
  phone: /(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
  // SSN
  ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
  // Credit card numbers
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  // IP addresses
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

function redactPII(text: string): { redacted: string; piiFound: string[] } {
  const piiFound: string[] = [];
  let redacted = text;

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches) {
      piiFound.push(`${type}: ${matches.length} instance(s)`);
      redacted = redacted.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
    }
  }

  return { redacted, piiFound };
}

// =============================================================================
// VALIDATION WITH RETRY - AI Integrity Loop
// =============================================================================

const MAX_VALIDATION_RETRIES = 2;

async function callAIWithValidation(
  systemPrompt: string,
  userContent: string,
  shouldBreakthrough: boolean
): Promise<{ data: ValidatedResponse; retryCount: number }> {
  let lastError: z.ZodError | null = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
    let prompt = systemPrompt;
    
    // On retry, add validation feedback
    if (attempt > 0 && lastError) {
      const errorMessages = lastError.errors
        .map(e => `- ${e.path.join('.')}: ${e.message}`)
        .join('\n');
      
      prompt += `\n\n⚠️ VALIDATION FAILED ON PREVIOUS ATTEMPT:\n${errorMessages}\n\nPlease fix these issues and respond with valid JSON.`;
      console.log(`[SPIRAL-AI] 🔄 Retry ${attempt}/${MAX_VALIDATION_RETRIES} with validation feedback`);
    }

    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response
    let parsed: unknown;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      lastError = new z.ZodError([{
        code: "custom",
        path: ["root"],
        message: "Invalid JSON response from AI",
      }]);
      retryCount = attempt + 1;
      continue;
    }

    // Validate with Zod
    const result = ResponseSchema.safeParse(parsed);
    
    if (result.success) {
      console.log(`[SPIRAL-AI] ✅ Validation passed on attempt ${attempt + 1}`);
      return { data: result.data, retryCount: attempt };
    }

    lastError = result.error;
    retryCount = attempt + 1;
    console.warn(`[SPIRAL-AI] ⚠️ Validation failed:`, result.error.errors.slice(0, 3));
  }

  // All retries failed - return safe fallback
  console.error(`[SPIRAL-AI] ❌ Validation failed after ${MAX_VALIDATION_RETRIES + 1} attempts`);
  
  return {
    data: {
      entities: [],
      connections: [],
      question: shouldBreakthrough ? "" : "What's on your mind?",
      response: "I hear you.",
      friction: undefined,
      grease: undefined,
      insight: undefined,
    },
    retryCount,
  };
}

// =============================================================================
// PROMPTS & PATTERNS
// =============================================================================

const FRUSTRATION_PATTERNS = [
  /annoying/i, /stop/i, /enough/i, /just tell me/i, /wtf/i, /ffs/i,
  /come on/i, /seriously/i, /waste.*time/i, /dragging/i, /taking forever/i,
  /get to the point/i, /skip/i, /cut to/i, /what's the answer/i,
];

const HARD_ENTITY_CAP = 5;
const MAX_QUESTIONS = 3;

const QUESTION_PATTERNS = `
QUESTION STRUCTURE (rotate these):
- Direct: "So {paraphrase}. What's grinding?"
- Excavation: "Underneath that, what else?"
- Contrast: "When you're NOT feeling {negative}, what's different?"
- Challenge: "Is it really {surface}, or something deeper?"
- Stakes: "What happens if you do nothing?"
- Binary: "Simple: stay or go?"

ABSOLUTELY FORBIDDEN:
❌ "I hear your..." / "It sounds like..."
❌ "I'm here to help..." / "Let's explore..."
❌ "Can you tell me more..."
❌ "How does that make you feel?"
❌ Starting consecutive questions with "What"

Be DIRECT. Under 15 words. Reference their EXACT words.`;

const ENTITY_EXTRACTION_PROMPT = `You are ASPIRAL's discovery engine. Extract entities and ask ONE direct question.

${QUESTION_PATTERNS}

ENTITY RULES:
1. Extract MAX 5 entities (HARD LIMIT - violating this breaks the product)
2. Combine similar concepts
3. Only extract what MATTERS to the friction

ENTITY TYPES: problem, emotion, value, friction, grease, action
ENTITY ROLES: external_irritant, internal_conflict, desire, fear, constraint, solution

CONNECTION TYPES: causes, blocks, enables, resolves, opposes

OUTPUT JSON (STRICT SCHEMA):
{
  "entities": [
    {"type": "problem", "label": "3-word max", "role": "external_irritant", "emotionalValence": -0.8, "importance": 0.9}
  ],
  "connections": [{"from": 0, "to": 1, "type": "causes", "strength": 0.8}],
  "question": "Under 15 words. Direct. No fluff.",
  "response": "Max 8 words. Acknowledge briefly."
}

VALIDATION RULES:
- entities: array, max 5 items
- label: string, max 50 chars
- question: string, max 100 chars  
- response: string, max 50 chars
- emotionalValence: number -1 to 1
- importance: number 0 to 1
- connection strength: number 0 to 1

NEVER exceed limits. Schema validation is enforced.`;

const BREAKTHROUGH_PROMPT = `Synthesize the breakthrough from this conversation.

OUTPUT JSON (STRICT SCHEMA):
{
  "friction": "The gears grinding (concise, <15 words)",
  "grease": "The solution (actionable, <15 words)", 
  "insight": "The memorable one-liner (<25 words)",
  "entities": [],
  "connections": [],
  "question": "",
  "response": ""
}

VALIDATION RULES:
- friction: string, max 100 chars
- grease: string, max 100 chars
- insight: string, max 150 chars
- question: empty string for breakthrough
- response: empty string for breakthrough

RULES:
1. Be SPECIFIC to their situation
2. Reference their actual words
3. Make insight memorable and quotable
4. Grease must be ACTIONABLE

EXAMPLES:
Traffic frustration → "You can't change the drivers. You can change how much space they take in your head."
Job decision → "You don't need to leap. You need to take the first step."

Be SPECIFIC. Be ACTIONABLE. Be MEMORABLE.`;

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

interface RequestBody {
  transcript: string;
  userTier?: string;
  userId?: string;
  sessionId?: string;
  ultraFast?: boolean;
  sessionContext?: {
    entities?: Array<{ type: string; label: string }>;
    conversationHistory?: string[];
    questionsAsked?: number;
    stage?: "friction" | "desire" | "blocker" | "breakthrough";
    detectedPatterns?: Array<{ name: string; confidence: number }>;
  };
  forceBreakthrough?: boolean;
  stagePrompt?: string;
}

// =============================================================================
// GENERATE REQUEST ID
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Detect jurisdiction for compliance
  const jurisdiction = detectJurisdiction(req);
  const complianceLogger = new ComplianceLogger(requestId, jurisdiction);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      console.error("[SPIRAL-AI] LOVABLE_API_KEY not configured");
      complianceLogger.log("ERROR_OCCURRED", { errorCode: "CONFIG_ERROR", errorMessage: "API key not configured" });
      throw new Error("API key not configured");
    }

    // =======================================================================
    // LAYER 0: REQUEST PARSING & HEADER VALIDATION
    // =======================================================================
    const headerValidation = validateHeaders(req);
    if (!headerValidation.valid) {
      console.warn("[SPIRAL-AI] ⚠️ Header validation warnings:", headerValidation.warnings);
      complianceLogger.log("HEADER_WARNING", { warnings: headerValidation.warnings });
    }

    const parseResult = await parseRequestBody(req, 50000);
    if (!parseResult.success) {
      console.error("[SPIRAL-AI] ❌ Request parsing failed:", parseResult.error);
      return new Response(
        JSON.stringify({ error: parseResult.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =======================================================================
    // LAYER 0.5: INPUT SCHEMA VALIDATION
    // =======================================================================
    const inputValidation = validateInput(parseResult.data);
    if (!inputValidation.success) {
      console.error("[SPIRAL-AI] ❌ Input validation failed:", inputValidation.errors);
      complianceLogger.log("VALIDATION_FAILED", { errors: inputValidation.errors });
      return new Response(
        JSON.stringify({ 
          error: "Invalid request format",
          details: inputValidation.errors?.map(e => e.message),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      transcript, 
      sessionContext, 
      stagePrompt,
      ultraFast,
      userTier,
      userId,
      sessionId,
    } = inputValidation.data as ValidatedInput;
    
    complianceLogger.log("REQUEST_RECEIVED", {
      sessionHash: `h:${sessionId.substring(0, 8)}`,
      contentLength: transcript.length,
    });

    // =======================================================================
    // LAYER 0.75: PROMPT INJECTION DETECTION
    // =======================================================================
    const injectionResult = detectPromptInjection(transcript, requestId);
    
    complianceLogger.log("INJECTION_CHECK", {
      riskScore: injectionResult.riskScore,
      threatCount: injectionResult.threats.length,
      blocked: !injectionResult.isSafe,
    });

    if (!injectionResult.isSafe) {
      console.warn(`[SPIRAL-AI] 🛡️ Prompt injection BLOCKED`, {
        requestId,
        riskScore: injectionResult.riskScore,
        threats: injectionResult.threats.slice(0, 3).map(t => t.category),
      });
      
      return new Response(
        JSON.stringify({
          entities: [],
          connections: [],
          question: INJECTION_RESPONSES.BLOCKED.suggestion,
          response: INJECTION_RESPONSES.BLOCKED.message,
          blocked: true,
          category: "INJECTION_ATTEMPT",
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-Security-Block": "INJECTION",
          } 
        }
      );
    }

    // =======================================================================
    // LAYER 0.9: ANOMALY DETECTION
    // =======================================================================
    const anomalyResult = detectAnomaly(userId, injectionResult.fingerprint, transcript.length);
    
    if (anomalyResult.isAnomaly) {
      console.warn(`[SPIRAL-AI] 🔍 Anomaly detected: ${anomalyResult.reason}`, { userId });
      complianceLogger.log("ANOMALY_DETECTED", { reason: anomalyResult.reason });
      
      return new Response(
        JSON.stringify({
          error: INJECTION_RESPONSES.RATE_ANOMALY.message,
          retryAfter: INJECTION_RESPONSES.RATE_ANOMALY.retryAfter,
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "60",
          } 
        }
      );
    }

    // =======================================================================
    // LAYER 1: RATE LIMITING - Multi-tier with abuse detection
    // =======================================================================
    const rateLimitResult = checkRateLimit(userId, userTier, transcript.length);
    
    complianceLogger.log("RATE_LIMIT_CHECK", {
      rateLimitStatus: rateLimitResult.allowed ? "ALLOWED" : "LIMITED",
      currentUsage: rateLimitResult.currentUsage,
    });
    
    if (!rateLimitResult.allowed) {
      console.warn(`[SPIRAL-AI] 🚫 Rate limited: ${rateLimitResult.reason}`, {
        userId,
        tier: userTier,
        usage: rateLimitResult.currentUsage,
      });
      
      return new Response(
        JSON.stringify({
          error: SAFE_RESPONSES.RATE_LIMITED.message,
          retryAfter: rateLimitResult.retryAfterSeconds,
          upgradePrompt: rateLimitResult.upgradePrompt,
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.retryAfterSeconds || 60),
            "X-RateLimit-Limit": String(rateLimitResult.limits.requestsPerMinute),
            "X-RateLimit-Remaining": String(Math.max(0, rateLimitResult.limits.requestsPerMinute - rateLimitResult.currentUsage.minute)),
          } 
        }
      );
    }

    // =======================================================================
    // LAYER 2: SESSION PROMPT CAP - Per-session limits with upgrade hooks
    // =======================================================================
    const sessionLimitResult = checkSessionLimit(sessionId, userTier);
    
    if (!sessionLimitResult.allowed) {
      console.warn(`[SPIRAL-AI] 📊 Session limit reached`, {
        sessionId,
        count: sessionLimitResult.count,
        limit: sessionLimitResult.limit,
      });
      
      return new Response(
        JSON.stringify({
          error: SAFE_RESPONSES.QUOTA_EXCEEDED.message,
          upgradePrompt: sessionLimitResult.upgradePrompt,
          promptCount: sessionLimitResult.count,
          promptLimit: sessionLimitResult.limit,
        }),
        { 
          status: 402, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // =======================================================================
    // LAYER 3: CONTENT MODERATION - Multi-jurisdiction compliance
    // =======================================================================
    const moderationResult = moderateContent(transcript, requestId, jurisdiction);
    
    complianceLogger.log("CONTENT_MODERATED", {
      moderationDecision: moderationResult.auditLog.decision,
      moderationCategory: moderationResult.category,
      moderationSeverity: moderationResult.severity,
      contentHash: moderationResult.auditLog.contentHash,
    });
    
    if (!moderationResult.allowed) {
      console.warn(`[SPIRAL-AI] 🛡️ Content blocked: ${moderationResult.category}`, {
        requestId,
        severity: moderationResult.severity,
        action: moderationResult.action,
      });
      
      complianceLogger.log("BLOCKED_CONTENT", {
        moderationCategory: moderationResult.category,
        moderationSeverity: moderationResult.severity,
      });
      
      // Return appropriate safe response
      let safeResponse = SAFE_RESPONSES.BLOCKED_GENERAL;
      if (moderationResult.action === "REDIRECT_RESOURCES") {
        return new Response(
          JSON.stringify({
            error: SAFE_RESPONSES.REDIRECT_CRISIS.message,
            resources: moderationResult.resources,
            blocked: true,
            category: "CRISIS_SUPPORT",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (moderationResult.category?.includes("VIOLENCE")) {
        safeResponse = SAFE_RESPONSES.BLOCKED_VIOLENCE;
      } else if (moderationResult.category?.includes("ILLEGAL") || 
                 moderationResult.category?.includes("DRUG") ||
                 moderationResult.category?.includes("CRIME")) {
        safeResponse = SAFE_RESPONSES.BLOCKED_ILLEGAL;
      }
      
      return new Response(
        JSON.stringify({
          entities: [],
          connections: [],
          question: safeResponse.suggestion || "",
          response: safeResponse.message,
          blocked: true,
          category: moderationResult.category,
        }),
        { 
          status: 200, // Return 200 with safe response, not error
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-Content-Blocked": "true",
            "X-Block-Category": moderationResult.category || "POLICY_VIOLATION",
          } 
        }
      );
    }
    
    // =======================================================================
    // LAYER 4: PII REDACTION - Sanitize before sending to LLM
    // =======================================================================
    const { redacted: sanitizedTranscript, piiFound } = redactPII(transcript);
    
    if (piiFound.length > 0) {
      console.log("[SPIRAL-AI] 🔒 PII redacted:", piiFound.join(", "));
      complianceLogger.log("PII_REDACTED", {
        piiTypesFound: piiFound,
        containsPII: true,
      });
    }
    
    const questionsAsked = sessionContext?.questionsAsked || 0;
    const stage = sessionContext?.stage || "friction";

    // FRUSTRATION CHECK - immediate breakthrough
    const isFrustrated = FRUSTRATION_PATTERNS.some(p => p.test(sanitizedTranscript));
    if (isFrustrated) {
      console.log("[SPIRAL-AI] ⚠️ Frustration detected, forcing breakthrough");
    }

    // Determine if breakthrough
    const shouldBreakthrough = 
      forceBreakthrough || 
      isFrustrated || 
      ultraFast ||
      questionsAsked >= MAX_QUESTIONS;

    console.log("[SPIRAL-AI] Processing:", {
      stage,
      questionsAsked,
      shouldBreakthrough,
      isFrustrated,
      ultraFast,
      piiRedacted: piiFound.length > 0,
      processingMs: Date.now() - startTime,
    });

    // Build context
    let contextInfo = "";
    if (sessionContext?.entities?.length) {
      contextInfo += `\nExisting entities (don't duplicate): ${sessionContext.entities.map(e => e.label).join(", ")}`;
    }
    if (sessionContext?.conversationHistory?.length) {
      // Redact PII from conversation history too
      const sanitizedHistory = sessionContext.conversationHistory.map(h => redactPII(h).redacted);
      contextInfo += `\nConversation:\n${sanitizedHistory.slice(-4).join("\n")}`;
    }
    if (sessionContext?.detectedPatterns?.length) {
      contextInfo += `\nPatterns (use for insight): ${sessionContext.detectedPatterns.map(p => p.name).join(", ")}`;
    }
    if (stagePrompt && !shouldBreakthrough) {
      contextInfo += `\n\nSTAGE: ${stagePrompt}`;
    }
    if (questionsAsked === MAX_QUESTIONS - 1 && !shouldBreakthrough) {
      contextInfo += `\n\n⚠️ LAST QUESTION - make it count.`;
    }

    const systemPrompt = shouldBreakthrough 
      ? BREAKTHROUGH_PROMPT + contextInfo 
      : ENTITY_EXTRACTION_PROMPT + contextInfo;

    // =======================================================================
    // PHASE 3: VALIDATED AI CALL - With retry on validation failure
    // =======================================================================
    const { data: validatedResult, retryCount } = await callAIWithValidation(
      systemPrompt,
      sanitizedTranscript,
      shouldBreakthrough
    );

    // Filter connections to only reference valid entity indices
    const validConnections = validatedResult.connections.filter(conn =>
      conn.from >= 0 &&
      conn.from < validatedResult.entities.length &&
      conn.to >= 0 &&
      conn.to < validatedResult.entities.length &&
      conn.strength > 0.5
    );

    // =======================================================================
    // LAYER 5: OUTPUT VALIDATION - Prevent System Prompt Leakage
    // =======================================================================
    const outputValidation = validateOutput(validatedResult.question || "");
    const responseValidation = validateOutput(validatedResult.response || "");
    const insightValidation = validatedResult.insight ? validateOutput(validatedResult.insight) : { safe: true, filtered: validatedResult.insight };

    const result = {
      ...validatedResult,
      connections: validConnections,
      question: shouldBreakthrough ? "" : (outputValidation.filtered || validatedResult.question),
      response: responseValidation.filtered || validatedResult.response,
      insight: insightValidation.filtered,
    };

    const processingTime = Date.now() - startTime;
    console.log("[SPIRAL-AI] ✅ Complete:", {
      entityCount: result.entities.length,
      hasQuestion: !!result.question,
      isBreakthrough: shouldBreakthrough,
      hasInsight: !!result.insight,
      validationRetries: retryCount,
      piiRedacted: piiFound.length > 0,
      outputFiltered: !outputValidation.safe || !responseValidation.safe,
      processingMs: processingTime,
    });

    return new Response(JSON.stringify(result), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-Processing-Time": `${processingTime}ms`,
        "X-Validation-Retries": `${retryCount}`,
        "X-PII-Redacted": piiFound.length > 0 ? "true" : "false",
        "X-Output-Filtered": (!outputValidation.safe || !responseValidation.safe) ? "true" : "false",
      },
    });
  } catch (error) {
    console.error("[SPIRAL-AI] Error:", error);
    
    // Handle specific error types
    if (error instanceof Error && error.message.includes("429")) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (error instanceof Error && error.message.includes("402")) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        entities: [],
        connections: [],
        question: "Something went wrong. Try again?",
        response: "",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
