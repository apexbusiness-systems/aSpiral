/**
 * RATE LIMITER - Multi-Tier Usage Control System
 * 
 * Features:
 * - Sliding window rate limiting
 * - Tiered quotas (free/pro/enterprise)
 * - Abuse detection & auto-escalation
 * - Micro-transaction hooks for quota expansion
 */

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
// IN-MEMORY RATE TRACKING (Production: Use Redis/Upstash)
// =============================================================================

interface RateBucket {
  requests: number[];
  violations: number;
  lastViolation?: number;
  blocked: boolean;
  blockUntil?: number;
}

// Simple in-memory store (replace with Redis in production for multi-instance)
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

// Cleanup old entries periodically
function cleanupBucket(bucket: RateBucket, now: number): void {
  const oneHourAgo = now - 3600000;
  bucket.requests = bucket.requests.filter(t => t > oneHourAgo);
}

// =============================================================================
// RATE LIMIT CHECK
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
    recordViolation(bucket, now);
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
    recordViolation(bucket, now);
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

  // All checks passed - record request
  bucket.requests.push(now);

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

function recordViolation(bucket: RateBucket, now: number): void {
  bucket.violations++;
  bucket.lastViolation = now;

  // Escalating blocks based on violation count
  if (bucket.violations >= 10) {
    // 10+ violations: 24 hour block
    bucket.blocked = true;
    bucket.blockUntil = now + 86400000;
    console.warn("[RATE-LIMITER] 🚨 24h block applied", { violations: bucket.violations });
  } else if (bucket.violations >= 5) {
    // 5-9 violations: 1 hour block
    bucket.blocked = true;
    bucket.blockUntil = now + 3600000;
    console.warn("[RATE-LIMITER] ⚠️ 1h block applied", { violations: bucket.violations });
  } else if (bucket.violations >= 3) {
    // 3-4 violations: 5 minute block
    bucket.blocked = true;
    bucket.blockUntil = now + 300000;
    console.warn("[RATE-LIMITER] ⏳ 5m block applied", { violations: bucket.violations });
  }
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
    return undefined; // Top tier, no upgrades available
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
      creditCost: tier === "free" ? 999 : 4999, // cents
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
  // In production: Update user's credit balance in database
  console.log(`[RATE-LIMITER] 💰 Added ${credits} credits to ${identifier}`);
}

// =============================================================================
// SESSION PROMPT TRACKING
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
  return { allowed: true, count: count + 1, limit: limits.maxPromptsPerSession };
}

export function resetSessionCount(sessionId: string): void {
  sessionPromptCounts.delete(sessionId);
}
