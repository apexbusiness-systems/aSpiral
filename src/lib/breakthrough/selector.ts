/**
 * Breakthrough Selector
 * Anti-redundancy selection with recency penalty, novelty scoring, and fatigue protection
 */

import type {
  BaseVariant,
  MutatedVariant,
  SelectionContext,
  BreakthroughClass,
  IntensityBand,
  QualityTier,
} from './types';
import {
  getAllVariants,
  getVariantById,
  getLowTierVariants,
  getFallbackVariants,
  mutateVariant,
  generateSeed,
} from './catalog';
import { getBreakthroughHistory, type BreakthroughHistory } from './history';
import { createLogger } from '@/lib/logger';

const logger = createLogger('BreakthroughSelector');

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Number of recent variants to avoid */
const RECENCY_WINDOW = 10;

/** Weights for scoring */
const WEIGHTS = {
  recency: 0.35,      // How much to penalize recent variants
  novelty: 0.25,      // How much to reward unused mutation space
  affinity: 0.25,     // How much to reward context matching
  fatigue: 0.15,      // How much to adjust for fatigue protection
};

/** Fatigue thresholds */
const FATIGUE_CONFIG = {
  // If user had N high/extreme intensity effects recently, prefer calmer
  recentIntenseThreshold: 2,
  // Window to check for intense effects
  fatigueWindow: 5,
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate recency penalty (0-1, higher = more recent = worse)
 */
function calculateRecencyPenalty(
  variantId: string,
  recentVariantIds: string[]
): number {
  const index = recentVariantIds.indexOf(variantId);
  if (index === -1) return 0; // Not recent, no penalty
  
  // Linear penalty: most recent = 1.0, oldest in window = 0.1
  return 1 - (index / RECENCY_WINDOW) * 0.9;
}

/**
 * Calculate novelty score (0-1, higher = more novel)
 * Based on how much of the variant's mutation space we've explored
 */
function calculateNoveltyScore(
  variant: BaseVariant,
  history: BreakthroughHistory
): number {
  const variantHistory = history.entries.filter((e) => e.variantId === variant.id);
  
  if (variantHistory.length === 0) return 1.0; // Never used, maximum novelty
  
  // More uses = less novelty
  const useCount = variantHistory.length;
  const novelty = Math.max(0.1, 1 - useCount * 0.1);
  
  // Check seed diversity
  const uniqueSeeds = new Set(variantHistory.map((e) => e.seed % 100));
  const seedDiversityBonus = uniqueSeeds.size < 10 ? 0.2 : 0;
  
  return Math.min(1, novelty + seedDiversityBonus);
}

/**
 * Calculate context affinity (0-1, higher = better match)
 */
function calculateContextAffinity(
  variant: BaseVariant,
  context: SelectionContext
): number {
  let affinity = 0.5; // Base affinity
  
  // Match breakthrough type hint
  if (context.breakthroughType && variant.class === context.breakthroughType) {
    affinity += 0.3;
  }
  
  // Match sentiment with color mood
  if (context.sentiment > 0.3) {
    // Positive sentiment: prefer warm, dawn, nature
    if (['warm', 'dawn', 'nature'].includes(variant.colorMood)) {
      affinity += 0.15;
    }
  } else if (context.sentiment < -0.3) {
    // Negative sentiment: prefer release, resolve, boundary classes
    if (['release', 'resolve', 'boundary'].includes(variant.class)) {
      affinity += 0.15;
    }
  }
  
  // Match friction intensity
  if (context.frictionIntensity > 0.7) {
    // High friction: prefer release, courage, resolve
    if (['release', 'courage', 'resolve'].includes(variant.class)) {
      affinity += 0.1;
    }
  }
  
  // Check entity type matching
  const entityTypes = context.entities.map((e) => e.type);
  if (entityTypes.includes('friction') && variant.class === 'release') {
    affinity += 0.1;
  }
  if (entityTypes.includes('value') && variant.class === 'clarity') {
    affinity += 0.1;
  }
  
  return Math.min(1, affinity);
}

/**
 * Calculate fatigue adjustment (-0.5 to 0.5)
 * Negative = reduce intensity, Positive = allow intensity
 */
function calculateFatigueAdjustment(
  variant: BaseVariant,
  context: SelectionContext
): number {
  const recentIntense = context.recentIntensities.filter(
    (i) => i === 'high' || i === 'extreme'
  );
  
  const isFatigued = recentIntense.length >= FATIGUE_CONFIG.recentIntenseThreshold;
  
  if (isFatigued) {
    // User is fatigued, prefer low/medium intensity
    if (variant.intensity === 'low') return 0.4;
    if (variant.intensity === 'medium') return 0.2;
    if (variant.intensity === 'high') return -0.3;
    if (variant.intensity === 'extreme') return -0.5;
  } else {
    // User not fatigued, neutral adjustment
    return 0;
  }
  
  return 0;
}

/**
 * Calculate total score for a variant
 */
function calculateTotalScore(
  variant: BaseVariant,
  context: SelectionContext,
  history: BreakthroughHistory
): number {
  const recencyPenalty = calculateRecencyPenalty(variant.id, context.recentVariantIds);
  const noveltyScore = calculateNoveltyScore(variant, history);
  const affinityScore = calculateContextAffinity(variant, context);
  const fatigueAdjustment = calculateFatigueAdjustment(variant, context);
  
  // Calculate weighted score (invert recency penalty)
  const score =
    (1 - recencyPenalty) * WEIGHTS.recency +
    noveltyScore * WEIGHTS.novelty +
    affinityScore * WEIGHTS.affinity +
    (0.5 + fatigueAdjustment) * WEIGHTS.fatigue;
  
  return score;
}

// ============================================================================
// SELECTION FUNCTIONS
// ============================================================================

/**
 * Get eligible variants based on quality tier and reduced motion
 */
function getEligibleVariants(context: SelectionContext): BaseVariant[] {
  let variants = getAllVariants();
  
  // Filter by quality tier
  if (context.qualityTier === 'low') {
    variants = getLowTierVariants();
  }
  
  // Filter for reduced motion
  if (context.reducedMotion) {
    variants = variants.filter(
      (v) => v.intensity === 'low' && v.curveProfile === 'ease'
    );
    // Fallback if no suitable variants
    if (variants.length === 0) {
      variants = getFallbackVariants();
    }
  }
  
  return variants;
}

/**
 * Select the best variant for the given context
 */
export function selectVariant(context: SelectionContext): {
  variant: MutatedVariant;
  scores: Map<string, number>;
} {
  const history = getBreakthroughHistory();
  const eligibleVariants = getEligibleVariants(context);
  
  if (eligibleVariants.length === 0) {
    logger.warn('No eligible variants, using fallback');
    const fallbackVariant = getFallbackVariants()[0] || getAllVariants()[0];
    return {
      variant: mutateVariant(fallbackVariant, generateSeed()),
      scores: new Map(),
    };
  }
  
  // Calculate scores for all eligible variants
  const scores = new Map<string, number>();
  for (const variant of eligibleVariants) {
    const score = calculateTotalScore(variant, context, history);
    scores.set(variant.id, score);
  }
  
  // Sort by score (descending)
  const sortedVariants = [...eligibleVariants].sort(
    (a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0)
  );
  
  // Select top variant (with some randomness for variety)
  const topN = Math.min(3, sortedVariants.length);
  const topVariants = sortedVariants.slice(0, topN);
  
  // Weighted random selection from top variants
  const totalTopScore = topVariants.reduce((sum, v) => sum + (scores.get(v.id) || 0), 0);
  let random = Math.random() * totalTopScore;
  
  let selectedVariant = topVariants[0];
  for (const variant of topVariants) {
    random -= scores.get(variant.id) || 0;
    if (random <= 0) {
      selectedVariant = variant;
      break;
    }
  }
  
  // Generate seed and mutate
  const seed = generateSeed();
  const mutatedVariant = mutateVariant(selectedVariant, seed);
  
  logger.info('Variant selected', {
    variantId: selectedVariant.id,
    seed,
    score: scores.get(selectedVariant.id),
    eligibleCount: eligibleVariants.length,
  });
  
  return {
    variant: mutatedVariant,
    scores,
  };
}

/**
 * Select a fallback variant (for safe mode)
 */
export function selectFallbackVariant(qualityTier: QualityTier): MutatedVariant {
  const fallbacks = getFallbackVariants();
  
  // Prefer clarity_pulse as the ultimate fallback
  const clarityPulse = fallbacks.find((v) => v.id === 'clarity_pulse');
  if (clarityPulse) {
    return mutateVariant(clarityPulse, generateSeed());
  }
  
  // Otherwise pick a random fallback
  const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)] || fallbacks[0];
  return mutateVariant(randomFallback, generateSeed());
}

/**
 * Map breakthrough type hint to class
 */
export function mapBreakthroughTypeToClass(type: string): BreakthroughClass | undefined {
  const mapping: Record<string, BreakthroughClass> = {
    release: 'release',
    clarity: 'clarity',
    resolve: 'resolve',
    courage: 'courage',
    boundary: 'boundary',
    reframe: 'reframe',
    choice: 'choice',
    integration: 'integration',
    reveal: 'reveal',
    emergence: 'emergence',
    flow: 'flow',
    spark: 'spark',
  };
  
  return mapping[type.toLowerCase()];
}

/**
 * Build selection context from session data
 */
export function buildSelectionContext(
  sessionEntities: Array<{ type: string; label: string; metadata?: { valence?: number } }>,
  breakthroughType?: string,
  qualityTier: QualityTier = 'mid',
  reducedMotion = false
): SelectionContext {
  const history = getBreakthroughHistory();
  
  // Extract recent variant IDs and intensities from history
  const recentEntries = history.entries.slice(-RECENCY_WINDOW);
  const recentVariantIds = recentEntries.map((e) => e.variantId);
  const recentIntensities = recentEntries
    .slice(-FATIGUE_CONFIG.fatigueWindow)
    .map((e) => e.intensity);
  
  // Calculate sentiment from entities
  const entityValences = sessionEntities
    .filter((e) => e.metadata?.valence !== undefined)
    .map((e) => e.metadata!.valence!);
  const sentiment =
    entityValences.length > 0
      ? entityValences.reduce((a, b) => a + b, 0) / entityValences.length
      : 0;
  
  // Calculate friction intensity from friction entities
  const frictionEntities = sessionEntities.filter((e) => e.type === 'friction');
  const frictionIntensity = Math.min(1, frictionEntities.length * 0.3);
  
  return {
    entities: sessionEntities.map((e) => ({
      type: e.type,
      label: e.label,
      valence: e.metadata?.valence,
    })),
    sentiment,
    frictionIntensity,
    breakthroughType: breakthroughType
      ? mapBreakthroughTypeToClass(breakthroughType)
      : undefined,
    recentIntensities,
    recentVariantIds,
    qualityTier,
    reducedMotion,
  };
}
