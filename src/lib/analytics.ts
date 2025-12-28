/**
 * PostHog Analytics Integration for ASPIRAL
 * Comprehensive tracking for sessions, breakthroughs, entities, and performance
 */

import posthog from 'posthog-js';

// Initialize PostHog
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

let isInitialized = false;

/**
 * Initialize PostHog analytics
 * Safe to call multiple times - will only initialize once
 */
export function initAnalytics() {
  if (isInitialized || !POSTHOG_KEY) {
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false, // Manual tracking only
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true, // Privacy-first
        maskTextSelector: undefined,
      },
      persistence: 'localStorage',
      opt_out_capturing_by_default: false,
    });

    isInitialized = true;
    console.log('[Analytics] PostHog initialized');
  } catch (error) {
    console.error('[Analytics] Failed to initialize PostHog:', error);
  }
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
  
  try {
    posthog.capture('session_started', {
      ...data,
      timestamp: Date.now(),
      url: window.location.href,
    });

    if (import.meta.env.DEV) {
      console.log('[Analytics] session_started:', data);
    }
  } catch (error) {
    console.error('[Analytics] Failed to track session start:', error);
  }
}

/**
 * Track session end
 */
export function trackSessionEnd(data: SessionEndData) {
  if (!isInitialized) initAnalytics();
  
  try {
    posthog.capture('session_ended', {
      ...data,
      timestamp: Date.now(),
    });

    if (import.meta.env.DEV) {
      console.log('[Analytics] session_ended:', data);
    }
  } catch (error) {
    console.error('[Analytics] Failed to track session end:', error);
  }
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
  
  try {
    posthog.capture('breakthrough_achieved', {
      ...data,
      timestamp: Date.now(),
      // Truncate long strings for analytics
      friction: data.friction.slice(0, 200),
      grease: data.grease.slice(0, 200),
      insight: data.insight.slice(0, 500),
    });

    if (import.meta.env.DEV) {
      console.log('[Analytics] breakthrough_achieved:', data);
    }
  } catch (error) {
    console.error('[Analytics] Failed to track breakthrough:', error);
  }
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
  
  try {
    posthog.capture('entity_created', {
      ...data,
      timestamp: Date.now(),
    });

    if (import.meta.env.DEV) {
      console.log('[Analytics] entity_created:', data);
    }
  } catch (error) {
    console.error('[Analytics] Failed to track entity:', error);
  }
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
  | 'email_signup';

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
  
  try {
    posthog.capture('feature_used', {
      ...data,
      timestamp: Date.now(),
      deviceType: getDeviceType(),
    });

    if (import.meta.env.DEV) {
      console.log('[Analytics] feature_used:', data);
    }
  } catch (error) {
    console.error('[Analytics] Failed to track feature usage:', error);
  }
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
  
  try {
    posthog.capture('session_duration_milestone', {
      sessionId,
      milestone, // in seconds
      timestamp: Date.now(),
    });

    if (import.meta.env.DEV) {
      console.log(`[Analytics] Duration milestone: ${milestone}s`);
    }
  } catch (error) {
    console.error('[Analytics] Failed to track duration milestone:', error);
  }
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

  try {
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

    if (import.meta.env.DEV) {
      console.log(`[Analytics] ${eventName}:`, eventData);
    }
  } catch (error) {
    console.error('[Analytics] Failed to track cinematic event:', error);
  }
}

/**
 * Track cinematic performance metrics
 */
export function trackPerformance(metrics: CinematicPerformanceMetrics) {
  if (!isInitialized) initAnalytics();

  try {
    posthog.capture('cinematic_performance', {
      ...metrics,
      timestamp: Date.now(),
    });

    if (metrics.avgFps < 30) {
      console.warn(`[Analytics] Poor performance in ${metrics.variant}:`, metrics);
    }

    if (import.meta.env.DEV) {
      console.log(`[Analytics] Performance (${metrics.variant}):`, metrics);
    }
  } catch (error) {
    console.error('[Analytics] Failed to track performance:', error);
  }
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
  
  // Cinematic tracking
  trackCinematic,
  trackPerformance,
  
  // Utilities
  getDeviceType,
  getMemoryUsage,

  /**
   * Identify user (for authenticated sessions)
   */
  identify: (userId: string, traits?: Record<string, unknown>) => {
    if (!isInitialized) initAnalytics();
    posthog.identify(userId, traits);
    
    if (import.meta.env.DEV) {
      console.log('[Analytics] User identified:', userId, traits);
    }
  },

  /**
   * Reset user identity (on logout)
   */
  reset: () => {
    if (!isInitialized) return;
    posthog.reset();
    sessionStartTime = null;
    
    if (import.meta.env.DEV) {
      console.log('[Analytics] User reset');
    }
  },
  
  /**
   * Set user properties
   */
  setUserProperties: (properties: Record<string, unknown>) => {
    if (!isInitialized) initAnalytics();
    posthog.people.set(properties);
  },
};

// Auto-initialize on import
initAnalytics();
