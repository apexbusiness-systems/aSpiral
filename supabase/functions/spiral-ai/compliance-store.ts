/**
 * COMPLIANCE STORE - Durable Persistence Layer for Compliance Logging
 * 
 * Features:
 * - Idempotent upserts using (request_id, event_id) constraint
 * - Batch event buffering with flush
 * - Run lifecycle tracking (STARTED -> SUCCESS/BLOCKED/ERROR)
 * - Never throws to caller - failures logged but isolated
 * - Time-boxed operations to prevent handler DOS
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// TYPES
// =============================================================================

export interface ComplianceEventRecord {
  request_id: string;
  event_id: string;
  event_type: string;
  event_ts: string;
  jurisdiction: string;
  applicable_regulations: string[];
  session_hash: string;
  processing_time_ms: number;
  payload: Record<string, unknown>;
}

export interface ComplianceRunRecord {
  request_id: string;
  jurisdiction: string;
  status: "STARTED" | "SUCCESS" | "BLOCKED" | "ERROR";
  total_events?: number;
  blocked?: boolean;
  escalated?: boolean;
  total_time_ms?: number;
  session_hash: string;
  user_hash?: string;
  user_tier?: string;
  error_code?: string;
  error_message?: string;
  completed_at?: string | null;
}

export interface ComplianceLogWriter {
  setContext(ctx: { sessionHash: string; userHash?: string; userTier?: string }): void;
  writeEvent(event: ComplianceEventRecord): Promise<void>;
  writeRunStart(run: ComplianceRunRecord): Promise<void>;
  writeRunSummary(run: ComplianceRunRecord): Promise<void>;
  flush?(maxWaitMs?: number): Promise<void>;
}

// =============================================================================
// COMPLIANCE STORE WRITER
// =============================================================================

export class ComplianceStoreWriter implements ComplianceLogWriter {
  private client: SupabaseClient | null = null;
  private pendingEvents: ComplianceEventRecord[] = [];
  private pendingPromises: Promise<unknown>[] = [];
  private context: { sessionHash: string; userHash?: string; userTier?: string } = {
    sessionHash: "unknown",
  };

  constructor() {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (url && key) {
      this.client = createClient(url, key, {
        auth: { persistSession: false },
      });
    }
  }

  /**
   * Check if writer is configured and available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Set context for all subsequent operations
   */
  setContext(ctx: { sessionHash: string; userHash?: string; userTier?: string }): void {
    this.context = { ...this.context, ...ctx };
  }

  /**
   * Write a single event (buffered for batch insert)
   */
  async writeEvent(event: ComplianceEventRecord): Promise<void> {
    if (!this.client) {
      console.log("[COMPLIANCE-STORE] Writer not available, skipping event write");
      return;
    }

    this.pendingEvents.push({
      ...event,
      session_hash: event.session_hash || this.context.sessionHash,
    });

    // Batch after 10 events
    if (this.pendingEvents.length >= 10) {
      await this.flushEvents();
    }
  }

  /**
   * Write run start record (STARTED status)
   * Should be called early, before any LLM/network operations
   */
  async writeRunStart(run: ComplianceRunRecord): Promise<void> {
    this.upsertRun({
      request_id: run.request_id,
      jurisdiction: run.jurisdiction,
      status: "STARTED" as const,
      total_events: 0,
      blocked: false,
      escalated: false,
      total_time_ms: 0,
      session_hash: run.session_hash || this.context.sessionHash,
      user_hash: run.user_hash || this.context.userHash,
      user_tier: run.user_tier || this.context.userTier,
      completed_at: null,
    }, "run start");
  }

  /**
   * Write run summary (final status: SUCCESS/BLOCKED/ERROR)
   * Updates existing STARTED record with final state
   */
  async writeRunSummary(run: ComplianceRunRecord): Promise<void> {
    // First flush any pending events
    await this.flushEvents();

    this.upsertRun({
      request_id: run.request_id,
      jurisdiction: run.jurisdiction,
      status: run.status,
      total_events: run.total_events ?? this.pendingEvents.length,
      blocked: run.blocked ?? false,
      escalated: run.escalated ?? false,
      total_time_ms: run.total_time_ms ?? 0,
      session_hash: run.session_hash || this.context.sessionHash,
      user_hash: run.user_hash || this.context.userHash,
      user_tier: run.user_tier || this.context.userTier,
      error_code: run.error_code,
      error_message: run.error_message,
      completed_at: run.completed_at ?? new Date().toISOString(),
    }, "run summary");
  }

  /**
   * Shared upsert logic for compliance run records
   */
  private upsertRun(record: Record<string, unknown>, label: string): void {
    if (!this.client) {
      console.log(`[COMPLIANCE-STORE] Writer not available, skipping ${label}`);
      return;
    }

    try {
      const promise = Promise.resolve(
        this.client
          .from("compliance_request_runs")
          .upsert(record, { onConflict: "request_id" })
      )
        .then(({ error }) => {
          if (error) {
            console.error(`[COMPLIANCE-STORE] Failed to write ${label}:`, error.message);
          }
        })
        .catch((err) => {
          console.error(`[COMPLIANCE-STORE] ${label} write error:`, err);
        });

      this.pendingPromises.push(promise);
    } catch (err) {
      console.error(`[COMPLIANCE-STORE] Unexpected error in ${label}:`, err);
    }
  }

  /**
   * Flush all pending events to the database
   */
  private async flushEvents(): Promise<void> {
    if (!this.client || this.pendingEvents.length === 0) {
      return;
    }

    const eventsToFlush = [...this.pendingEvents];
    this.pendingEvents = [];

    try {
      const promise = Promise.resolve(
        this.client
          .from("compliance_audit_events")
          .upsert(eventsToFlush, { onConflict: "request_id,event_id" })
      )
        .then(({ error }) => {
          if (error) {
            console.error("[COMPLIANCE-STORE] Failed to flush events:", error.message);
          }
        })
        .catch((err) => {
          console.error("[COMPLIANCE-STORE] Event flush error:", err);
        });

      this.pendingPromises.push(promise);
    } catch (err) {
      console.error("[COMPLIANCE-STORE] Unexpected error in flushEvents:", err);
    }
  }

  /**
   * Wait for all pending operations with timeout
   * Uses Promise.race to time-box the wait
   */
  async flush(maxWaitMs: number = 500): Promise<void> {
    // Flush any remaining buffered events
    await this.flushEvents();

    if (this.pendingPromises.length === 0) {
      return;
    }

    const promises = [...this.pendingPromises];
    this.pendingPromises = [];

    try {
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.log(`[COMPLIANCE-STORE] Flush timed out after ${maxWaitMs}ms`);
          resolve();
        }, maxWaitMs);
      });

      await Promise.race([
        Promise.allSettled(promises),
        timeoutPromise,
      ]);
    } catch (err) {
      console.error("[COMPLIANCE-STORE] Flush error:", err);
    }
  }
}

// =============================================================================
// NOOP WRITER (for when env is not configured)
// =============================================================================

export class NoopComplianceWriter implements ComplianceLogWriter {
  setContext(_ctx: { sessionHash: string; userHash?: string; userTier?: string }): void {
    // No-op
  }

  async writeEvent(_event: ComplianceEventRecord): Promise<void> {
    // No-op
  }

  async writeRunStart(_run: ComplianceRunRecord): Promise<void> {
    // No-op
  }

  async writeRunSummary(_run: ComplianceRunRecord): Promise<void> {
    // No-op
  }

  async flush(_maxWaitMs?: number): Promise<void> {
    // No-op
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create appropriate writer based on environment
 */
export function createComplianceWriter(): ComplianceLogWriter {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (url && key) {
    console.log("[COMPLIANCE-STORE] Durable writer enabled");
    return new ComplianceStoreWriter();
  }

  console.log("[COMPLIANCE-STORE] Using noop writer (env not configured)");
  return new NoopComplianceWriter();
}
