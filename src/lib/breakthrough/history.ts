/**
 * Breakthrough History
 * Persistence layer for user breakthrough history using localStorage
 */

import type { BreakthroughHistoryEntry, IntensityBand, QualityTier } from './types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('BreakthroughHistory');

const STORAGE_KEY = 'aspiral_breakthrough_history';
const MAX_HISTORY_ENTRIES = 100;
const ANONYMOUS_USER_ID_KEY = 'aspiral_anonymous_user_id';

// ============================================================================
// ANONYMOUS USER ID
// ============================================================================

/**
 * Get or create an anonymous user ID
 */
function getAnonymousUserId(): string {
  if (typeof localStorage === 'undefined') {
    return 'anonymous';
  }
  
  let userId = localStorage.getItem(ANONYMOUS_USER_ID_KEY);
  if (!userId) {
    userId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(ANONYMOUS_USER_ID_KEY, userId);
  }
  return userId;
}

// ============================================================================
// HISTORY INTERFACE
// ============================================================================

export interface BreakthroughHistory {
  userId: string;
  entries: BreakthroughHistoryEntry[];
  lastUpdated: number;
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

/**
 * Load history from localStorage
 */
function loadHistory(): BreakthroughHistory {
  if (typeof localStorage === 'undefined') {
    return {
      userId: 'anonymous',
      entries: [],
      lastUpdated: Date.now(),
    };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as BreakthroughHistory;
      return parsed;
    }
  } catch (error) {
    logger.warn('Failed to load breakthrough history', { error });
  }
  
  return {
    userId: getAnonymousUserId(),
    entries: [],
    lastUpdated: Date.now(),
  };
}

/**
 * Save history to localStorage
 */
function saveHistory(history: BreakthroughHistory): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  
  try {
    // Trim to max entries
    if (history.entries.length > MAX_HISTORY_ENTRIES) {
      history.entries = history.entries.slice(-MAX_HISTORY_ENTRIES);
    }
    
    history.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    logger.warn('Failed to save breakthrough history', { error });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let cachedHistory: BreakthroughHistory | null = null;

/**
 * Get the breakthrough history (cached)
 */
export function getBreakthroughHistory(): BreakthroughHistory {
  if (!cachedHistory) {
    cachedHistory = loadHistory();
  }
  return cachedHistory;
}

/**
 * Refresh history from storage
 */
export function refreshBreakthroughHistory(): BreakthroughHistory {
  cachedHistory = loadHistory();
  return cachedHistory;
}

// ============================================================================
// HISTORY OPERATIONS
// ============================================================================

/**
 * Record a breakthrough play
 */
export function recordBreakthrough(
  variantId: string,
  seed: number,
  intensity: IntensityBand,
  qualityTier: QualityTier,
  completed: boolean,
  wasFallback: boolean
): void {
  const history = getBreakthroughHistory();
  
  const entry: BreakthroughHistoryEntry = {
    variantId,
    seed,
    intensity,
    timestamp: Date.now(),
    qualityTier,
    completed,
    wasFallback,
  };
  
  history.entries.push(entry);
  saveHistory(history);
  
  logger.info('Breakthrough recorded', { variantId, seed, completed, wasFallback });
}

/**
 * Get recent variant IDs
 */
export function getRecentVariantIds(count: number = 10): string[] {
  const history = getBreakthroughHistory();
  return history.entries
    .slice(-count)
    .map((e) => e.variantId)
    .reverse();
}

/**
 * Get recent intensities
 */
export function getRecentIntensities(count: number = 5): IntensityBand[] {
  const history = getBreakthroughHistory();
  return history.entries
    .slice(-count)
    .map((e) => e.intensity)
    .reverse();
}

/**
 * Get statistics for a specific variant
 */
export function getVariantStats(variantId: string): {
  playCount: number;
  completionRate: number;
  fallbackRate: number;
  lastPlayed: number | null;
} {
  const history = getBreakthroughHistory();
  const variantEntries = history.entries.filter((e) => e.variantId === variantId);
  
  if (variantEntries.length === 0) {
    return {
      playCount: 0,
      completionRate: 0,
      fallbackRate: 0,
      lastPlayed: null,
    };
  }
  
  const completed = variantEntries.filter((e) => e.completed).length;
  const fallbacks = variantEntries.filter((e) => e.wasFallback).length;
  const lastEntry = variantEntries[variantEntries.length - 1];
  
  return {
    playCount: variantEntries.length,
    completionRate: completed / variantEntries.length,
    fallbackRate: fallbacks / variantEntries.length,
    lastPlayed: lastEntry?.timestamp || null,
  };
}

/**
 * Get overall statistics
 */
export function getOverallStats(): {
  totalPlays: number;
  completionRate: number;
  fallbackRate: number;
  uniqueVariants: number;
  averageIntensity: number;
} {
  const history = getBreakthroughHistory();
  const entries = history.entries;
  
  if (entries.length === 0) {
    return {
      totalPlays: 0,
      completionRate: 0,
      fallbackRate: 0,
      uniqueVariants: 0,
      averageIntensity: 0,
    };
  }
  
  const completed = entries.filter((e) => e.completed).length;
  const fallbacks = entries.filter((e) => e.wasFallback).length;
  const uniqueVariants = new Set(entries.map((e) => e.variantId)).size;
  
  const intensityValues: Record<IntensityBand, number> = {
    low: 1,
    medium: 2,
    high: 3,
    extreme: 4,
  };
  
  const avgIntensity =
    entries.reduce((sum, e) => sum + intensityValues[e.intensity], 0) / entries.length;
  
  return {
    totalPlays: entries.length,
    completionRate: completed / entries.length,
    fallbackRate: fallbacks / entries.length,
    uniqueVariants,
    averageIntensity: avgIntensity,
  };
}

/**
 * Clear history (for testing/reset)
 */
export function clearBreakthroughHistory(): void {
  if (typeof localStorage === 'undefined') {
    cachedHistory = null;
    return;
  }
  
  localStorage.removeItem(STORAGE_KEY);
  cachedHistory = null;
  logger.info('Breakthrough history cleared');
}

/**
 * Check if variant was used recently
 */
export function wasVariantUsedRecently(variantId: string, windowSize: number = 10): boolean {
  const recentIds = getRecentVariantIds(windowSize);
  return recentIds.includes(variantId);
}

/**
 * Get the most used variants
 */
export function getMostUsedVariants(limit: number = 5): Array<{ variantId: string; count: number }> {
  const history = getBreakthroughHistory();
  const counts = new Map<string, number>();
  
  for (const entry of history.entries) {
    counts.set(entry.variantId, (counts.get(entry.variantId) || 0) + 1);
  }
  
  return Array.from(counts.entries())
    .map(([variantId, count]) => ({ variantId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get the least used variants (for novelty)
 */
export function getLeastUsedVariantIds(allVariantIds: string[], limit: number = 5): string[] {
  const history = getBreakthroughHistory();
  const counts = new Map<string, number>();
  
  // Initialize all variants with 0
  for (const id of allVariantIds) {
    counts.set(id, 0);
  }
  
  // Count usage
  for (const entry of history.entries) {
    if (counts.has(entry.variantId)) {
      counts.set(entry.variantId, (counts.get(entry.variantId) || 0) + 1);
    }
  }
  
  return Array.from(counts.entries())
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([id]) => id);
}
