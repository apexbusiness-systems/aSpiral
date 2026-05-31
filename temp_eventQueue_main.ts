/**
 * Event Queue for OMNiLiNK
 * 
 * Queues events when circuit is open, replays when recovered
 */

import type { OmniLinkEvent } from "./types";
import { createLogger } from "@/lib/logger";

const logger = createLogger("OmniLinkEventQueue");

const MAX_QUEUE_SIZE = 100;
const QUEUE_STORAGE_KEY = "omnilink_event_queue";

interface QueuedEvent {
  event: OmniLinkEvent;
  queuedAt: number;
  attempts: number;
}

class EventQueue {
  private queue: QueuedEvent[] = [];
  private processing = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        logger.info(`Loaded ${this.queue.length} queued events from storage`);
      }
    } catch {
      logger.warn("Failed to load queued events from storage");
      this.queue = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      logger.warn("Failed to save queued events to storage");
    }
  }

  enqueue(event: OmniLinkEvent): void {
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

    this.saveToStorage();
    logger.info("Event queued", { eventId: event.id, queueSize: this.queue.length });
  }

  dequeue(): QueuedEvent | undefined {
    const item = this.queue.shift();
    this.saveToStorage();
    return item;
  }

  peek(): QueuedEvent | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  clear(): void {
    this.queue = [];
    this.saveToStorage();
  }

  incrementAttempts(idempotencyKey: string): void {
    const item = this.queue.find(
      (q) => q.event.metadata.idempotencyKey === idempotencyKey
    );
    if (item) {
      item.attempts++;
      this.saveToStorage();
    }
  }

  remove(idempotencyKey: string): void {
    this.queue = this.queue.filter(
      (q) => q.event.metadata.idempotencyKey !== idempotencyKey
    );
    this.saveToStorage();
  }

  setProcessing(processing: boolean): void {
    this.processing = processing;
  }

  isProcessing(): boolean {
    return this.processing;
  }
}

// Singleton instance
export const omniLinkEventQueue = new EventQueue();
