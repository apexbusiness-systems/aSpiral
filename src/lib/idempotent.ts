/**
 * aSpiral Idempotency Utilities
 * Prevent duplicate operations
 */

import { createLogger } from "./logger";

const logger = createLogger("Idempotent");

// In-memory cache for in-flight requests
const inFlightRequests = new Map<string, Promise<unknown>>();

// Cache for completed requests (limited size)
const completedRequests = new Map<
  string,
  { response: unknown; timestamp: number }
>();
const MAX_CACHE_SIZE = 100;
const CACHE_TTL = 60000; // 1 minute

/**
 * Generate idempotency key from request parameters
 */
export function generateIdempotencyKey(
  operation: string,
  ...params: unknown[]
): string {
  const paramString = JSON.stringify(params);
  return `${operation}-${hashString(paramString)}-${new Date().toDateString()}`;
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Execute operation with idempotency
 */
export async function idempotentExecute<T>(
  key: string,
  operation: () => Promise<T>
): Promise<T> {
  // Check if request is already in flight
  const inFlight = inFlightRequests.get(key);
  if (inFlight) {
    logger.debug("Returning in-flight request", { key });
    return inFlight as Promise<T>;
  }

  // Check completed cache
  const cached = completedRequests.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug("Returning cached response", { key });
    return cached.response as T;
  }

  // Execute operation
  const promise = operation();
  inFlightRequests.set(key, promise);

  try {
    const result = await promise;

    // Cache result
    completedRequests.set(key, { response: result, timestamp: Date.now() });

    // Cleanup old cache entries
    if (completedRequests.size > MAX_CACHE_SIZE) {
      const oldestKey = completedRequests.keys().next().value;
      if (oldestKey) completedRequests.delete(oldestKey);
    }

    return result;
  } finally {
    inFlightRequests.delete(key);
  }
}

/**
 * Debounce function for UI actions
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    }
  };
}
