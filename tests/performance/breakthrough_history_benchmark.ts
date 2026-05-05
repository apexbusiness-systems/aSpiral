import { getOverallStats, recordBreakthrough, clearBreakthroughHistory, getVariantStats } from '../../src/lib/breakthrough/history';
import { IntensityBand, QualityTier } from '../../src/lib/breakthrough/types';

// Mock localStorage for the benchmark
const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { for (const key in mockStorage) delete mockStorage[key]; },
  length: 0,
  key: (index: number) => Object.keys(mockStorage)[index] || null,
} as Storage;

function benchmark() {
  clearBreakthroughHistory();

  const intensityBands: IntensityBand[] = ['low', 'medium', 'high', 'extreme'];
  const qualityTiers: QualityTier[] = ['low', 'mid', 'high'];
  const variantIds = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'];

  console.log('--- Generating 100 history entries (MAX_HISTORY_ENTRIES) ---');
  for (let i = 0; i < 100; i++) {
    recordBreakthrough(
      variantIds[i % variantIds.length],
      i,
      intensityBands[i % intensityBands.length],
      qualityTiers[i % qualityTiers.length],
      i % 2 === 0,
      i % 5 === 0
    );
  }

  const iterations = 10000;

  console.log(`--- Running getOverallStats benchmark (${iterations} iterations) ---`);
  const startOverall = performance.now();
  for (let i = 0; i < iterations; i++) {
    getOverallStats();
  }
  const endOverall = performance.now();
  console.log(`getOverallStats total time: ${(endOverall - startOverall).toFixed(2)}ms`);
  console.log(`getOverallStats avg time: ${((endOverall - startOverall) / iterations).toFixed(4)}ms`);

  console.log(`--- Running getVariantStats benchmark (${iterations} iterations) ---`);
  const startVariant = performance.now();
  for (let i = 0; i < iterations; i++) {
    getVariantStats('v1');
  }
  const endVariant = performance.now();
  console.log(`getVariantStats total time: ${(endVariant - startVariant).toFixed(2)}ms`);
  console.log(`getVariantStats avg time: ${((endVariant - startVariant) / iterations).toFixed(4)}ms`);
}

benchmark();
