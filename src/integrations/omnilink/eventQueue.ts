/**
 * Event Queue for OMNiLiNK
 * 
 * Queues events when circuit is open, replays when recovered
 */

import type { OmniLinkEvent } from "./types";
import { createLogger } from "@/lib/logger";
import { encrypt, decrypt } from "@/lib/crypto";
import { getEncryptionSecret } from "@/lib/secureStorage";

const logger = createLogger("OmniLinkEventQueue");

const MAX_QUEUE_SIZE = 100;
const QUEUE_STORAGE_KEY = "omnilink_event_queue";

interface QueuedEvent {
  event: OmniLinkEvent;
  queuedAt: number;
  attempts: number;
}

export class EventQueue {
  private queue: QueuedEvent[] = [];
  private processing = false;
  private initialized: Promise<void>;
  private secretOverride?: string;

  constructor(secretOverride?: string) {
    this.secretOverride = secretOverride;
    this.initialized = this.loadFromStorage();
  }

  private async getSecret(): Promise<string> {
    if (this.secretOverride) return this.secretOverride;
    return getEncryptionSecret();
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        // Try to decrypt first (new format)
        try {
          const secret = await this.getSecret();
          const decrypted = await decrypt(stored, secret);
          this.queue = JSON.parse(decrypted);
          logger.info(`Loaded ${this.queue.length} queued events from encrypted storage`);
        } catch (decryptError) {
          // Fallback to plaintext (old format / migration)
          try {
            // Check if it looks like JSON before parsing
            if (stored.trim().startsWith('[') || stored.trim().startsWith('{')) {
              this.queue = JSON.parse(stored);
              logger.info(`Migrating ${this.queue.length} plaintext events to encrypted storage`);
              await this.saveToStorage(); // Upgrade to encrypted format
            } else {
              throw new Error("Not a valid JSON format");
            }
          } catch (parseError) {
            logger.error("Failed to parse queued events from storage, likely encrypted with different key or corrupted", parseError as Error);
            this.queue = [];
          }
        }
      }
    } catch (error) {
      logger.warn("Failed to load queued events from storage", { error });
      this.queue = [];
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const serialized = JSON.stringify(this.queue);
      const secret = await this.getSecret();
      const encrypted = await encrypt(serialized, secret);
      localStorage.setItem(QUEUE_STORAGE_KEY, encrypted);
    } catch (error) {
      // FAIL-SAFE: If encryption fails, we don't save to localStorage to avoid leaking plaintext
      logger.error("Failed to save queued events to storage due to encryption failure", error as Error);
    }
  }

  async enqueue(event: OmniLinkEvent): Promise<void> {
    await this.initialized;

    // Prevent duplicate events (idempotency)
    const exists = this.queue.some(
      (q) => q.event.metadata.idempotencyKey === event.metadata.idempotencyKey
    );

    if (exists) {
      logger.debug("Event already queued, skipping", {
        idempotencyKey: event.metadata.idempotencyKey,
      });
      return;
    }

    // Limit queue size (drop oldest)
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      const dropped = this.queue.shift();
      logger.warn("Queue full, dropping oldest event", {
        droppedEventId: dropped?.event.id,
      });
    }

    this.queue.push({
      event,
      queuedAt: Date.now(),
      attempts: 0,
    });

    await this.saveToStorage();
    logger.info("Event queued", { eventId: event.id, queueSize: this.queue.length });
  }

  async dequeue(): Promise<QueuedEvent | undefined> {
    await this.initialized;
    const item = this.queue.shift();
    await this.saveToStorage();
    return item;
  }

  async peek(): Promise<QueuedEvent | undefined> {
    await this.initialized;
    return this.queue[0];
  }

  size(): number {
    // Synchronous size check based on current in-memory state
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  async clear(): Promise<void> {
    await this.initialized;
    this.queue = [];
    await this.saveToStorage();
  }

  async incrementAttempts(idempotencyKey: string): Promise<void> {
    await this.initialized;
    const item = this.queue.find(
      (q) => q.event.metadata.idempotencyKey === idempotencyKey
    );
    if (item) {
      item.attempts++;
      await this.saveToStorage();
    }
  }

  async remove(idempotencyKey: string): Promise<void> {
    await this.initialized;
    this.queue = this.queue.filter(
      (q) => q.event.metadata.idempotencyKey !== idempotencyKey
    );
    await this.saveToStorage();
  }

  setProcessing(processing: boolean): void {
    this.processing = processing;
  }

  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * For testing purposes
   */
  async waitReady(): Promise<void> {
    await this.initialized;
  }
}

// Singleton instance
export const omniLinkEventQueue = new EventQueue();
