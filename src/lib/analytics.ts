/**
 * PostHog Analytics Integration for ASPIRAL
 * Comprehensive tracking for sessions, breakthroughs, entities, and performance
 */

import posthog from 'posthog-js';
import * as analyticsUtils from './analytics-utils';
import { createLogger } from './logger';
export { ANALYTICS_ENABLED_KEY, isAnalyticsEnabled } from './analytics-utils';

const logger = createLogger('Analytics');

/**
 * Safely execute an analytics operation
 * Prevents errors from bubbling up and crashing the UI
 */
function safeExecute(fn: () => void, errorMessage: string) {
  try {
    fn();
  } catch (error) {
    logger.error(errorMessage, error instanceof Error ? error : new Error(String(error)));
  }
}

// Initialize PostHog
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let isInitialized = false;

/**
 * Set analytics enabled/disabled state
 * Respects user preference and persists across sessions
 */
export function setAnalyticsEnabled(enabled: boolean): void {
  safeExecute(() => {
    localStorage.setItem(analyticsUtils.ANALYTICS_ENABLED_KEY, enabled ? 'true' : 'false');

    if (isInitialized) {
      if (enabled) {
        posthog.opt_in_capturing();
        logger.info('User opted in to analytics');
      } else {
        posthog.opt_out_capturing();
        logger.info('User opted out of analytics');
      }
    }
  }, 'Failed to set analytics preference');
}

/**
 * Initialize PostHog analytics
 * Safe to call multiple times - will only initialize once
 * Respects user opt-out preference
 */
export function initAnalytics() {
  if (isInitialized || !POSTHOG_KEY) {
    return;
  }

  // Check user preference
  const userOptedOut = !analyticsUtils.isAnalyticsEnabled();

  safeExecute(() => {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false, // Manual tracking only
      capture_pageview: !userOptedOut,
      capture_pageleave: !userOptedOut,
      disable_session_recording: userOptedOut,
      session_recording: {
        maskAllInputs: true, // Privacy-first
        maskTextSelector: undefined,
      },
      persistence: 'localStorage',
      opt_out_capturing_by_default: userOptedOut,
    });

    isInitialized = true;

    if (userOptedOut) {
      logger.info('PostHog initialized (user opted out)');
    } else {
      logger.info('PostHog initialized');
    }
  }, 'Failed to initialize PostHog');
}

// ============================================
// SESSION TRACKING
// ============================================

export interface SessionStartData {
  sessionId: string;
  userId: string;
  isAuthenticated: boolean;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  referrer?: string;
}

export interface SessionEndData {
  sessionId: string;
  duration: number; // seconds
  entityCount: number;
  connectionCount: number;
  questionCount: number;
  hadBreakthrough: boolean;
  status: string;
}

/**
 * Track session start
 */
export function trackSessionStart(data: SessionStartData) {
  if (!isInitialized) initAnalytics();
  
  safeExecute(() => {
    posthog.capture('session_started', {
      ...data,
      timestamp: Date.now(),
      url: globalThis.location.href,
    });

    logger.debug('session_started:', { data });
  }, 'Failed to track session start');
}

/**
 * Track session end
 */
export function trackSessionEnd(data: SessionEndData) {
  if (!isInitialized) initAnalytics();
  
  safeExecute(() => {
    posthog.capture('session_ended', {
      ...data,
      timestamp: Date.now(),
    });

    logger.debug('session_ended:', { data });
  }, 'Failed to track session end');
}

// ============================================
// BREAKTHROUGH TRACKING
// ============================================

export interface BreakthroughData {
  sessionId: string;
  friction: string;
  grease: string;
  insight: string;
  timeToBreakthrough: number; // seconds from session start
  entityCount: number;
  questionCount: number;
  ultraFastMode: boolean;
}

/**
 * Track breakthrough achieved
 */
export function trackBreakthrough(data: BreakthroughData) {
  if (!isInitialized) initAnalytics();
  
  safeExecute(() => {
    posthog.capture('breakthrough_achieved', {
      ...data,
      timestamp: Date.now(),
      // Truncate long strings for analytics
      friction: data.friction.slice(0, 200),
      grease: data.grease.slice(0, 200),
      insight: data.insight.slice(0, 500),
    });

    logger.debug('breakthrough_achieved:', { data });
  }, 'Failed to track breakthrough');
}

// ============================================
// BREAKTHROUGH REJECTION TRACKING (Quality V2)
// ============================================

export type BreakthroughRejectionReason =
  | 'empty_or_partial'     // Missing friction/grease/insight
  | 'generic_phrase'       // Contained banned generic filler
  | 'force_blocked'        // forceBreakthrough() blocked by V2
  | 'cinematic_no_data'    // Cinematic completed but no valid data
  | 'failsafe_no_data'     // Failsafe path had no valid data
  | 'parse_no_data'        // Breakthrough parsing found no valid data
  | 'stage_gate'           // Blocked: stage too early (friction/desire)
  | 'entity_gate';         // Blocked: not enough entities visualized

export interface BreakthroughRejectionData {
  reason: BreakthroughRejectionReason;
  source: 'forceBreakthrough' | 'handleCinematicComplete' | 'failsafe' | 'parse' | 'skipToBreakthrough' | 'shouldStopAsking';
  friction?: string;
  grease?: string;
  insight?: string;
  matchedPhrase?: string;
}

/**
 * Track when a breakthrough is rejected by Quality V2 validation.
 * Use to measure anti-generic filter impact and tune banned phrase list.
 */
export function trackBreakthroughRejected(data: BreakthroughRejectionData) {
  if (!isInitialized) initAnalytics();

  safeExecute(() => {
    posthog.capture('breakthrough_rejected', {
      ...data,
      timestamp: Date.now(),
      // Truncate for analytics
      friction: data.friction?.slice(0, 200),
      grease: data.grease?.slice(0, 200),
      insight: data.insight?.slice(0, 200),
    });

    logger.debug('breakthrough_rejected:', { data });
  }, 'Failed to track breakthrough rejection');
}

// ============================================
// ENTITY TRACKING
// ============================================

export interface EntityCreatedData {
  sessionId: string;
  entityId: string;
  entityType: string;
  totalEntities: number;
  method: 'ai_extracted' | 'manual' | 'demo';
}

/**
 * Track entity creation
 */
export function trackEntityCreated(data: EntityCreatedData) {
  if (!isInitialized) initAnalytics();
  
  safeExecute(() => {
    posthog.capture('entity_created', {
      ...data,
      timestamp: Date.now(),
    });

    logger.debug('entity_created:', { data });
  }, 'Failed to track entity');
}

// ============================================
// FEATURE USAGE TRACKING
// ============================================

export type FeatureType = 
  | 'voice_input'
  | 'ultra_fast_mode'
  | 'skip_to_breakthrough'
  | 'cinematic_played'
  | 'cinematic_skipped'
  | 'session_saved'
  | 'session_resumed'
  | 'session_exported'
  | 'question_answered'
  | 'question_dismissed'
  | 'settings_opened'
  | 'keyboard_shortcut'
  | 'google_oauth'
  | 'email_signup'
  | 'pwa_install_prompt_triggered'
  | 'pwa_install_outcome';

export interface FeatureUsageData {
  feature: FeatureType;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Track feature usage
 */
export function trackFeatureUsed(data: FeatureUsageData) {
  if (!isInitialized) initAnalytics();
  
  safeExecute(() => {
    posthog.capture('feature_used', {
      ...data,
      timestamp: Date.now(),
      deviceType: getDeviceType(),
    });

    logger.debug('feature_used:', { data });
  }, 'Failed to track feature usage');
}

// ============================================
// SESSION DURATION TRACKING
// ============================================

let sessionStartTime: number | null = null;

/**
 * Start tracking session duration
 */
export function startDurationTracking() {
  sessionStartTime = Date.now();
}

/**
 * Get current session duration in seconds
 */
export function getSessionDuration(): number {
  if (!sessionStartTime) return 0;
  return Math.floor((Date.now() - sessionStartTime) / 1000);
}

/**
 * Track session duration milestone
 */
export function trackDurationMilestone(milestone: number, sessionId: string) {
  if (!isInitialized) initAnalytics();
  
  safeExecute(() => {
    posthog.capture('session_duration_milestone', {
      sessionId,
      milestone, // in seconds
      timestamp: Date.now(),
    });

    logger.debug(`Duration milestone: ${milestone}s`);
  }, 'Failed to track duration milestone');
}

// ============================================
// CINEMATIC TRACKING (existing)
// ============================================

export type CinematicEvent = 'started' | 'completed' | 'skipped' | 'error';

export type CinematicVariant =
  | 'spiral_ascend'
  | 'particle_explosion'
  | 'portal_reveal'
  | 'matrix_decode'
  | 'space_warp';

export interface CinematicPerformanceMetrics {
  variant: CinematicVariant;
  avgFps: number;
  minFps: number;
  maxFps: number;
  peakMemoryMB: number;
  duration: number;
  particleCount: number;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  // GPU context for debugging performance issues
  gpuTier?: number;
  gpuRenderer?: string;
  qualityMultiplier?: number;
  wasAdaptiveReduced?: boolean;
}

/**
 * Track cinematic events
 */
export function trackCinematic(
  event: CinematicEvent,
  data: {
    variant: CinematicVariant;
    progress?: number;
    duration?: number;
    error?: string;
    [key: string]: unknown;
  }
) {
  if (!isInitialized) initAnalytics();

  safeExecute(() => {
    const eventName = `cinematic_${event}`;
    const eventData = {
      ...data,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    };

    posthog.capture(eventName, eventData);

    // Also track as feature usage
    if (event === 'completed') {
      trackFeatureUsed({ feature: 'cinematic_played', metadata: { variant: data.variant } });
    } else if (event === 'skipped') {
      trackFeatureUsed({ feature: 'cinematic_skipped', metadata: { variant: data.variant, progress: data.progress } });
    }

    logger.debug(`${eventName}:`, { eventData });
  }, 'Failed to track cinematic event');
}

/**
 * Track cinematic performance metrics
 */
export function trackPerformance(metrics: CinematicPerformanceMetrics) {
  if (!isInitialized) initAnalytics();

  safeExecute(() => {
    posthog.capture('cinematic_performance', {
      ...metrics,
      timestamp: Date.now(),
    });

    if (metrics.avgFps < 30) {
      logger.warn(`Poor performance in ${metrics.variant}:`, { metrics });
    }

    logger.debug(`Performance (${metrics.variant}):`, { metrics });
  }, 'Failed to track performance');
}

// ============================================
// CINEMATIC ERROR TRACKING
// ============================================

export type CinematicErrorType =
  | 'webgl_context_lost'
  | 'render_error'
  | 'timeout'
  | 'audio_error'
  | 'unknown';

export interface CinematicErrorData {
  variant: CinematicVariant;
  errorType: CinematicErrorType;
  errorMessage?: string;
  duration?: number;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  gpuTier?: number;
  gpuRenderer?: string;
  browserInfo?: string;
}

/**
 * Track cinematic errors with device context for debugging
 */
export function trackCinematicError(data: CinematicErrorData) {
  if (!isInitialized) initAnalytics();

  safeExecute(() => {
    // Sanitize error message to remove file paths
    const sanitizedMessage = data.errorMessage
      ?.replace(/file:\/\/[^\s]+/g, '[path]') // nosonar
      ?.replace(/https?:\/\/[^\s]+/g, '[url]') // nosonar
      ?.slice(0, 500);

    posthog.capture('cinematic_error', {
      ...data,
      errorMessage: sanitizedMessage,
      browserInfo: data.browserInfo || navigator.userAgent,
      timestamp: Date.now(),
    });

    logger.error('Cinematic error tracked:', undefined, {
      variant: data.variant,
      errorType: data.errorType,
      deviceType: data.deviceType,
      gpuTier: data.gpuTier,
    });
  }, 'Failed to track cinematic error');
}

// ============================================
// FATAL UI ERROR TRACKING
// ============================================

export interface FatalUiErrorData {
  message: string;
  stack?: string;
  route: string;
  userAgent: string;
  deviceMemory?: number;
}

export function trackFatalUiError(data: FatalUiErrorData) {
  if (!isInitialized) initAnalytics();

  safeExecute(() => {
    posthog.capture('fatal_ui_error', {
      ...data,
      timestamp: Date.now(),
    });

    logger.debug('fatal_ui_error:', { data });
  }, 'Failed to track fatal_ui_error');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Detect device type
 */
export function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  const ua = navigator.userAgent;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }

  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Get memory usage (if available)
 */
export function getMemoryUsage(): number {
  try {
    // @ts-expect-error - memory API not fully supported
    if (performance.memory) {
      // @ts-expect-error - memory API not fully supported
      return performance.memory.usedJSHeapSize / 1024 / 1024;
    }
  } catch {
    // Memory API not available
  }
  return 0;
}

// ============================================
// ANALYTICS OBJECT (convenience wrapper)
// ============================================

export const analytics = {
  init: initAnalytics,

  // Privacy controls
  isEnabled: analyticsUtils.isAnalyticsEnabled,
  setEnabled: setAnalyticsEnabled,

  // Session tracking
  trackSessionStart,
  trackSessionEnd,
  startDurationTracking,
  getSessionDuration,
  trackDurationMilestone,
  
  // Breakthrough tracking
  trackBreakthrough,
  
  // Entity tracking
  trackEntityCreated,
  
  // Feature usage
  trackFeatureUsed,
  trackFatalUiError,
  
  // Cinematic tracking
  trackCinematic,
  trackPerformance,
  trackCinematicError,

  // Utilities
  getDeviceType,
  getMemoryUsage,

  /**
   * Identify user (for authenticated sessions)
   */
  identify: (userId: string, traits?: Record<string, unknown>) => {
    if (!isInitialized) initAnalytics();
    
    safeExecute(() => {
      posthog.identify(userId, traits);
      logger.debug('User identified:', { userId, traits });
    }, 'Failed to identify user');
  },

  /**
   * Reset user identity (on logout)
   */
  reset: () => {
    if (!isInitialized) return;
    
    safeExecute(() => {
      posthog.reset();
      sessionStartTime = null;
      logger.debug('User reset');
    }, 'Failed to reset user identity');
  },
  
  /**
   * Set user properties
   */
  setUserProperties: (properties: Record<string, unknown>) => {
    if (!isInitialized) initAnalytics();

    safeExecute(() => {
      posthog.people.set(properties);
    }, 'Failed to set user properties');
  },
};

// Auto-initialize on import
initAnalytics();
