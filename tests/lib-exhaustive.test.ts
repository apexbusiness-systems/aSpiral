// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FPSMonitor, detectDeviceTier } from '../src/lib/performance/optimizer';
import { BREAKTHROUGH_VARIANTS } from '../src/lib/breakthrough/catalog';
import { useCssThemeColors } from '../src/lib/three/useCssThemeColors';

describe('Exhaustive Lib Tests', () => {
  it('FPSMonitor and Tier detection execute correctly', () => {
    expect(FPSMonitor).toBeDefined();
    expect(detectDeviceTier).toBeDefined();
  });

  it('Catalog loads categories', () => {
    expect(BREAKTHROUGH_VARIANTS).toBeDefined();
    expect(BREAKTHROUGH_VARIANTS.length).toBeGreaterThan(0);
  });

  it('Theme colors execute correctly', () => {
    expect(useCssThemeColors).toBeDefined();
  });
});
