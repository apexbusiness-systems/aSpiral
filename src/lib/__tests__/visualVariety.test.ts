import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateSceneConfig,
  calculateEntityPosition,
  getColorByValence,
  getEntityVisualConfig,
  getConnectionColor
} from '../visualVariety';
import type { Entity } from '../types';

describe('Visual Variety Engine', () => {
  describe('generateSceneConfig', () => {
    it('generates config for spiral stage with few entities and neutral valence', () => {
      const entities: Entity[] = [
        { id: '1', type: 'problem', label: 'Test 1', createdAt: new Date(), updatedAt: new Date(), metadata: { valence: 0 } }
      ];
      const config = generateSceneConfig(entities, 'spiral');

      expect(config.camera.fov).toBe(60);
      expect(config.background.auroraIntensity).toBe(0.5);
      expect(config.lighting.color).toBe('#3b82f6');
      expect(config.particles.density).toBe(0);
      expect(config.layout.clustering).toBe(0.3);
    });

    it('generates config for aspiration stage', () => {
      const entities: Entity[] = [];
      const config = generateSceneConfig(entities, 'aspiration');

      expect(config.background.gradientStart).toBe('#0c1821');
      expect(config.background.auroraIntensity).toBe(0.8);
      expect(config.layout.clustering).toBe(0.8);
    });

    it('handles many entities and negative valence', () => {
      const entities: Entity[] = Array.from({ length: 12 }, (_, i) => ({
        id: String(i),
        type: 'problem',
        label: `Test ${i}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { valence: -0.8 }
      }));
      const config = generateSceneConfig(entities, 'processing');

      expect(config.camera.fov).toBe(75);
      expect(config.background.gradientStart).toBe('#1a0b2e');
      expect(config.lighting.color).toBe('#8b5cf6');
      expect(config.particles.speed).toBe(2);
      expect(config.layout.spread).toBe(5);
    });

    it('calculates average valence correctly', () => {
      const entities: Entity[] = [
        { id: '1', type: 'problem', label: '1', createdAt: new Date(), updatedAt: new Date(), metadata: { valence: 1 } },
        { id: '2', type: 'problem', label: '2', createdAt: new Date(), updatedAt: new Date(), metadata: { valence: -1 } },
        { id: '3', type: 'problem', label: '3', createdAt: new Date(), updatedAt: new Date(), metadata: { valence: 0.5 } },
        { id: '4', type: 'problem', label: '4', createdAt: new Date(), updatedAt: new Date() } // missing valence
      ];
      const config = generateSceneConfig(entities, 'spiral');
      // avg valence = (1 - 1 + 0.5) / 3 = 0.1666...
      expect(config.particles.density).toBeCloseTo(16.666, 1);
    });
  });

  describe('calculateEntityPosition', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('positions entity at center with zero jitter when valence is 0', () => {
      const pos = calculateEntityPosition('center', 0, 0, 10);
      // base center is [0,0,0]
      // angle = 0, radius = 1.5
      // spiralOffset = [1.5, 0, 0]
      // randomOffset = [0, 0, 0]
      // result = [0*0.3 + 1.5 + 0, 0*0.3 + 0 + 0, 0 + 0 + 0] = [1.5, 0, 0]
      expect(pos).toEqual([1.5, 0, 0]);
    });

    it('positions entity at upper_right with jitter', () => {
      const pos = calculateEntityPosition('upper_right', 1, 0, 10);
      // base upper_right is [2, 2, 0]
      // angle = 0, radius = 1.5
      // spiralOffset = [1.5, 0, 0]
      // jitter = 1 * 0.3 = 0.3
      // randomOffset = [(0.5 - 0.5) * 0.3, (0.5 - 0.5) * 0.3, (0.5 - 0.5) * 0.3] = [0, 0, 0]
      // result = [2*0.3 + 1.5 + 0, 2*0.3 + 0 + 0, 0 + 0 + 0] = [2.1, 0.6, 0]
      expect(pos).toEqual([2.1, 0.6, 0]);
    });

    it('uses center as fallback for unknown hint', () => {
      const pos = calculateEntityPosition('unknown', 0, 0, 10);
      expect(pos).toEqual([1.5, 0, 0]);
    });
  });

  describe('getColorByValence', () => {
    it('returns colors based on valence and type', () => {
      expect(getColorByValence(-0.6, 'problem')).toBe('#ef4444');
      expect(getColorByValence(-0.6, 'value')).toBe('#a855f7');
      expect(getColorByValence(0.6, 'grease')).toBe('#10b981');
      expect(getColorByValence(0.6, 'action')).toBe('#10b981');
      expect(getColorByValence(0.6, 'other')).toBe('#3b82f6');
      expect(getColorByValence(0, 'value')).toBe('#eab308');
      expect(getColorByValence(0, 'other')).toBe('#6b7280');
    });
  });

  describe('getEntityVisualConfig', () => {
    it('returns correct config for known types', () => {
      expect(getEntityVisualConfig('problem').geometry).toBe('cube');
      expect(getEntityVisualConfig('emotion').geometry).toBe('octahedron');
      expect(getEntityVisualConfig('value').geometry).toBe('cone');
      expect(getEntityVisualConfig('action').geometry).toBe('torus');
      expect(getEntityVisualConfig('friction').wireframe).toBe(true);
      expect(getEntityVisualConfig('grease').geometry).toBe('sphere');
    });

    it('returns default config for unknown type', () => {
      const config = getEntityVisualConfig('unknown');
      expect(config.geometry).toBe('sphere');
      expect(config.glow).toBe(false);
    });
  });

  describe('getConnectionColor', () => {
    it('returns correct color for known types', () => {
      expect(getConnectionColor('causes')).toBe('#ef4444');
      expect(getConnectionColor('opposes')).toBe('#dc2626');
      expect(getConnectionColor('blocks')).toBe('#f97316');
      expect(getConnectionColor('enables')).toBe('#10b981');
      expect(getConnectionColor('resolves')).toBe('#22c55e');
      expect(getConnectionColor('requires')).toBe('#3b82f6');
      expect(getConnectionColor('related')).toBe('#6b7280');
    });

    it('returns fallback color for unknown type', () => {
      expect(getConnectionColor('unknown')).toBe('#6b7280');
    });
  });
});
