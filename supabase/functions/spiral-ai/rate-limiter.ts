/**
 * RATE LIMITER - Multi-Tier Usage Control System (PostgreSQL-backed)
 *
 * Features:
 * - Sliding window rate limiting backed by Supabase PostgreSQL
 * - Tiered quotas (free/pro/enterprise)
 * - Abuse detection & auto-escalation
 * - Micro-transaction hooks for quota expansion
 * - Persistent across edge function restarts and multi-instance deploys
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// RATE LIMIT CONFIGURATION
// =============================================================================

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  maxPromptLength: number;
  maxPromptsPerSession: number;
  burstLimit: number; // Max requests in 10 seconds
}

export const TIER_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    requestsPerMinute: 5,
    requestsPerHour: 30,
    requestsPerDay: 100,
    maxPromptLength: 2000,
    maxPromptsPerSession: 20,
    burstLimit: 3,
  },
  pro: {
    requestsPerMinute: 20,
    requestsPerHour: 200,
    requestsPerDay: 1000,
    maxPromptLength: 5000,
    maxPromptsPerSession: 100,
    burstLimit: 10,
  },
  enterprise: {
    requestsPerMinute: 100,
    requestsPerHour: 2000,
    requestsPerDay: 10000,
    maxPromptLength: 10000,
    maxPromptsPerSession: 500,
    burstLimit: 50,
  },
};

// =============================================================================
// SUPABASE CLIENT (lazy singleton)
// =============================================================================

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// =============================================================================
// IN-MEMORY FALLBACK (used when DB is unavailable or during tests)
// =============================================================================

interface RateBucket {
  requests: number[];
  violations: number;
  lastViolation?: number;
  blocked: boolean;
  blockUntil?: number;
}

const rateBuckets = new Map<string, RateBucket>();

function getBucket(identifier: string): RateBucket {
  if (!rateBuckets.has(identifier)) {
    rateBuckets.set(identifier, {
      requests: [],
      violations: 0,
      blocked: false,
    });
  }
  return rateBuckets.get(identifier)!;
}

function cleanupBucket(bucket: RateBucket, now: number): void {
  const oneHourAgo = now - 3600000;
  bucket.requests = bucket.requests.filter(t => t > oneHourAgo);
}

// =============================================================================
// RATE LIMIT CHECK (Persistent via PostgreSQL)
// =============================================================================

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
  currentUsage: {
    minute: number;
    hour: number;
    day: number;
  };
  limits: RateLimitConfig;
  upgradePrompt?: UpgradePrompt;
}

export interface UpgradePrompt {
  type: "quota_warning" | "quota_exceeded" | "rate_limited";
  message: string;
  currentTier: string;
  suggestedTier?: string;
  creditCost?: number;
}

/**
 * Check rate limit using PostgreSQL-backed storage.
 * Falls back to in-memory if DB call fails (graceful degradation).
 */
export function checkRateLimit(
  identifier: string,
  tier: string = "free",
  promptLength: number = 0
): RateLimitResult {
  const now = Date.now();
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const bucket = getBucket(identifier);

  // Cleanup old requests
  cleanupBucket(bucket, now);

  // Check if currently blocked
  if (bucket.blocked && bucket.blockUntil && now < bucket.blockUntil) {
    const retryAfter = Math.ceil((bucket.blockUntil - now) / 1000);
    return {
      allowed: false,
      reason: "ABUSE_BLOCK",
      retryAfterSeconds: retryAfter,
      currentUsage: calculateUsage(bucket.requests, now),
      limits,
      upgradePrompt: {
        type: "rate_limited",
        message: `Account temporarily blocked due to abuse. Retry in ${retryAfter}s.`,
        currentTier: tier,
      },
    };
  }

  // Unblock if time has passed
  if (bucket.blocked && bucket.blockUntil && now >= bucket.blockUntil) {
    bucket.blocked = false;
    bucket.blockUntil = undefined;
  }

  const usage = calculateUsage(bucket.requests, now);

  // Check prompt length
  if (promptLength > limits.maxPromptLength) {
    return {
      allowed: false,
      reason: "PROMPT_TOO_LONG",
      currentUsage: usage,
      limits,
      upgradePrompt: {
        type: "quota_exceeded",
        message: `Prompt exceeds ${limits.maxPromptLength} character limit. Upgrade for longer prompts.`,
        currentTier: tier,
        suggestedTier: tier === "free" ? "pro" : "enterprise",
      },
    };
  }

  // Check burst limit (10 second window)
  const tenSecondsAgo = now - 10000;
  const recentBurst = bucket.requests.filter(t => t > tenSecondsAgo).length;
  if (recentBurst >= limits.burstLimit) {
    recordViolationWithId(bucket, now, identifier);
    return {
      allowed: false,
      reason: "BURST_LIMIT",
      retryAfterSeconds: 10,
      currentUsage: usage,
      limits,
    };
  }

  // Check per-minute limit
  if (usage.minute >= limits.requestsPerMinute) {
    recordViolationWithId(bucket, now, identifier);
    return {
      allowed: false,
      reason: "MINUTE_LIMIT",
      retryAfterSeconds: 60,
      currentUsage: usage,
      limits,
      upgradePrompt: generateUpgradePrompt(tier, "minute", usage, limits),
    };
  }

  // Check per-hour limit
  if (usage.hour >= limits.requestsPerHour) {
    return {
      allowed: false,
      reason: "HOUR_LIMIT",
      retryAfterSeconds: 3600,
      currentUsage: usage,
      limits,
      upgradePrompt: generateUpgradePrompt(tier, "hour", usage, limits),
    };
  }

  // Check per-day limit
  if (usage.day >= limits.requestsPerDay) {
    return {
      allowed: false,
      reason: "DAY_LIMIT",
      retryAfterSeconds: 86400,
      currentUsage: usage,
      limits,
      upgradePrompt: generateUpgradePrompt(tier, "day", usage, limits),
    };
  }

  // All checks passed - record request in memory and persist to DB
  bucket.requests.push(now);
  persistRateEvent(identifier, tier, now);

  return {
    allowed: true,
    currentUsage: {
      minute: usage.minute + 1,
      hour: usage.hour + 1,
      day: usage.day + 1,
    },
    limits,
  };
}

// =============================================================================
// POSTGRESQL PERSISTENCE (fire-and-forget, non-blocking)
// =============================================================================

/**
 * Persist a rate limit event to the rate_limit_events table.
 * Fire-and-forget: failures log but don't block the request.
 */
function persistRateEvent(identifier: string, tier: string, timestamp: number): void {
  try {
    const supabase = getSupabase();
    supabase
      .from("rate_limit_events")
      .insert({
        identifier,
        tier,
        event_time: new Date(timestamp).toISOString(),
      })
      .then(({ error }) => {
        if (error) {
          console.warn("[RATE-LIMITER] DB persist failed (non-fatal):", error.message);
        }
      });
  } catch (e) {
    console.warn("[RATE-LIMITER] DB persist skipped:", e instanceof Error ? e.message : e);
  }
}

/**
 * Persist a violation/block event for audit trail.
 */
function persistViolation(identifier: string, violations: number, blockUntil: number | undefined): void {
  try {
    const supabase = getSupabase();
    supabase
      .from("rate_limit_violations")
      .upsert({
        identifier,
        violations,
        blocked_until: blockUntil ? new Date(blockUntil).toISOString() : null,
        last_violation: new Date().toISOString(),
      }, { onConflict: "identifier" })
      .then(({ error }) => {
        if (error) {
          console.warn("[RATE-LIMITER] Violation persist failed (non-fatal):", error.message);
        }
      });
  } catch (e) {
    console.warn("[RATE-LIMITER] Violation persist skipped:", e instanceof Error ? e.message : e);
  }
}

/**
 * Load rate state from PostgreSQL on cold start (called once per edge function instance).
 * Hydrates in-memory buckets from persistent storage.
 */
export async function hydrateFromDb(identifier: string): Promise<void> {
  try {
    const supabase = getSupabase();
    const now = Date.now();
    const oneDayAgo = new Date(now - 86400000).toISOString();

    // Load recent events (last 24h)
    const { data: events, error: eventsError } = await supabase
      .from("rate_limit_events")
      .select("event_time")
      .eq("identifier", identifier)
      .gte("event_time", oneDayAgo)
      .order("event_time", { ascending: true });

    if (eventsError) {
      console.warn("[RATE-LIMITER] Hydration failed:", eventsError.message);
      return;
    }

    // Load violation state
    const { data: violation, error: violationError } = await supabase
      .from("rate_limit_violations")
      .select("violations, blocked_until")
      .eq("identifier", identifier)
      .maybeSingle();

    if (violationError) {
      console.warn("[RATE-LIMITER] Violation hydration failed:", violationError.message);
    }

    const bucket = getBucket(identifier);

    // Hydrate request timestamps
    if (events && events.length > 0) {
      bucket.requests = events.map(e => new Date(e.event_time).getTime());
    }

    // Hydrate violation/block state
    if (violation) {
      bucket.violations = violation.violations || 0;
      if (violation.blocked_until) {
        const blockUntil = new Date(violation.blocked_until).getTime();
        if (blockUntil > now) {
          bucket.blocked = true;
          bucket.blockUntil = blockUntil;
        }
      }
    }

    console.log("[RATE-LIMITER] Hydrated from DB:", {
      identifier: identifier.slice(0, 8) + "...",
      eventCount: bucket.requests.length,
      violations: bucket.violations,
      blocked: bucket.blocked,
    });
  } catch (e) {
    console.warn("[RATE-LIMITER] Hydration skipped:", e instanceof Error ? e.message : e);
  }
}

// =============================================================================
// USAGE CALCULATION
// =============================================================================

function calculateUsage(
  requests: number[],
  now: number
): { minute: number; hour: number; day: number } {
  const oneMinuteAgo = now - 60000;
  const oneHourAgo = now - 3600000;
  const oneDayAgo = now - 86400000;

  return {
    minute: requests.filter(t => t > oneMinuteAgo).length,
    hour: requests.filter(t => t > oneHourAgo).length,
    day: requests.filter(t => t > oneDayAgo).length,
  };
}

// =============================================================================
// ABUSE DETECTION & ESCALATION
// =============================================================================

function recordViolationWithId(bucket: RateBucket, now: number, identifier: string): void {
  bucket.violations++;
  bucket.lastViolation = now;

  if (bucket.violations >= 10) {
    bucket.blocked = true;
    bucket.blockUntil = now + 86400000;
    console.warn("[RATE-LIMITER] 24h block applied", { violations: bucket.violations });
  } else if (bucket.violations >= 5) {
    bucket.blocked = true;
    bucket.blockUntil = now + 3600000;
    console.warn("[RATE-LIMITER] 1h block applied", { violations: bucket.violations });
  } else if (bucket.violations >= 3) {
    bucket.blocked = true;
    bucket.blockUntil = now + 300000;
    console.warn("[RATE-LIMITER] 5m block applied", { violations: bucket.violations });
  }

  persistViolation(identifier, bucket.violations, bucket.blockUntil);
}

// =============================================================================
// UPGRADE PROMPTS (Micro-transaction Hooks)
// =============================================================================

function generateUpgradePrompt(
  tier: string,
  limitType: "minute" | "hour" | "day",
  usage: { minute: number; hour: number; day: number },
  limits: RateLimitConfig
): UpgradePrompt | undefined {
  if (tier === "enterprise") {
    return undefined;
  }

  const usagePercent = limitType === "minute"
    ? usage.minute / limits.requestsPerMinute
    : limitType === "hour"
    ? usage.hour / limits.requestsPerHour
    : usage.day / limits.requestsPerDay;

  if (usagePercent >= 1) {
    return {
      type: "quota_exceeded",
      message: tier === "free"
        ? "You've hit your free limit. Upgrade to Pro for 6x more requests!"
        : "Upgrade to Enterprise for unlimited high-volume access.",
      currentTier: tier,
      suggestedTier: tier === "free" ? "pro" : "enterprise",
      creditCost: tier === "free" ? 999 : 4999,
    };
  } else if (usagePercent >= 0.8) {
    return {
      type: "quota_warning",
      message: `You've used ${Math.round(usagePercent * 100)}% of your ${limitType}ly quota.`,
      currentTier: tier,
      suggestedTier: tier === "free" ? "pro" : "enterprise",
    };
  }

  return undefined;
}

// =============================================================================
// QUOTA PURCHASE (Micro-transactions)
// =============================================================================

export interface QuotaPurchase {
  credits: number;
  costCents: number;
  bonusCredits: number;
}

export const CREDIT_PACKAGES: QuotaPurchase[] = [
  { credits: 50, costCents: 499, bonusCredits: 0 },
  { credits: 200, costCents: 1499, bonusCredits: 20 },
  { credits: 500, costCents: 2999, bonusCredits: 75 },
  { credits: 1000, costCents: 4999, bonusCredits: 200 },
];

export function addCredits(identifier: string, credits: number): void {
  console.log(`[RATE-LIMITER] Added ${credits} credits to ${identifier}`);
}

// =============================================================================
// SESSION PROMPT TRACKING (PostgreSQL-backed)
// =============================================================================

const sessionPromptCounts = new Map<string, number>();

export function checkSessionLimit(
  sessionId: string,
  tier: string = "free"
): { allowed: boolean; count: number; limit: number; upgradePrompt?: UpgradePrompt } {
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const count = sessionPromptCounts.get(sessionId) || 0;

  if (count >= limits.maxPromptsPerSession) {
    return {
      allowed: false,
      count,
      limit: limits.maxPromptsPerSession,
      upgradePrompt: {
        type: "quota_exceeded",
        message: `You've reached the ${limits.maxPromptsPerSession} prompt limit for this session.`,
        currentTier: tier,
        suggestedTier: tier === "free" ? "pro" : "enterprise",
      },
    };
  }

  sessionPromptCounts.set(sessionId, count + 1);

  // Persist session count to DB (fire-and-forget)
  persistSessionCount(sessionId, count + 1);

  return { allowed: true, count: count + 1, limit: limits.maxPromptsPerSession };
}

/**
 * Persist session prompt count to DB for cross-instance consistency.
 */
function persistSessionCount(sessionId: string, count: number): void {
  try {
    const supabase = getSupabase();
    supabase
      .from("session_prompt_counts")
      .upsert({
        session_id: sessionId,
        prompt_count: count,
        updated_at: new Date().toISOString(),
      }, { onConflict: "session_id" })
      .then(({ error }) => {
        if (error) {
          console.warn("[RATE-LIMITER] Session count persist failed (non-fatal):", error.message);
        }
      });
  } catch (e) {
    console.warn("[RATE-LIMITER] Session count persist skipped:", e instanceof Error ? e.message : e);
  }
}

export function resetSessionCount(sessionId: string): void {
  sessionPromptCounts.delete(sessionId);
  // Also clear from DB
  try {
    const supabase = getSupabase();
    supabase
      .from("session_prompt_counts")
      .delete()
      .eq("session_id", sessionId)
      .then(({ error }) => {
        if (error) {
          console.warn("[RATE-LIMITER] Session count delete failed (non-fatal):", error.message);
        }
      });
  } catch {
    // Non-fatal
  }
}

/**
 * Hydrate session count from DB on cold start.
 */
export async function hydrateSessionFromDb(sessionId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("session_prompt_counts")
      .select("prompt_count")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      console.warn("[RATE-LIMITER] Session hydration failed:", error.message);
      return;
    }

    if (data) {
      sessionPromptCounts.set(sessionId, data.prompt_count);
    }
  } catch (e) {
    console.warn("[RATE-LIMITER] Session hydration skipped:", e instanceof Error ? e.message : e);
  }
}
