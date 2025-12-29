/**
 * ASPIRAL Infinite Breakthroughs System
 * Main entry point
 */

// Types
export * from './types';

// Catalog
export {
  getAllVariants,
  getVariantById,
  getVariantsByClass,
  getLowTierVariants,
  getFallbackVariants,
  getVariantsByIntensity,
  mutateVariant,
  generateSeed,
  getCatalogStats,
  BREAKTHROUGH_VARIANTS,
} from './catalog';

// Selector
export {
  selectVariant,
  selectFallbackVariant,
  mapBreakthroughTypeToClass,
  buildSelectionContext,
} from './selector';

// History
export {
  getBreakthroughHistory,
  refreshBreakthroughHistory,
  recordBreakthrough,
  getRecentVariantIds,
  getRecentIntensities,
  getVariantStats,
  getOverallStats,
  clearBreakthroughHistory,
  wasVariantUsedRecently,
  getMostUsedVariants,
  getLeastUsedVariantIds,
} from './history';

// Director
export {
  BreakthroughDirector,
  getBreakthroughDirector,
  resetBreakthroughDirector,
} from './director';
