/**
 * OMNiLiNK Adapter
 * 
 * Main interface for publishing events to the APEX integration hub
 * Implements idempotency, circuit breaker, and event queuing
 */

import type {
  OmniLinkEvent,
  OmniLinkEventType,
  OmniLinkHealthStatus,
  SessionStartedPayload,
  SessionEndedPayload,
  PatternDetectedPayload,
  BreakthroughPayload,
} from "./types";
import { getOmniLinkConfig, isOmniLinkEnabled } from "./config";
import { omniLinkCircuitBreaker } from "./circuitBreaker";
import { omniLinkEventQueue } from "./eventQueue";
import { createLogger } from "@/lib/logger";
import { generateIdempotencyKey } from "@/lib/idempotent";
import { retryWithBackoff } from "@/lib/retry";

const logger = createLogger("OmniLinkAdapter");
const VERSION = "1.0.0";

// Track published events locally for idempotency
const publishedEvents = new Set<string>();

function createEvent<T>(
  type: OmniLinkEventType,
  payload: T,
  correlationId?: string
): OmniLinkEvent<T> {
  const config = getOmniLinkConfig();
  const idempotencyKey = generateIdempotencyKey(type, JSON.stringify(payload));

  return {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    tenantId: config.tenantId,
    source: "aspiral",
    correlationId,
    payload,
    metadata: {
      version: VERSION,
      idempotencyKey,
    },
  };
}

async function publishToHub<T>(event: OmniLinkEvent<T>): Promise<boolean> {
  const config = getOmniLinkConfig();

  // Check idempotency
  if (publishedEvents.has(event.metadata.idempotencyKey)) {
    logger.debug("Event already published, skipping", {
      idempotencyKey: event.metadata.idempotencyKey,
    });
    return true;
  }

  // Check circuit breaker
  if (!omniLinkCircuitBreaker.canExecute()) {
    logger.warn("Circuit breaker OPEN, queueing event");
    omniLinkEventQueue.enqueue(event);
    return false;
  }

  try {
    const response = await retryWithBackoff(
      async () => {
        const res = await fetch(`${config.baseUrl}/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-Id": config.tenantId,
            "X-API-Key": config.apiKey,
            "X-Idempotency-Key": event.metadata.idempotencyKey,
          },
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(config.timeout || 5000),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res;
      },
      {
        maxAttempts: config.retryAttempts || 3,
        baseDelay: 1000,
        maxDelay: 5000,
        shouldRetry: (error: unknown) => {
          // Retry on network errors or 5xx
          const err = error as Error;
          return (
            err.name === "TypeError" || // Network error
            err.message?.includes("5")
          );
        },
      }
    );

    omniLinkCircuitBreaker.recordSuccess();
    publishedEvents.add(event.metadata.idempotencyKey);

    logger.info("Event published successfully", {
      eventId: event.id,
      type: event.type,
    });

    return true;
  } catch (error) {
    omniLinkCircuitBreaker.recordFailure();
    omniLinkEventQueue.enqueue(event);

    logger.error("Failed to publish event", error as Error, {
      eventId: event.id,
      type: event.type,
    });

    return false;
  }
}

// Process queued events in background
async function processQueue(): Promise<void> {
  if (!isOmniLinkEnabled() || omniLinkEventQueue.isProcessing()) {
    return;
  }

  if (!omniLinkCircuitBreaker.canExecute()) {
    return;
  }

  omniLinkEventQueue.setProcessing(true);

  try {
    while (!omniLinkEventQueue.isEmpty()) {
      const queued = omniLinkEventQueue.peek();
      if (!queued) break;

      // Skip if too many attempts
      if (queued.attempts >= 5) {
        logger.warn("Dropping event after max attempts", {
          eventId: queued.event.id,
        });
        omniLinkEventQueue.dequeue();
        continue;
      }

      const success = await publishToHub(queued.event);
      if (success) {
        omniLinkEventQueue.dequeue();
      } else {
        omniLinkEventQueue.incrementAttempts(queued.event.metadata.idempotencyKey);
        break; // Stop if publish fails
      }
    }
  } finally {
    omniLinkEventQueue.setProcessing(false);
  }
}

// Start background queue processing
if (typeof window !== "undefined") {
  omniLinkEventQueue.initialize();
  setInterval(() => {
    processQueue().catch(console.error);
  }, 30000); // Every 30 seconds
}

/**
 * OMNiLiNK Adapter - Public API
 */
export const OmniLinkAdapter = {
  /**
   * Check if OMNiLiNK is enabled
   */
  isEnabled(): boolean {
    return isOmniLinkEnabled();
  },

  /**
   * Get health status
   */
  getHealthStatus(): OmniLinkHealthStatus {
    if (!isOmniLinkEnabled()) {
      return {
        status: "disabled",
        message: "OMNiLiNK integration is disabled (OK)",
      };
    }

    const state = omniLinkCircuitBreaker.getState();

    if (state === "OPEN") {
      return {
        status: "error",
        message: "OMNiLiNK circuit breaker is OPEN",
        circuitBreakerState: state,
        queuedEvents: omniLinkEventQueue.size(),
      };
    }

    return {
      status: "ok",
      message: "OMNiLiNK integration operational",
      circuitBreakerState: state,
      queuedEvents: omniLinkEventQueue.size(),
    };
  },

  /**
   * Publish session started event
   */
  async publishSessionStarted(
    sessionId: string,
    userId: string
  ): Promise<boolean> {
    if (!isOmniLinkEnabled()) return true;

    const event = createEvent<SessionStartedPayload>(
      "aspiral:session.started",
      { sessionId, userId },
      sessionId
    );

    return publishToHub(event);
  },

  /**
   * Publish session ended event
   */
  async publishSessionEnded(payload: SessionEndedPayload): Promise<boolean> {
    if (!isOmniLinkEnabled()) return true;

    const event = createEvent<SessionEndedPayload>(
      "aspiral:session.ended",
      payload,
      payload.sessionId
    );

    return publishToHub(event);
  },

  /**
   * Publish pattern detected event
   */
  async publishPatternDetected(payload: PatternDetectedPayload): Promise<boolean> {
    if (!isOmniLinkEnabled()) return true;

    const event = createEvent<PatternDetectedPayload>(
      "aspiral:pattern.detected",
      payload,
      payload.sessionId
    );

    return publishToHub(event);
  },

  /**
   * Publish breakthrough achieved event
   */
  async publishBreakthrough(payload: BreakthroughPayload): Promise<boolean> {
    if (!isOmniLinkEnabled()) return true;

    const event = createEvent<BreakthroughPayload>(
      "aspiral:breakthrough.achieved",
      payload,
      payload.sessionId
    );

    return publishToHub(event);
  },

  /**
   * Force process queued events
   */
  async flushQueue(): Promise<void> {
    return processQueue();
  },

  /**
   * Reset circuit breaker (for testing/admin)
   */
  resetCircuitBreaker(): void {
    omniLinkCircuitBreaker.reset();
  },
};
