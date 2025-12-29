/**
 * Breakthrough Director
 * Lifecycle orchestrator with prewarm, cleanup, safety guards, and safe-mode fallback
 */

import type {
  MutatedVariant,
  DirectorPhase,
  DirectorState,
  QualityTier,
  BreakthroughAnalyticsEvent,
} from './types';
import { isBreakthroughV2Enabled } from './types';
import { selectVariant, selectFallbackVariant, buildSelectionContext } from './selector';
import { recordBreakthrough } from './history';
import { createLogger } from '@/lib/logger';
import { analytics } from '@/lib/analytics';

const logger = createLogger('BreakthroughDirector');

// ============================================================================
// CONFIGURATION
// ============================================================================

/** FPS threshold for triggering safe mode */
const FPS_THRESHOLD = 30;

/** Duration in ms to check for FPS drop */
const FPS_CHECK_DURATION = 500;

/** Maximum breakthrough duration before forcing completion */
const MAX_DURATION_MS = 15000;

/** Prewarm timeout */
const PREWARM_TIMEOUT_MS = 2000;

/** Settle duration after main animation */
const SETTLE_DURATION_MS = 300;

// ============================================================================
// DIRECTOR CLASS
// ============================================================================

export class BreakthroughDirector {
  private state: DirectorState = {
    phase: 'idle',
    currentVariant: null,
    startTime: null,
    error: null,
    fpsHistory: [],
    isSafeMode: false,
  };
  
  private abortController: AbortController | null = null;
  private fpsCheckInterval: ReturnType<typeof setInterval> | null = null;
  private maxDurationTimeout: ReturnType<typeof setTimeout> | null = null;
  private settleTimeout: ReturnType<typeof setTimeout> | null = null;
  
  private onCompleteCallback: (() => void) | null = null;
  private onAbortCallback: ((reason: string) => void) | null = null;
  private onPhaseChangeCallback: ((phase: DirectorPhase) => void) | null = null;
  
  // Pre-warmed resources
  private prewarmedResources: {
    variant: MutatedVariant | null;
    ready: boolean;
  } = {
    variant: null,
    ready: false,
  };
  
  // =========================================================================
  // PUBLIC API
  // =========================================================================
  
  /**
   * Get current state
   */
  getState(): Readonly<DirectorState> {
    return { ...this.state };
  }
  
  /**
   * Set callbacks
   */
  setCallbacks(options: {
    onComplete?: () => void;
    onAbort?: (reason: string) => void;
    onPhaseChange?: (phase: DirectorPhase) => void;
  }): void {
    this.onCompleteCallback = options.onComplete || null;
    this.onAbortCallback = options.onAbort || null;
    this.onPhaseChangeCallback = options.onPhaseChange || null;
  }
  
  /**
   * Prewarm resources for upcoming breakthrough
   */
  async prewarm(
    sessionEntities: Array<{ type: string; label: string; metadata?: { valence?: number } }>,
    breakthroughType?: string,
    qualityTier: QualityTier = 'mid',
    reducedMotion = false
  ): Promise<MutatedVariant> {
    // Check if V2 is enabled
    if (!isBreakthroughV2Enabled()) {
      logger.info('Breakthrough V2 disabled, using legacy');
      // Return a minimal fallback
      return selectFallbackVariant(qualityTier);
    }
    
    this.setPhase('prewarming');
    
    try {
      // Build selection context
      const context = buildSelectionContext(
        sessionEntities,
        breakthroughType,
        qualityTier,
        reducedMotion
      );
      
      // Select variant
      const { variant } = selectVariant(context);
      
      // Store prewarmed variant
      this.prewarmedResources = {
        variant,
        ready: true,
      };
      
      logger.info('Prewarm complete', { variantId: variant.id });
      this.setPhase('ready');
      
      return variant;
    } catch (err) {
      logger.error('Prewarm failed', { error: String(err) });
      this.prewarmedResources = {
        variant: selectFallbackVariant(qualityTier),
        ready: true,
      };
      this.setPhase('ready');
      return this.prewarmedResources.variant!;
    }
  }
  
  /**
   * Play the breakthrough (idempotent - cancels prior instance)
   */
  async play(
    variant?: MutatedVariant,
    qualityTier: QualityTier = 'mid'
  ): Promise<void> {
    // Cancel any existing playback (idempotent)
    if (this.state.phase === 'playing') {
      logger.info('Canceling existing playback');
      this.abort('new_play_requested');
      await this.waitForCleanup();
    }
    
    // Use provided variant or prewarmed variant
    const selectedVariant = variant || this.prewarmedResources.variant;
    
    if (!selectedVariant) {
      logger.warn('No variant available, using fallback');
      this.state.currentVariant = selectFallbackVariant(qualityTier);
      this.state.isSafeMode = true;
    } else {
      this.state.currentVariant = selectedVariant;
    }
    
    // Reset state
    this.abortController = new AbortController();
    this.state.startTime = performance.now();
    this.state.fpsHistory = [];
    this.state.error = null;
    
    this.setPhase('playing');
    
    // Track analytics
    this.trackEvent('started');
    
    // Start FPS monitoring
    this.startFPSMonitoring(qualityTier);
    
    // Start max duration timeout
    this.startMaxDurationTimeout();
  }
  
  /**
   * Report FPS from render loop
   */
  reportFPS(fps: number): void {
    if (this.state.phase !== 'playing') return;
    
    this.state.fpsHistory.push(fps);
    
    // Keep only last 60 frames (1 second at 60fps)
    if (this.state.fpsHistory.length > 60) {
      this.state.fpsHistory.shift();
    }
  }
  
  /**
   * Signal that the effect has naturally completed
   */
  complete(): void {
    if (this.state.phase !== 'playing') {
      logger.warn('complete() called but not playing');
      return;
    }
    
    this.setPhase('settling');
    
    // Brief settle period
    this.settleTimeout = setTimeout(() => {
      this.finalize(true);
    }, SETTLE_DURATION_MS);
  }
  
  /**
   * Abort the current breakthrough
   */
  abort(reason: string = 'user_abort'): void {
    if (this.state.phase === 'idle' || this.state.phase === 'cleanup') {
      return;
    }
    
    logger.info('Breakthrough aborted', { reason });
    
    // Cancel via abort controller
    this.abortController?.abort();
    
    // Track analytics
    this.trackEvent('aborted');
    
    // Finalize with failure
    this.finalize(false, reason);
  }
  
  /**
   * Trigger safe mode fallback
   */
  triggerSafeMode(): void {
    if (this.state.isSafeMode || this.state.phase !== 'playing') {
      return;
    }
    
    logger.warn('Triggering safe mode');
    
    this.state.isSafeMode = true;
    this.trackEvent('fallback');
    
    // Note: The component should check director.isSafeMode() and switch to fallback rendering
  }
  
  /**
   * Check if in safe mode
   */
  isSafeMode(): boolean {
    return this.state.isSafeMode;
  }
  
  /**
   * Get current variant
   */
  getCurrentVariant(): MutatedVariant | null {
    return this.state.currentVariant;
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.cleanup();
    this.onCompleteCallback = null;
    this.onAbortCallback = null;
    this.onPhaseChangeCallback = null;
    this.prewarmedResources = { variant: null, ready: false };
  }
  
  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================
  
  private setPhase(phase: DirectorPhase): void {
    this.state.phase = phase;
    this.onPhaseChangeCallback?.(phase);
  }
  
  private startFPSMonitoring(qualityTier: QualityTier): void {
    // Check FPS periodically
    this.fpsCheckInterval = setInterval(() => {
      if (this.state.phase !== 'playing') {
        this.stopFPSMonitoring();
        return;
      }
      
      // Calculate average FPS from recent history
      if (this.state.fpsHistory.length >= 30) {
        const recentFps = this.state.fpsHistory.slice(-30);
        const avgFps = recentFps.reduce((a, b) => a + b, 0) / recentFps.length;
        
        if (avgFps < FPS_THRESHOLD) {
          logger.warn('FPS below threshold', { avgFps, threshold: FPS_THRESHOLD });
          this.trackEvent('fps_dip');
          this.triggerSafeMode();
        }
      }
    }, FPS_CHECK_DURATION);
  }
  
  private stopFPSMonitoring(): void {
    if (this.fpsCheckInterval) {
      clearInterval(this.fpsCheckInterval);
      this.fpsCheckInterval = null;
    }
  }
  
  private startMaxDurationTimeout(): void {
    this.maxDurationTimeout = setTimeout(() => {
      if (this.state.phase === 'playing') {
        logger.warn('Max duration reached, forcing completion');
        this.complete();
      }
    }, MAX_DURATION_MS);
  }
  
  private finalize(completed: boolean, reason?: string): void {
    this.setPhase('cleanup');
    
    // Stop monitoring
    this.stopFPSMonitoring();
    
    // Clear timeouts
    if (this.maxDurationTimeout) {
      clearTimeout(this.maxDurationTimeout);
      this.maxDurationTimeout = null;
    }
    if (this.settleTimeout) {
      clearTimeout(this.settleTimeout);
      this.settleTimeout = null;
    }
    
    // Record to history
    if (this.state.currentVariant) {
      recordBreakthrough(
        this.state.currentVariant.id,
        this.state.currentVariant.seed,
        this.state.currentVariant.intensity,
        this.state.currentVariant.mutation.cameraArchetype === 'drift' ? 'low' : 'mid',
        completed,
        this.state.isSafeMode
      );
    }
    
    // Track completion analytics
    if (completed) {
      this.trackEvent('completed');
    }
    
    // Call appropriate callback
    if (completed) {
      this.onCompleteCallback?.();
    } else {
      this.onAbortCallback?.(reason || 'unknown');
    }
    
    // Cleanup
    this.cleanup();
  }
  
  private cleanup(): void {
    this.stopFPSMonitoring();
    
    if (this.maxDurationTimeout) {
      clearTimeout(this.maxDurationTimeout);
      this.maxDurationTimeout = null;
    }
    if (this.settleTimeout) {
      clearTimeout(this.settleTimeout);
      this.settleTimeout = null;
    }
    
    // Reset state
    this.state = {
      phase: 'idle',
      currentVariant: null,
      startTime: null,
      error: null,
      fpsHistory: [],
      isSafeMode: false,
    };
    
    this.abortController = null;
    this.prewarmedResources = { variant: null, ready: false };
  }
  
  private async waitForCleanup(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.state.phase === 'idle') {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }
  
  private trackEvent(
    eventType: BreakthroughAnalyticsEvent['eventType']
  ): void {
    if (!this.state.currentVariant) return;
    
    const duration = this.state.startTime
      ? performance.now() - this.state.startTime
      : undefined;
    
    const avgFps = this.state.fpsHistory.length > 0
      ? this.state.fpsHistory.reduce((a, b) => a + b, 0) / this.state.fpsHistory.length
      : undefined;
    
    const minFps = this.state.fpsHistory.length > 0
      ? Math.min(...this.state.fpsHistory)
      : undefined;
    
    const event: BreakthroughAnalyticsEvent = {
      eventType,
      variantId: this.state.currentVariant.id,
      seed: this.state.currentVariant.seed,
      intensityBand: this.state.currentVariant.intensity,
      qualityTier: 'mid', // Could be passed in
      duration,
      avgFps,
      minFps,
      error: this.state.error || undefined,
      timestamp: Date.now(),
    };
    
    // Log locally
    logger.info('Breakthrough event', event);
    
    // Send to analytics system
    try {
      const cinematicEvent = eventType === 'completed' ? 'completed' :
        eventType === 'aborted' ? 'skipped' :
        eventType === 'error' ? 'error' : 'started';
      analytics.trackCinematic(
        cinematicEvent as 'completed' | 'skipped' | 'error' | 'started',
        {
          variant: this.state.currentVariant.id as 'spiral_ascend',
          duration,
          seed: this.state.currentVariant.seed,
          intensityBand: this.state.currentVariant.intensity,
          wasFallback: this.state.isSafeMode,
        }
      );
    } catch (error) {
      // Analytics failure should not break the breakthrough
      logger.warn('Analytics tracking failed', { error });
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let directorInstance: BreakthroughDirector | null = null;

/**
 * Get the singleton director instance
 */
export function getBreakthroughDirector(): BreakthroughDirector {
  if (!directorInstance) {
    directorInstance = new BreakthroughDirector();
  }
  return directorInstance;
}

/**
 * Reset the director (for testing)
 */
export function resetBreakthroughDirector(): void {
  if (directorInstance) {
    directorInstance.dispose();
    directorInstance = null;
  }
}
