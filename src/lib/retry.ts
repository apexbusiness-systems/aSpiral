import { secureMathRandom } from '@/lib/secureMathRandom';
/**
 * aSpiral Retry Utilities
 * Exponential backoff with jitter
 */

import { createLogger } from "./logger";
import { isRetriableError } from "./errors";

const logger = createLogger("Retry");

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: isRetriableError,
};

/**
 * Sleep for specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retriable
      if (!finalConfig.shouldRetry?.(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts - 1) {
        break;
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = finalConfig.baseDelay * Math.pow(2, attempt);
      const jitter = secureMathRandom() * 1000;
      const delay = Math.min(exponentialDelay + jitter, finalConfig.maxDelay);

      logger.warn(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms`, {
        attempt: attempt + 1,
        maxAttempts: finalConfig.maxAttempts,
        delay,
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Circuit breaker pattern
 */
export class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error("Circuit breaker is OPEN");
      }
      this.state = "HALF_OPEN";
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = "CLOSED";
        this.successCount = 0;
        logger.info("Circuit breaker CLOSED");
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
      logger.error(`Circuit breaker OPENED after ${this.failureCount} failures`);
    }
  }

  getState() {
    return this.state;
  }
}
