/**
 * PostHog Analytics Integration for ASPIRAL
 * Tracks cinematic playback and performance metrics
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
      session_recording: {
        enabled: true,
        maskAllInputs: true, // Privacy-first
        maskAllText: false,
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

/**
 * Cinematic event types
 */
export type CinematicEvent = 'started' | 'completed' | 'skipped' | 'error';

/**
 * Cinematic variant names
 */
export type CinematicVariant =
  | 'spiral_ascend'
  | 'particle_explosion'
  | 'portal_reveal'
  | 'matrix_decode'
  | 'space_warp';

/**
 * Performance metrics for cinematics
 */
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
    progress?: number; // 0-100 for skipped events
    duration?: number; // Actual playback duration
    error?: string; // Error message for error events
    [key: string]: unknown;
  }
) {
  if (!isInitialized) {
    initAnalytics();
  }

  try {
    const eventName = `cinematic_${event}`;
    const eventData = {
      ...data,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    };

    posthog.capture(eventName, eventData);

    // Also log to console in development
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
  if (!isInitialized) {
    initAnalytics();
  }

  try {
    posthog.capture('cinematic_performance', {
      ...metrics,
      timestamp: Date.now(),
    });

    // Log warning if performance is poor
    if (metrics.avgFps < 30) {
      console.warn(`[Analytics] Poor performance in ${metrics.variant}:`, metrics);
    }

    // Also log to console in development
    if (import.meta.env.DEV) {
      console.log(`[Analytics] Performance (${metrics.variant}):`, metrics);
    }
  } catch (error) {
    console.error('[Analytics] Failed to track performance:', error);
  }
}

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
      return performance.memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }
  } catch {
    // Memory API not available
  }
  return 0;
}

/**
 * Analytics helper object for convenience
 */
export const analytics = {
  init: initAnalytics,
  trackCinematic,
  trackPerformance,
  getDeviceType,
  getMemoryUsage,

  /**
   * Identify user (for authenticated sessions)
   */
  identify: (userId: string, traits?: Record<string, unknown>) => {
    if (!isInitialized) {
      initAnalytics();
    }
    posthog.identify(userId, traits);
  },

  /**
   * Reset user identity (on logout)
   */
  reset: () => {
    if (!isInitialized) return;
    posthog.reset();
  },
};

// Auto-initialize on import
initAnalytics();
