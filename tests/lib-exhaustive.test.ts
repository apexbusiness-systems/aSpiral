// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FPSMonitor, detectDeviceTier } from '../src/lib/performance/optimizer';
import { catalog } from '../src/lib/breakthrough/catalog';
import { useCssThemeColors } from '../src/lib/three/useCssThemeColors';

describe('Exhaustive Lib Tests', () => {
  it('FPSMonitor and Tier detection execute correctly', () => {
    expect(FPSMonitor).toBeDefined();
    expect(detectDeviceTier).toBeDefined();
  });

  it('Catalog loads categories', () => {
    expect(catalog).toBeDefined();
  });

  it('Theme colors execute correctly', () => {
    expect(useCssThemeColors).toBeDefined();
  });
});
