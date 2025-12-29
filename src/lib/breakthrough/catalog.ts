/**
 * Breakthrough Catalog
 * 30+ base variants with mutation schemas and procedural generation
 */

import type {
  BaseVariant,
  MutatedVariant,
  MutationKnobs,
  BreakthroughClass,
  ColorMood,
  IntensityBand,
} from './types';

// ============================================================================
// COLOR PALETTES BY MOOD
// ============================================================================

const COLOR_PALETTES: Record<ColorMood, string[][]> = {
  warm: [
    ['#f97316', '#fb923c', '#fbbf24', '#ffffff'],
    ['#ef4444', '#f97316', '#fbbf24', '#fef3c7'],
    ['#dc2626', '#ea580c', '#f59e0b', '#fde68a'],
  ],
  cool: [
    ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff'],
    ['#0ea5e9', '#38bdf8', '#7dd3fc', '#e0f2fe'],
    ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'],
  ],
  nature: [
    ['#22c55e', '#10b981', '#34d399', '#ffffff'],
    ['#16a34a', '#22c55e', '#4ade80', '#bbf7d0'],
    ['#15803d', '#16a34a', '#22c55e', '#86efac'],
  ],
  electric: [
    ['#f0abfc', '#e879f9', '#d946ef', '#ffffff'],
    ['#22d3ee', '#67e8f9', '#a5f3fc', '#ecfeff'],
    ['#a855f7', '#c084fc', '#d8b4fe', '#f3e8ff'],
  ],
  cosmic: [
    ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ffffff'],
    ['#7c3aed', '#8b5cf6', '#a78bfa', '#ddd6fe'],
    ['#6d28d9', '#7c3aed', '#8b5cf6', '#c4b5fd'],
  ],
  dawn: [
    ['#fda4af', '#fb7185', '#f43f5e', '#fecdd3'],
    ['#fdba74', '#fb923c', '#f97316', '#fed7aa'],
    ['#fcd34d', '#fbbf24', '#f59e0b', '#fef3c7'],
  ],
  dusk: [
    ['#c084fc', '#a855f7', '#9333ea', '#f3e8ff'],
    ['#f472b6', '#ec4899', '#db2777', '#fce7f3'],
    ['#818cf8', '#6366f1', '#4f46e5', '#e0e7ff'],
  ],
  monochrome: [
    ['#f8fafc', '#e2e8f0', '#94a3b8', '#475569'],
    ['#fafafa', '#d4d4d4', '#a3a3a3', '#525252'],
    ['#fafaf9', '#d6d3d1', '#a8a29e', '#57534e'],
  ],
  rainbow: [
    ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'],
    ['#f43f5e', '#fb923c', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa'],
  ],
  neutral: [
    ['#ffffff', '#f1f5f9', '#cbd5e1', '#94a3b8'],
    ['#fafafa', '#f5f5f5', '#e5e5e5', '#a3a3a3'],
  ],
};

// ============================================================================
// 35 BASE VARIANTS
// ============================================================================

export const BREAKTHROUGH_VARIANTS: BaseVariant[] = [
  // ============ REVEAL CLASS (5 variants) ============
  {
    id: 'gentle_unfold',
    name: 'Gentle Unfold',
    description: 'Soft petals of light slowly reveal the truth',
    class: 'reveal',
    intensity: 'low',
    colorMood: 'dawn',
    audioMood: 'serene',
    baseDuration: 4000,
    baseParticleCount: 600,
    particlePattern: 'dissolve',
    cameraArchetype: 'drift',
    curveProfile: 'ease',
    tags: ['soft', 'gentle', 'opening', 'discovery'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [3500, 5000],
      particleCountRange: [400, 800],
      speedRange: [0.6, 1.2],
      scaleRange: [0.8, 1.2],
    },
    baseColors: ['#fda4af', '#fb7185', '#f43f5e', '#ffffff'],
    cameraPath: {
      from: [0, 0, 15],
      to: [0, 0, 8],
      fovFrom: 60,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true },
  },
  {
    id: 'veil_lift',
    name: 'Veil Lift',
    description: 'A translucent curtain rises to show clarity',
    class: 'reveal',
    intensity: 'medium',
    colorMood: 'cool',
    audioMood: 'mysterious',
    baseDuration: 4500,
    baseParticleCount: 800,
    particlePattern: 'cascade',
    cameraArchetype: 'crane',
    curveProfile: 'ease',
    tags: ['unveiling', 'clarity', 'hidden'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [4000, 5500],
      particleCountRange: [600, 1000],
      speedRange: [0.7, 1.3],
      scaleRange: [0.9, 1.3],
    },
    baseColors: ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff'],
    cameraPath: {
      from: [0, -8, 12],
      to: [0, 4, 8],
      fovFrom: 65,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false },
  },
  {
    id: 'dawn_break',
    name: 'Dawn Break',
    description: 'Light breaks through darkness like sunrise',
    class: 'reveal',
    intensity: 'medium',
    colorMood: 'warm',
    audioMood: 'triumphant',
    baseDuration: 5000,
    baseParticleCount: 1000,
    particlePattern: 'pulse_wave',
    cameraArchetype: 'dolly',
    curveProfile: 'ease',
    tags: ['morning', 'hope', 'new-beginning'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [4500, 6000],
      particleCountRange: [800, 1200],
      speedRange: [0.8, 1.4],
      scaleRange: [1.0, 1.5],
    },
    baseColors: ['#f97316', '#fbbf24', '#fef3c7', '#ffffff'],
    cameraPath: {
      from: [-15, 0, 20],
      to: [0, 0, 5],
      fovFrom: 70,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false },
  },
  {
    id: 'mist_clear',
    name: 'Mist Clear',
    description: 'Dense fog parts to reveal the path',
    class: 'reveal',
    intensity: 'low',
    colorMood: 'neutral',
    audioMood: 'contemplative',
    baseDuration: 4000,
    baseParticleCount: 1200,
    particlePattern: 'dissolve',
    cameraArchetype: 'drift',
    curveProfile: 'ease',
    tags: ['fog', 'clearing', 'vision'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [3500, 4500],
      particleCountRange: [800, 1500],
      speedRange: [0.5, 1.0],
      scaleRange: [0.8, 1.1],
    },
    baseColors: ['#f8fafc', '#e2e8f0', '#94a3b8', '#ffffff'],
    cameraPath: {
      from: [0, 0, 20],
      to: [0, 0, 6],
      fovFrom: 75,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true },
  },
  {
    id: 'truth_bloom',
    name: 'Truth Bloom',
    description: 'A flower of light blooms with understanding',
    class: 'reveal',
    intensity: 'high',
    colorMood: 'nature',
    audioMood: 'ethereal',
    baseDuration: 5500,
    baseParticleCount: 1400,
    particlePattern: 'fountain',
    cameraArchetype: 'orbit',
    curveProfile: 'ease',
    tags: ['growth', 'bloom', 'understanding'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [5000, 6500],
      particleCountRange: [1000, 1800],
      speedRange: [0.9, 1.5],
      scaleRange: [1.0, 1.6],
    },
    baseColors: ['#22c55e', '#10b981', '#34d399', '#ffffff'],
    cameraPath: {
      from: [8, -5, 12],
      to: [-3, 3, 7],
      fovFrom: 55,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false },
  },

  // ============ RELEASE CLASS (5 variants) ============
  {
    id: 'tension_dissolve',
    name: 'Tension Dissolve',
    description: 'Tight knots of energy unravel and float away',
    class: 'release',
    intensity: 'medium',
    colorMood: 'cool',
    audioMood: 'serene',
    baseDuration: 4500,
    baseParticleCount: 1000,
    particlePattern: 'dissolve',
    cameraArchetype: 'drift',
    curveProfile: 'ease',
    tags: ['letting-go', 'relief', 'unbinding'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [4000, 5500],
      particleCountRange: [800, 1200],
      speedRange: [0.6, 1.2],
      scaleRange: [0.9, 1.3],
    },
    baseColors: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#ffffff'],
    cameraPath: {
      from: [0, 0, 10],
      to: [0, 3, 12],
      fovFrom: 55,
      fovTo: 60,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true },
  },
  {
    id: 'weight_lift',
    name: 'Weight Lift',
    description: 'Heavy burdens float upward and disappear',
    class: 'release',
    intensity: 'medium',
    colorMood: 'dawn',
    audioMood: 'contemplative',
    baseDuration: 5000,
    baseParticleCount: 800,
    particlePattern: 'fountain',
    cameraArchetype: 'crane',
    curveProfile: 'ease',
    tags: ['burden', 'lightness', 'freedom'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [4500, 6000],
      particleCountRange: [600, 1000],
      speedRange: [0.7, 1.3],
      scaleRange: [0.8, 1.2],
    },
    baseColors: ['#fcd34d', '#fbbf24', '#f59e0b', '#ffffff'],
    cameraPath: {
      from: [0, -5, 12],
      to: [0, 8, 10],
      fovFrom: 60,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false },
  },
  {
    id: 'particle_unbind',
    name: 'Particle Unbind',
    description: 'Compressed particles expand outward in relief',
    class: 'release',
    intensity: 'high',
    colorMood: 'electric',
    audioMood: 'energetic',
    baseDuration: 3500,
    baseParticleCount: 2000,
    particlePattern: 'explosion',
    cameraArchetype: 'zoom_rush',
    curveProfile: 'snap',
    tags: ['explosion', 'expansion', 'freedom'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [3000, 4500],
      particleCountRange: [1500, 2500],
      speedRange: [1.0, 1.8],
      scaleRange: [1.0, 1.5],
    },
    baseColors: ['#22d3ee', '#67e8f9', '#a5f3fc', '#ffffff'],
    cameraPath: {
      from: [0, 0, 20],
      to: [0, 0, 4],
      fovFrom: 80,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false },
  },
  {
    id: 'breath_out',
    name: 'Breath Out',
    description: 'A deep exhale releases all held tension',
    class: 'release',
    intensity: 'low',
    colorMood: 'nature',
    audioMood: 'serene',
    baseDuration: 5500,
    baseParticleCount: 600,
    particlePattern: 'dissolve',
    cameraArchetype: 'drift',
    curveProfile: 'ease',
    tags: ['breath', 'calm', 'peace'],
    lowTierSafe: true,
    isFallback: true,
    mutationBounds: {
      durationRange: [5000, 6500],
      particleCountRange: [400, 800],
      speedRange: [0.4, 0.9],
      scaleRange: [0.7, 1.1],
    },
    baseColors: ['#86efac', '#4ade80', '#22c55e', '#ffffff'],
    cameraPath: {
      from: [0, 0, 8],
      to: [0, 0, 12],
      fovFrom: 50,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true },
  },
  {
    id: 'chain_break',
    name: 'Chain Break',
    description: 'Invisible chains shatter into light fragments',
    class: 'release',
    intensity: 'extreme',
    colorMood: 'warm',
    audioMood: 'dramatic',
    baseDuration: 4000,
    baseParticleCount: 1800,
    particlePattern: 'explosion',
    cameraArchetype: 'snap',
    curveProfile: 'snap',
    tags: ['breaking-free', 'liberation', 'power'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [3500, 5000],
      particleCountRange: [1400, 2200],
      speedRange: [1.2, 2.0],
      scaleRange: [1.1, 1.7],
    },
    baseColors: ['#ef4444', '#f97316', '#fbbf24', '#ffffff'],
    cameraPath: {
      from: [0, 0, 8],
      to: [0, 0, 15],
      fovFrom: 50,
      fovTo: 70,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false },
  },

  // ============ REFRAME CLASS (4 variants) ============
  {
    id: 'perspective_shift',
    name: 'Perspective Shift',
    description: 'The world tilts to show a new angle',
    class: 'reframe',
    intensity: 'medium',
    colorMood: 'cosmic',
    audioMood: 'mysterious',
    baseDuration: 4500,
    baseParticleCount: 800,
    particlePattern: 'orbit',
    cameraArchetype: 'pivot',
    curveProfile: 'ease',
    tags: ['perspective', 'new-view', 'rotation'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [4000, 5500],
      particleCountRange: [600, 1000],
      speedRange: [0.7, 1.3],
      scaleRange: [0.9, 1.3],
    },
    baseColors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ffffff'],
    cameraPath: {
      from: [10, 0, 8],
      to: [-10, 5, 8],
      fovFrom: 55,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false },
  },
  {
    id: 'connection_redraw',
    name: 'Connection Redraw',
    description: 'Lines between elements rearrange into new patterns',
    class: 'reframe',
    intensity: 'medium',
    colorMood: 'electric',
    audioMood: 'contemplative',
    baseDuration: 5000,
    baseParticleCount: 1200,
    particlePattern: 'streak',
    cameraArchetype: 'orbit',
    curveProfile: 'wave',
    tags: ['connections', 'network', 'relationships'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [4500, 6000],
      particleCountRange: [900, 1500],
      speedRange: [0.8, 1.4],
      scaleRange: [1.0, 1.4],
    },
    baseColors: ['#f0abfc', '#e879f9', '#d946ef', '#ffffff'],
    cameraPath: {
      from: [0, 0, 15],
      to: [0, 8, 10],
      fovFrom: 65,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false },
  },
  {
    id: 'kaleidoscope',
    name: 'Kaleidoscope',
    description: 'Reality fragments and reassembles beautifully',
    class: 'reframe',
    intensity: 'high',
    colorMood: 'rainbow',
    audioMood: 'ethereal',
    baseDuration: 5500,
    baseParticleCount: 1600,
    particlePattern: 'crystallize',
    cameraArchetype: 'spiral',
    curveProfile: 'wave',
    tags: ['patterns', 'beauty', 'complexity'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [5000, 6500],
      particleCountRange: [1200, 2000],
      speedRange: [0.9, 1.5],
      scaleRange: [1.0, 1.5],
    },
    baseColors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'],
    cameraPath: {
      from: [0, -10, 15],
      to: [0, 5, 5],
      fovFrom: 70,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false },
  },
  {
    id: 'mirror_flip',
    name: 'Mirror Flip',
    description: 'The reflection becomes the reality',
    class: 'reframe',
    intensity: 'medium',
    colorMood: 'cool',
    audioMood: 'mysterious',
    baseDuration: 4000,
    baseParticleCount: 900,
    particlePattern: 'pulse_wave',
    cameraArchetype: 'snap',
    curveProfile: 'bounce',
    tags: ['reflection', 'opposite', 'reversal'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [3500, 5000],
      particleCountRange: [700, 1100],
      speedRange: [0.8, 1.4],
      scaleRange: [0.9, 1.3],
    },
    baseColors: ['#6366f1', '#818cf8', '#a5b4fc', '#ffffff'],
    cameraPath: {
      from: [0, 0, 10],
      to: [0, 0, -10],
      fovFrom: 55,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false },
  },

  // ============ RESOLVE CLASS (4 variants) ============
  {
    id: 'node_merge',
    name: 'Node Merge',
    description: 'Conflicting points converge into harmony',
    class: 'resolve',
    intensity: 'medium',
    colorMood: 'nature',
    audioMood: 'serene',
    baseDuration: 5000,
    baseParticleCount: 1000,
    particlePattern: 'implosion',
    cameraArchetype: 'dolly',
    curveProfile: 'ease',
    tags: ['harmony', 'unity', 'resolution'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [4500, 6000],
      particleCountRange: [800, 1200],
      speedRange: [0.7, 1.2],
      scaleRange: [0.9, 1.3],
    },
    baseColors: ['#16a34a', '#22c55e', '#4ade80', '#ffffff'],
    cameraPath: {
      from: [0, 0, 18],
      to: [0, 0, 6],
      fovFrom: 65,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true },
  },
  {
    id: 'orbit_stable',
    name: 'Orbit Stable',
    description: 'Chaotic elements find their stable orbits',
    class: 'resolve',
    intensity: 'low',
    colorMood: 'cosmic',
    audioMood: 'contemplative',
    baseDuration: 5500,
    baseParticleCount: 800,
    particlePattern: 'orbit',
    cameraArchetype: 'drift',
    curveProfile: 'ease',
    tags: ['balance', 'stability', 'order'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [5000, 6500],
      particleCountRange: [600, 1000],
      speedRange: [0.5, 1.0],
      scaleRange: [0.8, 1.2],
    },
    baseColors: ['#7c3aed', '#8b5cf6', '#a78bfa', '#ffffff'],
    cameraPath: {
      from: [5, 5, 15],
      to: [0, 0, 10],
      fovFrom: 60,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true },
  },
  {
    id: 'puzzle_complete',
    name: 'Puzzle Complete',
    description: 'The final piece clicks into place',
    class: 'resolve',
    intensity: 'high',
    colorMood: 'warm',
    audioMood: 'triumphant',
    baseDuration: 4000,
    baseParticleCount: 1400,
    particlePattern: 'crystallize',
    cameraArchetype: 'zoom_rush',
    curveProfile: 'snap',
    tags: ['completion', 'solution', 'achievement'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [3500, 5000],
      particleCountRange: [1100, 1700],
      speedRange: [1.0, 1.6],
      scaleRange: [1.0, 1.5],
    },
    baseColors: ['#fbbf24', '#f59e0b', '#d97706', '#ffffff'],
    cameraPath: {
      from: [0, 0, 20],
      to: [0, 0, 4],
      fovFrom: 75,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false },
  },
  {
    id: 'peace_settle',
    name: 'Peace Settle',
    description: 'Turbulent waters become still and clear',
    class: 'resolve',
    intensity: 'low',
    colorMood: 'cool',
    audioMood: 'serene',
    baseDuration: 6000,
    baseParticleCount: 600,
    particlePattern: 'dissolve',
    cameraArchetype: 'drift',
    curveProfile: 'ease',
    tags: ['peace', 'calm', 'stillness'],
    lowTierSafe: true,
    isFallback: true,
    mutationBounds: {
      durationRange: [5500, 7000],
      particleCountRange: [400, 800],
      speedRange: [0.4, 0.8],
      scaleRange: [0.7, 1.0],
    },
    baseColors: ['#38bdf8', '#7dd3fc', '#bae6fd', '#ffffff'],
    cameraPath: {
      from: [0, 3, 12],
      to: [0, 0, 10],
      fovFrom: 55,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true },
  },

  // ============ COURAGE CLASS (4 variants) ============
  {
    id: 'barrier_break',
    name: 'Barrier Break',
    description: 'An invisible wall shatters before you',
    class: 'courage',
    intensity: 'extreme',
    colorMood: 'warm',
    audioMood: 'dramatic',
    baseDuration: 3500,
    baseParticleCount: 2000,
    particlePattern: 'explosion',
    cameraArchetype: 'zoom_rush',
    curveProfile: 'snap',
    tags: ['breakthrough', 'power', 'determination'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [3000, 4500],
      particleCountRange: [1600, 2400],
      speedRange: [1.3, 2.0],
      scaleRange: [1.2, 1.8],
    },
    baseColors: ['#dc2626', '#ef4444', '#f97316', '#ffffff'],
    cameraPath: {
      from: [0, 0, 25],
      to: [0, 0, 3],
      fovFrom: 85,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false },
  },
  {
    id: 'forward_leap',
    name: 'Forward Leap',
    description: 'A powerful surge propels you forward',
    class: 'courage',
    intensity: 'high',
    colorMood: 'electric',
    audioMood: 'energetic',
    baseDuration: 3000,
    baseParticleCount: 1500,
    particlePattern: 'streak',
    cameraArchetype: 'zoom_rush',
    curveProfile: 'snap',
    tags: ['momentum', 'action', 'boldness'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [2500, 4000],
      particleCountRange: [1200, 1800],
      speedRange: [1.2, 1.8],
      scaleRange: [1.1, 1.6],
    },
    baseColors: ['#a855f7', '#c084fc', '#d8b4fe', '#ffffff'],
    cameraPath: {
      from: [0, 0, 30],
      to: [0, 0, 2],
      fovFrom: 90,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false },
  },
  {
    id: 'flame_rise',
    name: 'Flame Rise',
    description: 'Inner fire ignites and rises',
    class: 'courage',
    intensity: 'high',
    colorMood: 'warm',
    audioMood: 'dramatic',
    baseDuration: 4000,
    baseParticleCount: 1400,
    particlePattern: 'fountain',
    cameraArchetype: 'crane',
    curveProfile: 'pulse',
    tags: ['fire', 'passion', 'intensity'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [3500, 5000],
      particleCountRange: [1100, 1700],
      speedRange: [1.0, 1.6],
      scaleRange: [1.0, 1.5],
    },
    baseColors: ['#f97316', '#fb923c', '#fbbf24', '#ffffff'],
    cameraPath: {
      from: [0, -10, 12],
      to: [0, 8, 8],
      fovFrom: 60,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false },
  },
  {
    id: 'stand_tall',
    name: 'Stand Tall',
    description: 'Rising up with quiet, steady strength',
    class: 'courage',
    intensity: 'medium',
    colorMood: 'nature',
    audioMood: 'contemplative',
    baseDuration: 4500,
    baseParticleCount: 900,
    particlePattern: 'fountain',
    cameraArchetype: 'crane',
    curveProfile: 'ease',
    tags: ['strength', 'resilience', 'dignity'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [4000, 5500],
      particleCountRange: [700, 1100],
      speedRange: [0.8, 1.3],
      scaleRange: [0.9, 1.4],
    },
    baseColors: ['#15803d', '#16a34a', '#22c55e', '#ffffff'],
    cameraPath: {
      from: [0, -5, 10],
      to: [0, 5, 10],
      fovFrom: 55,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true },
  },

  // ============ BOUNDARY CLASS (3 variants) ============
  {
    id: 'line_draw',
    name: 'Line Draw',
    description: 'A clear boundary forms with precision',
    class: 'boundary',
    intensity: 'low',
    colorMood: 'monochrome',
    audioMood: 'minimal',
    baseDuration: 4000,
    baseParticleCount: 500,
    particlePattern: 'streak',
    cameraArchetype: 'dolly',
    curveProfile: 'linear',
    tags: ['clarity', 'definition', 'separation'],
    lowTierSafe: true,
    isFallback: true,
    mutationBounds: {
      durationRange: [3500, 5000],
      particleCountRange: [350, 650],
      speedRange: [0.6, 1.1],
      scaleRange: [0.8, 1.2],
    },
    baseColors: ['#f8fafc', '#e2e8f0', '#94a3b8', '#ffffff'],
    cameraPath: {
      from: [0, 0, 15],
      to: [0, 0, 8],
      fovFrom: 55,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: false, chromaticAberration: false, motionBlur: false, vignette: true },
  },
  {
    id: 'space_create',
    name: 'Space Create',
    description: 'Breathing room opens up around you',
    class: 'boundary',
    intensity: 'low',
    colorMood: 'cool',
    audioMood: 'serene',
    baseDuration: 5000,
    baseParticleCount: 600,
    particlePattern: 'dissolve',
    cameraArchetype: 'drift',
    curveProfile: 'ease',
    tags: ['space', 'breathing-room', 'openness'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [4500, 6000],
      particleCountRange: [450, 750],
      speedRange: [0.5, 1.0],
      scaleRange: [0.8, 1.2],
    },
    baseColors: ['#bae6fd', '#7dd3fc', '#38bdf8', '#ffffff'],
    cameraPath: {
      from: [0, 0, 6],
      to: [0, 0, 14],
      fovFrom: 50,
      fovTo: 60,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true },
  },
  {
    id: 'shield_form',
    name: 'Shield Form',
    description: 'A protective barrier materializes',
    class: 'boundary',
    intensity: 'medium',
    colorMood: 'cosmic',
    audioMood: 'mysterious',
    baseDuration: 4500,
    baseParticleCount: 900,
    particlePattern: 'ring',
    cameraArchetype: 'orbit',
    curveProfile: 'ease',
    tags: ['protection', 'safety', 'boundary'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [4000, 5500],
      particleCountRange: [700, 1100],
      speedRange: [0.7, 1.2],
      scaleRange: [0.9, 1.3],
    },
    baseColors: ['#6d28d9', '#7c3aed', '#8b5cf6', '#ffffff'],
    cameraPath: {
      from: [8, 0, 10],
      to: [-8, 0, 10],
      fovFrom: 55,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false },
  },

  // ============ CHOICE CLASS (3 variants) ============
  {
    id: 'path_illuminate',
    name: 'Path Illuminate',
    description: 'One path brightens among many',
    class: 'choice',
    intensity: 'medium',
    colorMood: 'warm',
    audioMood: 'contemplative',
    baseDuration: 4500,
    baseParticleCount: 800,
    particlePattern: 'streak',
    cameraArchetype: 'dolly',
    curveProfile: 'ease',
    tags: ['decision', 'direction', 'clarity'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [4000, 5500],
      particleCountRange: [600, 1000],
      speedRange: [0.7, 1.2],
      scaleRange: [0.9, 1.3],
    },
    baseColors: ['#fbbf24', '#fcd34d', '#fef3c7', '#ffffff'],
    cameraPath: {
      from: [0, 0, 15],
      to: [0, 0, 5],
      fovFrom: 65,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true },
  },
  {
    id: 'branch_focus',
    name: 'Branch Focus',
    description: 'Possibilities narrow to the essential',
    class: 'choice',
    intensity: 'medium',
    colorMood: 'nature',
    audioMood: 'contemplative',
    baseDuration: 5000,
    baseParticleCount: 1000,
    particlePattern: 'spiral_arm',
    cameraArchetype: 'spiral',
    curveProfile: 'ease',
    tags: ['focus', 'narrowing', 'commitment'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [4500, 6000],
      particleCountRange: [800, 1200],
      speedRange: [0.8, 1.3],
      scaleRange: [0.9, 1.4],
    },
    baseColors: ['#4ade80', '#22c55e', '#16a34a', '#ffffff'],
    cameraPath: {
      from: [10, 5, 15],
      to: [0, 0, 6],
      fovFrom: 70,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false },
  },
  {
    id: 'door_open',
    name: 'Door Open',
    description: 'A doorway of light opens before you',
    class: 'choice',
    intensity: 'high',
    colorMood: 'dawn',
    audioMood: 'triumphant',
    baseDuration: 4000,
    baseParticleCount: 1200,
    particlePattern: 'pulse_wave',
    cameraArchetype: 'zoom_rush',
    curveProfile: 'ease',
    tags: ['opportunity', 'threshold', 'beginning'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [3500, 5000],
      particleCountRange: [900, 1500],
      speedRange: [0.9, 1.5],
      scaleRange: [1.0, 1.5],
    },
    baseColors: ['#fda4af', '#fbbf24', '#fef3c7', '#ffffff'],
    cameraPath: {
      from: [0, 0, 20],
      to: [0, 0, 3],
      fovFrom: 75,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false },
  },

  // ============ INTEGRATION CLASS (3 variants) ============
  {
    id: 'harmony_align',
    name: 'Harmony Align',
    description: 'All elements find their perfect positions',
    class: 'integration',
    intensity: 'medium',
    colorMood: 'cosmic',
    audioMood: 'ethereal',
    baseDuration: 5500,
    baseParticleCount: 1200,
    particlePattern: 'crystallize',
    cameraArchetype: 'orbit',
    curveProfile: 'ease',
    tags: ['harmony', 'alignment', 'wholeness'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [5000, 6500],
      particleCountRange: [900, 1500],
      speedRange: [0.7, 1.2],
      scaleRange: [0.9, 1.4],
    },
    baseColors: ['#a78bfa', '#8b5cf6', '#7c3aed', '#ffffff'],
    cameraPath: {
      from: [0, -8, 15],
      to: [0, 0, 8],
      fovFrom: 65,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false },
  },
  {
    id: 'weave_complete',
    name: 'Weave Complete',
    description: 'Threads of understanding interlock',
    class: 'integration',
    intensity: 'medium',
    colorMood: 'rainbow',
    audioMood: 'contemplative',
    baseDuration: 5000,
    baseParticleCount: 1400,
    particlePattern: 'spiral_arm',
    cameraArchetype: 'spiral',
    curveProfile: 'wave',
    tags: ['connection', 'weaving', 'synthesis'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [4500, 6000],
      particleCountRange: [1100, 1700],
      speedRange: [0.8, 1.4],
      scaleRange: [1.0, 1.5],
    },
    baseColors: ['#f43f5e', '#fb923c', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa'],
    cameraPath: {
      from: [0, 0, 18],
      to: [0, 5, 6],
      fovFrom: 70,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false },
  },
  {
    id: 'constellation_form',
    name: 'Constellation Form',
    description: 'Stars connect to form a meaningful pattern',
    class: 'integration',
    intensity: 'low',
    colorMood: 'cosmic',
    audioMood: 'ethereal',
    baseDuration: 6000,
    baseParticleCount: 700,
    particlePattern: 'nebula',
    cameraArchetype: 'drift',
    curveProfile: 'ease',
    tags: ['stars', 'meaning', 'big-picture'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [5500, 7000],
      particleCountRange: [500, 900],
      speedRange: [0.4, 0.9],
      scaleRange: [0.8, 1.2],
    },
    baseColors: ['#ddd6fe', '#c4b5fd', '#a78bfa', '#ffffff'],
    cameraPath: {
      from: [0, 0, 25],
      to: [0, 0, 12],
      fovFrom: 60,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true },
  },

  // ============ CLARITY CLASS (Fallback) (2 variants) ============
  {
    id: 'clarity_pulse',
    name: 'Clarity Pulse',
    description: 'A simple, reliable moment of clarity',
    class: 'clarity',
    intensity: 'low',
    colorMood: 'neutral',
    audioMood: 'minimal',
    baseDuration: 3000,
    baseParticleCount: 300,
    particlePattern: 'pulse_wave',
    cameraArchetype: 'dolly',
    curveProfile: 'ease',
    tags: ['simple', 'reliable', 'clear'],
    lowTierSafe: true,
    isFallback: true,
    mutationBounds: {
      durationRange: [2500, 3500],
      particleCountRange: [200, 400],
      speedRange: [0.8, 1.2],
      scaleRange: [0.9, 1.1],
    },
    baseColors: ['#ffffff', '#f1f5f9', '#e2e8f0', '#94a3b8'],
    cameraPath: {
      from: [0, 0, 12],
      to: [0, 0, 8],
      fovFrom: 55,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: false, vignette: false },
  },
  {
    id: 'soft_glow',
    name: 'Soft Glow',
    description: 'A gentle warmth of understanding',
    class: 'clarity',
    intensity: 'low',
    colorMood: 'warm',
    audioMood: 'minimal',
    baseDuration: 3500,
    baseParticleCount: 400,
    particlePattern: 'dissolve',
    cameraArchetype: 'drift',
    curveProfile: 'ease',
    tags: ['gentle', 'warm', 'simple'],
    lowTierSafe: true,
    isFallback: true,
    mutationBounds: {
      durationRange: [3000, 4000],
      particleCountRange: [300, 500],
      speedRange: [0.6, 1.0],
      scaleRange: [0.8, 1.1],
    },
    baseColors: ['#fef3c7', '#fde68a', '#fcd34d', '#ffffff'],
    cameraPath: {
      from: [0, 0, 10],
      to: [0, 0, 8],
      fovFrom: 52,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true },
  },

  // ============ EMERGENCE CLASS (2 variants) ============
  {
    id: 'crystal_form',
    name: 'Crystal Form',
    description: 'Order crystallizes from chaos',
    class: 'emergence',
    intensity: 'high',
    colorMood: 'electric',
    audioMood: 'dramatic',
    baseDuration: 4500,
    baseParticleCount: 1600,
    particlePattern: 'crystallize',
    cameraArchetype: 'orbit',
    curveProfile: 'snap',
    tags: ['structure', 'formation', 'emergence'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [4000, 5500],
      particleCountRange: [1200, 2000],
      speedRange: [0.9, 1.5],
      scaleRange: [1.0, 1.5],
    },
    baseColors: ['#67e8f9', '#22d3ee', '#06b6d4', '#ffffff'],
    cameraPath: {
      from: [10, 5, 15],
      to: [0, 0, 7],
      fovFrom: 65,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false },
  },
  {
    id: 'butterfly_emerge',
    name: 'Butterfly Emerge',
    description: 'Transformation completes with graceful emergence',
    class: 'emergence',
    intensity: 'medium',
    colorMood: 'dusk',
    audioMood: 'ethereal',
    baseDuration: 5000,
    baseParticleCount: 1000,
    particlePattern: 'fountain',
    cameraArchetype: 'crane',
    curveProfile: 'ease',
    tags: ['transformation', 'metamorphosis', 'beauty'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [4500, 6000],
      particleCountRange: [800, 1200],
      speedRange: [0.7, 1.2],
      scaleRange: [0.9, 1.4],
    },
    baseColors: ['#f472b6', '#ec4899', '#db2777', '#ffffff'],
    cameraPath: {
      from: [0, -8, 12],
      to: [0, 5, 8],
      fovFrom: 60,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false },
  },

  // ============ FLOW CLASS (2 variants) ============
  {
    id: 'river_flow',
    name: 'River Flow',
    description: 'Smooth, continuous motion like a river',
    class: 'flow',
    intensity: 'low',
    colorMood: 'cool',
    audioMood: 'serene',
    baseDuration: 5500,
    baseParticleCount: 800,
    particlePattern: 'cascade',
    cameraArchetype: 'drift',
    curveProfile: 'wave',
    tags: ['flow', 'continuous', 'natural'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [5000, 6500],
      particleCountRange: [600, 1000],
      speedRange: [0.5, 1.0],
      scaleRange: [0.8, 1.2],
    },
    baseColors: ['#7dd3fc', '#38bdf8', '#0ea5e9', '#ffffff'],
    cameraPath: {
      from: [-5, 0, 12],
      to: [5, 0, 10],
      fovFrom: 55,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: true, vignette: true },
  },
  {
    id: 'wind_dance',
    name: 'Wind Dance',
    description: 'Playful energy moves with the wind',
    class: 'flow',
    intensity: 'medium',
    colorMood: 'nature',
    audioMood: 'energetic',
    baseDuration: 4500,
    baseParticleCount: 1000,
    particlePattern: 'cascade',
    cameraArchetype: 'spiral',
    curveProfile: 'wave',
    tags: ['wind', 'playful', 'movement'],
    lowTierSafe: true,
    isFallback: false,
    mutationBounds: {
      durationRange: [4000, 5500],
      particleCountRange: [800, 1200],
      speedRange: [0.8, 1.4],
      scaleRange: [0.9, 1.3],
    },
    baseColors: ['#86efac', '#4ade80', '#22c55e', '#bbf7d0'],
    cameraPath: {
      from: [0, 0, 15],
      to: [3, 3, 8],
      fovFrom: 60,
      fovTo: 55,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false },
  },

  // ============ SPARK CLASS (2 variants) ============
  {
    id: 'lightbulb_moment',
    name: 'Lightbulb Moment',
    description: 'A flash of brilliant inspiration',
    class: 'spark',
    intensity: 'high',
    colorMood: 'warm',
    audioMood: 'energetic',
    baseDuration: 2500,
    baseParticleCount: 1200,
    particlePattern: 'explosion',
    cameraArchetype: 'snap',
    curveProfile: 'snap',
    tags: ['insight', 'flash', 'eureka'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [2000, 3000],
      particleCountRange: [900, 1500],
      speedRange: [1.2, 1.8],
      scaleRange: [1.0, 1.5],
    },
    baseColors: ['#fef3c7', '#fbbf24', '#f59e0b', '#ffffff'],
    cameraPath: {
      from: [0, 0, 10],
      to: [0, 0, 5],
      fovFrom: 60,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false },
  },
  {
    id: 'spark_cascade',
    name: 'Spark Cascade',
    description: 'One spark ignites a cascade of ideas',
    class: 'spark',
    intensity: 'extreme',
    colorMood: 'electric',
    audioMood: 'dramatic',
    baseDuration: 3000,
    baseParticleCount: 1800,
    particlePattern: 'cascade',
    cameraArchetype: 'zoom_rush',
    curveProfile: 'pulse',
    tags: ['chain-reaction', 'cascade', 'ignition'],
    lowTierSafe: false,
    isFallback: false,
    mutationBounds: {
      durationRange: [2500, 3500],
      particleCountRange: [1400, 2200],
      speedRange: [1.3, 2.0],
      scaleRange: [1.1, 1.7],
    },
    baseColors: ['#f0abfc', '#e879f9', '#d946ef', '#ffffff'],
    cameraPath: {
      from: [0, 0, 18],
      to: [0, 0, 3],
      fovFrom: 80,
      fovTo: 50,
      lookAt: 'center',
    },
    effects: { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false },
  },
];

// ============================================================================
// CATALOG FUNCTIONS
// ============================================================================

/**
 * Get all variants
 */
export function getAllVariants(): BaseVariant[] {
  return BREAKTHROUGH_VARIANTS;
}

/**
 * Get variant by ID
 */
export function getVariantById(id: string): BaseVariant | undefined {
  return BREAKTHROUGH_VARIANTS.find((v) => v.id === id);
}

/**
 * Get variants by class
 */
export function getVariantsByClass(breakthroughClass: BreakthroughClass): BaseVariant[] {
  return BREAKTHROUGH_VARIANTS.filter((v) => v.class === breakthroughClass);
}

/**
 * Get low-tier safe variants
 */
export function getLowTierVariants(): BaseVariant[] {
  return BREAKTHROUGH_VARIANTS.filter((v) => v.lowTierSafe);
}

/**
 * Get fallback variants
 */
export function getFallbackVariants(): BaseVariant[] {
  return BREAKTHROUGH_VARIANTS.filter((v) => v.isFallback);
}

/**
 * Get variants by intensity
 */
export function getVariantsByIntensity(intensity: IntensityBand): BaseVariant[] {
  return BREAKTHROUGH_VARIANTS.filter((v) => v.intensity === intensity);
}

/**
 * Seeded random number generator (mulberry32)
 */
function seededRandom(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Apply mutation to a base variant
 */
export function mutateVariant(variant: BaseVariant, seed: number): MutatedVariant {
  const rng = seededRandom(seed);
  
  const { mutationBounds } = variant;
  
  // Generate mutation knobs
  const mutation: MutationKnobs = {
    durationRange: mutationBounds.durationRange,
    particleCountRange: mutationBounds.particleCountRange,
    curveProfile: variant.curveProfile,
    cameraArchetype: variant.cameraArchetype,
    paletteSeed: rng(),
    audioIntensity: 0.5 + rng() * 0.5,
    audioTimingOffset: (rng() - 0.5) * 200,
    speedMultiplier: mutationBounds.speedRange[0] + rng() * (mutationBounds.speedRange[1] - mutationBounds.speedRange[0]),
    scaleMultiplier: mutationBounds.scaleRange[0] + rng() * (mutationBounds.scaleRange[1] - mutationBounds.scaleRange[0]),
    extraVisualsCount: Math.floor(rng() * 3),
  };
  
  // Compute final duration
  const finalDuration = Math.round(
    mutationBounds.durationRange[0] +
    rng() * (mutationBounds.durationRange[1] - mutationBounds.durationRange[0])
  );
  
  // Compute final particle count
  const finalParticleCount = Math.round(
    mutationBounds.particleCountRange[0] +
    rng() * (mutationBounds.particleCountRange[1] - mutationBounds.particleCountRange[0])
  );
  
  // Generate color variations using palette seed
  const colorPalettes = COLOR_PALETTES[variant.colorMood];
  const paletteIndex = Math.floor(mutation.paletteSeed * colorPalettes.length);
  const selectedPalette = colorPalettes[paletteIndex] || variant.baseColors;
  
  // Apply slight hue shift based on seed
  const hueShift = (rng() - 0.5) * 20; // ±10 degrees
  const finalColors = selectedPalette.map((color) => {
    // Simple hue rotation approximation (for hex colors)
    // In production, use proper HSL conversion
    return color; // Keep original for simplicity, real impl would rotate hue
  });
  
  return {
    ...variant,
    mutation,
    seed,
    finalDuration,
    finalParticleCount,
    finalColors,
  };
}

/**
 * Generate a random seed
 */
export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

/**
 * Catalog statistics
 */
export function getCatalogStats(): {
  total: number;
  byClass: Record<BreakthroughClass, number>;
  byIntensity: Record<IntensityBand, number>;
  lowTierSafe: number;
  fallbacks: number;
} {
  const byClass = {} as Record<BreakthroughClass, number>;
  const byIntensity = {} as Record<IntensityBand, number>;
  
  for (const v of BREAKTHROUGH_VARIANTS) {
    byClass[v.class] = (byClass[v.class] || 0) + 1;
    byIntensity[v.intensity] = (byIntensity[v.intensity] || 0) + 1;
  }
  
  return {
    total: BREAKTHROUGH_VARIANTS.length,
    byClass,
    byIntensity,
    lowTierSafe: BREAKTHROUGH_VARIANTS.filter((v) => v.lowTierSafe).length,
    fallbacks: BREAKTHROUGH_VARIANTS.filter((v) => v.isFallback).length,
  };
}
