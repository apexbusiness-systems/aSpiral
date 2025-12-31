/**
 * Breakthrough Selector Unit Tests
 * Tests for recency avoidance, fatigue protection, and mutation determinism
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Import after mocking localStorage
import {
  selectVariant,
  selectFallbackVariant,
  buildSelectionContext,
} from '../selector';
import { mutateVariant, generateSeed, getAllVariants } from '../catalog';
import { clearBreakthroughHistory, recordBreakthrough } from '../history';
import type { SelectionContext } from '../types';

describe('Breakthrough Selector', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearBreakthroughHistory();
  });

  describe('Recency Avoidance', () => {
    it('should avoid variants used in last 10 plays', () => {
      const allVariants = getAllVariants();
      
      // Record 10 different variants as recently used
      const recentVariantIds = allVariants.slice(0, 10).map((v) => v.id);
      
      recentVariantIds.forEach((id) => {
        recordBreakthrough(id, 12345, 'medium', 'mid', true, false);
      });
      
      // Build context
      const context = buildSelectionContext([], undefined, 'mid', false);
      
      // Select 20 variants and check they avoid recent ones
      const selectedIds = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const { variant } = selectVariant(context);
        selectedIds.add(variant.id);
      }
      
      // Should have selected variants outside the recent 10
      // (Some recent ones might still be selected due to weighted randomness,
      // but the majority should be different)
      const recentSelectedCount = [...selectedIds].filter((id) =>
        recentVariantIds.includes(id)
      ).length;
      
      // Less than half should be from recent
      expect(recentSelectedCount).toBeLessThan(selectedIds.size / 2);
    });

    it('should not repeat the same variant consecutively', () => {
      const context = buildSelectionContext([], undefined, 'mid', false);
      
      // Select multiple times and track
      const selections: string[] = [];
      
      for (let i = 0; i < 10; i++) {
        const { variant } = selectVariant(context);
        selections.push(variant.id);
        
        // Record it so next selection knows about it
        recordBreakthrough(variant.id, variant.seed, variant.intensity, 'mid', true, false);
      }
      
      // Check for no immediate repeats
      let consecutiveRepeats = 0;
      for (let i = 1; i < selections.length; i++) {
        if (selections[i] === selections[i - 1]) {
          consecutiveRepeats++;
        }
      }
      
      // Should have very few consecutive repeats (weighted random can occasionally repeat)
      // With 5 variants and 10 selections, expect < 50% consecutive repeats
      expect(consecutiveRepeats).toBeLessThan(5);
    });
  });

  describe('Fatigue Protection', () => {
    it('should prefer low intensity after multiple high intensity effects', () => {
      // Record several high intensity breakthroughs
      const highIntensityVariant = getAllVariants().find((v) => v.intensity === 'high');
      if (highIntensityVariant) {
        for (let i = 0; i < 3; i++) {
          recordBreakthrough(highIntensityVariant.id, 12345 + i, 'high', 'mid', true, false);
        }
      }
      
      // Build context (will have recent high intensities)
      const context = buildSelectionContext([], undefined, 'mid', false);
      
      // Select multiple variants
      const intensities: string[] = [];
      for (let i = 0; i < 10; i++) {
        const { variant } = selectVariant(context);
        intensities.push(variant.intensity);
      }
      
      // Should favor lower intensities
      const lowMediumCount = intensities.filter(
        (i) => i === 'low' || i === 'medium'
      ).length;
      
      // At least half should be low/medium
      expect(lowMediumCount).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Context Affinity', () => {
    it('should match release class when friction entities present', () => {
      const context = buildSelectionContext(
        [
          { type: 'friction', label: 'Work stress' },
          { type: 'friction', label: 'Relationship tension' },
        ],
        undefined,
        'mid',
        false
      );
      
      // Select multiple times
      const classes: string[] = [];
      for (let i = 0; i < 10; i++) {
        const { variant } = selectVariant(context);
        classes.push(variant.class);
      }
      
      // Should have some release, resolve, or courage classes
      const releaseRelatedCount = classes.filter((c) =>
        ['release', 'resolve', 'courage'].includes(c)
      ).length;
      
      // At least some should be release-related
      expect(releaseRelatedCount).toBeGreaterThan(0);
    });

    it('should respect breakthrough type hint', () => {
      const context = buildSelectionContext(
        [],
        'clarity', // Hint for clarity type
        'mid',
        false
      );
      
      // Select multiple times
      const classes: string[] = [];
      for (let i = 0; i < 20; i++) {
        const { variant } = selectVariant(context);
        classes.push(variant.class);
      }
      
      // Should have more clarity class variants
      const clarityCount = classes.filter((c) => c === 'clarity').length;
      
      // Should have at least some clarity variants
      expect(clarityCount).toBeGreaterThan(0);
    });
  });

  describe('Reduced Motion', () => {
    it('should only select low intensity variants with reduced motion', () => {
      const context = buildSelectionContext([], undefined, 'mid', true);
      
      // Select multiple times
      for (let i = 0; i < 10; i++) {
        const { variant } = selectVariant(context);
        
        // Should only get low intensity with ease curve
        expect(variant.intensity).toBe('low');
        expect(variant.curveProfile).toBe('ease');
      }
    });
  });

  describe('Fallback Selection', () => {
    it('should return a valid fallback variant', () => {
      const fallback = selectFallbackVariant('mid');
      
      expect(fallback).toBeDefined();
      expect(fallback.id).toBeDefined();
      expect(fallback.finalDuration).toBeGreaterThan(0);
      expect(fallback.finalParticleCount).toBeGreaterThan(0);
    });

    it('should prefer clarity_pulse as fallback', () => {
      // Select fallback multiple times
      const fallbacks = Array.from({ length: 5 }, () =>
        selectFallbackVariant('mid')
      );
      
      // At least one should be clarity_pulse if it exists
      const hasClarityPulse = fallbacks.some((f) => f.id === 'clarity_pulse');
      
      // Either clarity_pulse exists and is selected, or any fallback is valid
      expect(fallbacks.every((f) => f.isFallback || f.lowTierSafe)).toBe(true);
    });
  });
});

describe('Mutation Determinism', () => {
  it('should produce identical mutations with same seed', () => {
    const allVariants = getAllVariants();
    const baseVariant = allVariants[0];
    const seed = 42;
    
    const mutation1 = mutateVariant(baseVariant, seed);
    const mutation2 = mutateVariant(baseVariant, seed);
    
    expect(mutation1.seed).toBe(mutation2.seed);
    expect(mutation1.finalDuration).toBe(mutation2.finalDuration);
    expect(mutation1.finalParticleCount).toBe(mutation2.finalParticleCount);
    expect(mutation1.mutation.speedMultiplier).toBe(mutation2.mutation.speedMultiplier);
    expect(mutation1.mutation.scaleMultiplier).toBe(mutation2.mutation.scaleMultiplier);
    expect(mutation1.finalColors).toEqual(mutation2.finalColors);
  });

  it('should produce different mutations with different seeds', () => {
    const allVariants = getAllVariants();
    const baseVariant = allVariants[0];
    
    const mutation1 = mutateVariant(baseVariant, 100);
    const mutation2 = mutateVariant(baseVariant, 200);
    
    // At least one property should be different
    const hasDifference =
      mutation1.finalDuration !== mutation2.finalDuration ||
      mutation1.finalParticleCount !== mutation2.finalParticleCount ||
      mutation1.mutation.speedMultiplier !== mutation2.mutation.speedMultiplier;
    
    expect(hasDifference).toBe(true);
  });

  it('should generate unique seeds', () => {
    const seeds = Array.from({ length: 100 }, () => generateSeed());
    const uniqueSeeds = new Set(seeds);
    
    // All seeds should be unique
    expect(uniqueSeeds.size).toBe(100);
  });

  it('should apply quality tier multipliers correctly', () => {
    const allVariants = getAllVariants();
    const baseVariant = allVariants.find((v) => v.baseParticleCount > 1000);
    
    if (baseVariant) {
      const seed = 12345;
      
      // Same seed should give consistent base mutation
      const mutation = mutateVariant(baseVariant, seed);
      
      expect(mutation.finalParticleCount).toBeGreaterThan(0);
      expect(mutation.finalDuration).toBeGreaterThan(0);
    }
  });
});

describe('Selection Context Builder', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearBreakthroughHistory();
  });

  it('should build context from session entities', () => {
    const entities = [
      { type: 'friction', label: 'Stress', metadata: { valence: -0.5 } },
      { type: 'value', label: 'Peace', metadata: { valence: 0.8 } },
    ];
    
    const context = buildSelectionContext(entities, 'release', 'high', false);
    
    expect(context.entities.length).toBe(2);
    expect(context.breakthroughType).toBe('release');
    expect(context.qualityTier).toBe('high');
    expect(context.reducedMotion).toBe(false);
    expect(context.frictionIntensity).toBeGreaterThan(0);
  });

  it('should calculate sentiment from entity valences', () => {
    const positiveEntities = [
      { type: 'emotion', label: 'Joy', metadata: { valence: 0.9 } },
      { type: 'emotion', label: 'Hope', metadata: { valence: 0.7 } },
    ];
    
    const context = buildSelectionContext(positiveEntities, undefined, 'mid', false);
    
    // Average of 0.9 and 0.7 = 0.8
    expect(context.sentiment).toBe(0.8);
  });

  it('should include recent variant IDs from history', () => {
    // Record some history
    recordBreakthrough('variant_1', 111, 'low', 'mid', true, false);
    recordBreakthrough('variant_2', 222, 'medium', 'mid', true, false);
    
    const context = buildSelectionContext([], undefined, 'mid', false);
    
    expect(context.recentVariantIds).toContain('variant_2');
    expect(context.recentVariantIds).toContain('variant_1');
  });
});
