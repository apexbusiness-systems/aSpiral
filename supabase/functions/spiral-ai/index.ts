import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { moderateContent, SAFE_RESPONSES, type ModerationResult } from "./content-guard.ts";
import { checkRateLimit, checkSessionLimit, type RateLimitResult } from "./rate-limiter.ts";
import { ComplianceLogger, detectJurisdiction } from "./compliance-logger.ts";
import { detectPromptInjection, validateOutput, detectAnomaly, INJECTION_RESPONSES } from "./prompt-shield.ts";
import { validateInput, parseRequestBody, validateHeaders, type ValidatedInput } from "./input-validator.ts";
import { createComplianceWriter } from "./compliance-store.ts";
import { createResponseSchema, getTierLimits, type SpiralAIResponse } from "./ai-schema.ts";
import { redactPII } from "./pii-redactor.ts";
import { loadAspiralMindcore } from "./aspiralMindcoreLoader.ts";

// =============================================================================
// PHASE 4: FULL GUARDRAILS - Content Moderation, Rate Limiting, Compliance
// Enterprise-Grade Hardening with Durable Compliance Logging
// =============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Production configuration
const AI_TIMEOUT_MS = 30000; // 30 second timeout for AI gateway
const ENABLE_DETAILED_ERRORS = Deno.env.get("ENABLE_DETAILED_ERRORS") === "true";

// Flush timeouts (ms)
const FLUSH_START_MS = 250;
const FLUSH_BLOCK_MS = 400;
const FLUSH_SUCCESS_MS = 500;

// =============================================================================
// CRYPTO HASHING - SHA-256 for identifier hashing
// =============================================================================

async function hashSHA256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  // Return only first 16 chars for brevity while maintaining uniqueness
  return hashHex.substring(0, 16);
}

// =============================================================================
// VALIDATION WITH RETRY - AI Integrity Loop with Tier-Aware Schema
// =============================================================================

const MAX_VALIDATION_RETRIES = 2;

// Helper: Format validation error messages
function formatValidationErrors(error: Error): string {
  if ("errors" in error && Array.isArray((error as unknown as { errors: unknown[] }).errors)) {
    return ((error as unknown as { errors: Array<{ path: string[]; message: string }> }).errors)
      .map(e => `- ${e.path.join('.')}: ${e.message}`)
      .join('\n');
  }
  return error.message;
}

// Helper: Parse JSON from AI response content
function parseAIResponseContent(content: string): unknown | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
  } catch {
    return null;
  }
}

// Helper: Create fallback response
function createFallbackResponse(shouldBreakthrough: boolean): SpiralAIResponse {
  return {
    entities: [],
    connections: [],
    question: shouldBreakthrough ? "" : "What's on your mind?",
    response: "I hear you.",
    friction: undefined,
    grease: undefined,
    insight: undefined,
  };
}

async function callAIWithValidation(
  systemPrompt: string,
  userContent: string,
  shouldBreakthrough: boolean,
  userTier: string
): Promise<{ data: SpiralAIResponse; retryCount: number }> {
  const limits = getTierLimits(userTier);
  const ResponseSchema = createResponseSchema(limits);
  
  let lastError: Error | null = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
    // Build prompt with validation feedback on retry
    const prompt = attempt > 0 && lastError
      ? `${systemPrompt}\n\n⚠️ VALIDATION FAILED ON PREVIOUS ATTEMPT:\n${formatValidationErrors(lastError)}\n\nPlease fix these issues and respond with valid JSON.`
      : systemPrompt;

    if (attempt > 0) {
      console.log(`[SPIRAL-AI] 🔄 Retry ${attempt}/${MAX_VALIDATION_RETRIES} with validation feedback`);
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(LOVABLE_AI_URL, {
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
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse and validate response
    const parsed = parseAIResponseContent(content);
    if (parsed === null) {
      lastError = new Error("Invalid JSON response from AI");
      retryCount = attempt + 1;
      continue;
    }

    const result = ResponseSchema.safeParse(parsed);
    if (result.success) {
      console.log(`[SPIRAL-AI] ✅ Validation passed on attempt ${attempt + 1}`);
      return { data: result.data as SpiralAIResponse, retryCount: attempt };
    }

    lastError = result.error;
    retryCount = attempt + 1;
    console.warn(`[SPIRAL-AI] ⚠️ Validation failed:`, result.error.errors.slice(0, 3));
  }

  // All retries failed - return safe fallback
  console.error(`[SPIRAL-AI] ❌ Validation failed after ${MAX_VALIDATION_RETRIES + 1} attempts`);
  return { data: createFallbackResponse(shouldBreakthrough), retryCount };
}

// =============================================================================
// PROMPTS & PATTERNS
// =============================================================================

const FRUSTRATION_PATTERNS = [
  /annoying/i, /stop/i, /enough/i, /just tell me/i, /wtf/i, /ffs/i,
  /come on/i, /seriously/i, /waste.*time/i, /dragging/i, /taking forever/i,
  /get to the point/i, /skip/i, /cut to/i, /what's the answer/i,
];

const MAX_QUESTIONS = 3;

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
// HELPER FUNCTIONS FOR ERROR RESPONSES
// =============================================================================

function createErrorResponse(status: number, body: unknown, additionalHeaders: Record<string, string> = {}): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        ...additionalHeaders,
      },
    }
  );
}

function handleValidationError(errors: unknown[]): Response {
  return createErrorResponse(400, {
    error: "Invalid request format",
    details: errors?.map((e: { message: string }) => e.message),
  });
}

function handleInjectionBlock(): Response {
  return createErrorResponse(200, {
    entities: [],
    connections: [],
    question: INJECTION_RESPONSES.BLOCKED.suggestion,
    response: INJECTION_RESPONSES.BLOCKED.message,
    blocked: true,
    category: "INJECTION_ATTEMPT",
  }, { "X-Security-Block": "INJECTION" });
}

function handleAnomalyDetection(): Response {
  return createErrorResponse(429, {
    error: INJECTION_RESPONSES.RATE_ANOMALY.message,
    retryAfter: INJECTION_RESPONSES.RATE_ANOMALY.retryAfter,
  }, { "Retry-After": "60" });
}

function handleRateLimit(rateLimitResult: RateLimitResult): Response {
  return createErrorResponse(429, {
    error: SAFE_RESPONSES.RATE_LIMITED.message,
    retryAfter: rateLimitResult.retryAfterSeconds,
    upgradePrompt: rateLimitResult.upgradePrompt,
  }, {
    "Retry-After": String(rateLimitResult.retryAfterSeconds || 60),
    "X-RateLimit-Limit": String(rateLimitResult.limits.requestsPerMinute),
    "X-RateLimit-Remaining": String(Math.max(0, rateLimitResult.limits.requestsPerMinute - rateLimitResult.currentUsage.minute)),
  });
}

function handleModerationBlock(moderationResult: ModerationResult): Response {
  // Return appropriate safe response
  if (moderationResult.action === "REDIRECT_RESOURCES") {
    return createErrorResponse(200, {
      error: SAFE_RESPONSES.REDIRECT_CRISIS.message,
      resources: moderationResult.resources,
      blocked: true,
      category: "CRISIS_SUPPORT",
    });
  }

  let safeResponse = SAFE_RESPONSES.BLOCKED_GENERAL;
  if (moderationResult.category?.includes("VIOLENCE")) {
    safeResponse = SAFE_RESPONSES.BLOCKED_VIOLENCE;
  } else if (moderationResult.category?.includes("ILLEGAL") ||
             moderationResult.category?.includes("DRUG") ||
             moderationResult.category?.includes("CRIME")) {
    safeResponse = SAFE_RESPONSES.BLOCKED_ILLEGAL;
  }

  return createErrorResponse(200, {
    entities: [],
    connections: [],
    question: safeResponse.suggestion || "",
    response: safeResponse.message,
    blocked: true,
    category: moderationResult.category,
  }, {
    "X-Content-Blocked": "true",
    "X-Block-Category": moderationResult.category || "POLICY_VIOLATION",
  });
}

function buildContextInfo(
  sessionContext: {
    entities?: Array<{ type: string; label: string }>;
    conversationHistory?: string[];
    detectedPatterns?: Array<{ name: string; confidence: number }>;
  } | undefined,
  stagePrompt: string | undefined,
  questionsAsked: number,
  shouldBreakthrough: boolean,
  maxQuestions: number
): string {
  let contextInfo = "";
  if (sessionContext?.entities?.length) {
    contextInfo += `\nExisting entities (don't duplicate): ${sessionContext.entities.map(e => e.label).join(", ")}`;
  }
  if (sessionContext?.conversationHistory?.length) {
    const sanitizedHistory = sessionContext.conversationHistory.map(h => redactPII(h).redacted);
    contextInfo += `\nConversation:\n${sanitizedHistory.slice(-4).join("\n")}`;
  }
  if (sessionContext?.detectedPatterns?.length) {
    contextInfo += `\nPatterns (use for insight): ${sessionContext.detectedPatterns.map(p => p.name).join(", ")}`;
  }
  if (stagePrompt && !shouldBreakthrough) {
    contextInfo += `\n\nSTAGE: ${stagePrompt}`;
  }
  if (questionsAsked === maxQuestions - 1 && !shouldBreakthrough) {
    contextInfo += `\n\n⚠️ LAST QUESTION - make it count.`;
  }
  return contextInfo;
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
  
  // Attach durable writer if configured
  const writer = createComplianceWriter();
  complianceLogger.attachWriter(writer);
  
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
      return handleValidationError(inputValidation.errors || []);
    }

    const { 
      transcript, 
      sessionContext, 
      stagePrompt,
      ultraFast,
      userTier,
      userId,
      sessionId,
      forceBreakthrough,
    } = inputValidation.data as ValidatedInput;
    
    // =======================================================================
    // COMPUTE STRONG HASHES (SHA-256) FOR IDENTIFIERS
    // =======================================================================
    const sessionHash = await hashSHA256(sessionId);
    const userHash = userId ? await hashSHA256(userId) : undefined;
    
    // Set context on compliance logger
    complianceLogger.setContext({
      sessionHash: `sha:${sessionHash}`,
      userHash: userHash ? `sha:${userHash}` : undefined,
      userTier,
    });
    
    complianceLogger.log("REQUEST_RECEIVED", {
      sessionHash: `sha:${sessionHash}`,
      contentLength: transcript.length,
    });

    // =======================================================================
    // CRITICAL: WRITE RUN START EARLY (before any LLM/network calls)
    // =======================================================================
    await complianceLogger.writeRunStart();
    await complianceLogger.flush(FLUSH_START_MS);

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

      await complianceLogger.finalizeRun({ status: "BLOCKED", blocked: true });
      await complianceLogger.flush(FLUSH_BLOCK_MS);
      return handleInjectionBlock();
    }

    // =======================================================================
    // LAYER 0.9: ANOMALY DETECTION
    // =======================================================================
    const anomalyResult = detectAnomaly(userId, injectionResult.fingerprint, transcript.length);
    
    if (anomalyResult.isAnomaly) {
      console.warn(`[SPIRAL-AI] 🔍 Anomaly detected: ${anomalyResult.reason}`, { userId });
      complianceLogger.log("ANOMALY_DETECTED", { reason: anomalyResult.reason });
      
      await complianceLogger.finalizeRun({ status: "BLOCKED", blocked: true });
      await complianceLogger.flush(FLUSH_BLOCK_MS);
      return handleAnomalyDetection();
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

      await complianceLogger.finalizeRun({ status: "BLOCKED", blocked: true });
      await complianceLogger.flush(FLUSH_BLOCK_MS);
      return handleRateLimit(rateLimitResult);
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
      
      await complianceLogger.finalizeRun({ status: "BLOCKED", blocked: true });
      await complianceLogger.flush(FLUSH_BLOCK_MS);
      
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

      await complianceLogger.finalizeRun({ status: "BLOCKED", blocked: true });
      await complianceLogger.flush(FLUSH_BLOCK_MS);
      return handleModerationBlock(moderationResult);
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
      userTier,
      piiRedacted: piiFound.length > 0,
      processingMs: Date.now() - startTime,
    });

    // Build context for user-content only (single system prompt source remains MindCore SSOT)
    const contextInfo = buildContextInfo(sessionContext, stagePrompt, questionsAsked, shouldBreakthrough, MAX_QUESTIONS);

    let mindcore;
    try {
      mindcore = await loadAspiralMindcore();
    } catch (error) {
      console.error("[SPIRAL-AI] ❌ MindCore load failed; disabling aSpiral agent initialization", {
        error: error instanceof Error ? error.message : String(error),
      });

      await complianceLogger.finalizeRun({ status: "ERROR", blocked: true });
      await complianceLogger.flush(FLUSH_BLOCK_MS);
      return new Response(
        JSON.stringify({ error: "aSpiral agent unavailable: prompt integrity check failed" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SPIRAL-AI] MindCore prompt locked", {
      aspiral_prompt_version: mindcore.version,
      aspiral_prompt_sha256: mindcore.sha256,
    });

    const systemPrompt = mindcore.systemPrompt;

    // =======================================================================
    // PHASE 3: VALIDATED AI CALL - With schema validation and retry
    // =======================================================================
    const userContent = `${sanitizedTranscript}${contextInfo}`;
    const { data: validatedResult, retryCount } = await callAIWithValidation(
      systemPrompt,
      userContent,
      shouldBreakthrough,
      userTier
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

    // Finalize run as SUCCESS
    await complianceLogger.finalizeRun({ status: "SUCCESS" });
    await complianceLogger.flush(FLUSH_SUCCESS_MS);

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
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown";
    console.error("[SPIRAL-AI] Error:", { requestId, error: errorMessage, processingMs: processingTime });

    // Finalize run as ERROR (never throws)
    await complianceLogger.finalizeRun({ 
      status: "ERROR", 
      errorCode: error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "INTERNAL_ERROR",
      errorMessage: errorMessage.substring(0, 200), // Truncate for safety
    });
    await complianceLogger.flush(FLUSH_BLOCK_MS);

    // Handle timeout errors
    if (error instanceof Error && error.name === "AbortError") {
      complianceLogger.log("ERROR_OCCURRED", { errorCode: "TIMEOUT", errorMessage: "AI gateway timeout" });
      return new Response(
        JSON.stringify({
          error: "Request timed out. Please try again.",
          requestId,
          entities: [],
          connections: [],
          question: "That took too long. Want to try again?",
          response: "",
        }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId } }
      );
    }

    // Handle rate limit errors from AI gateway
    if (error instanceof Error && error.message.includes("429")) {
      complianceLogger.log("ERROR_OCCURRED", { errorCode: "AI_RATE_LIMIT", errorMessage: "AI gateway rate limited" });
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again shortly.", requestId }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId, "Retry-After": "30" } }
      );
    }

    // Handle payment/quota errors
    if (error instanceof Error && error.message.includes("402")) {
      complianceLogger.log("ERROR_OCCURRED", { errorCode: "QUOTA_EXCEEDED", errorMessage: "AI credits exhausted" });
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add credits.", requestId }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId } }
      );
    }

    // Handle network errors
    if (error instanceof Error && (error.message.includes("fetch") || error.message.includes("network"))) {
      complianceLogger.log("ERROR_OCCURRED", { errorCode: "NETWORK_ERROR", errorMessage: "AI gateway unreachable" });
      return new Response(
        JSON.stringify({
          error: "Service temporarily unavailable. Please try again.",
          requestId,
          entities: [],
          connections: [],
          question: "Having trouble connecting. Try again?",
          response: "",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId, "Retry-After": "5" } }
      );
    }

    // Generic error fallback - hide internal details in production
    complianceLogger.log("ERROR_OCCURRED", { errorCode: "INTERNAL_ERROR", errorMessage: errorMessage });
    return new Response(
      JSON.stringify({
        error: ENABLE_DETAILED_ERRORS && error instanceof Error ? error.message : "An unexpected error occurred",
        requestId,
        entities: [],
        connections: [],
        question: "Something went wrong. Try again?",
        response: "",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId } }
    );
  }
});
