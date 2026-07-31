import { secureMathRandom } from '@/lib/secureMathRandom';
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

function v( // NOSONAR
  id: string, name: string, description: string, cls: any, intensity: any,
  colorMood: any, audioMood: any, baseDuration: number, baseParticleCount: number,
  particlePattern: any, cameraArchetype: any, curveProfile: any, tags: string[],
  lowTierSafe: boolean, isFallback: boolean,
  durationRange: [number, number], particleCountRange: [number, number], speedRange: [number, number], scaleRange: [number, number],
  baseColors: string[], cameraPath: any, effects: any
): BaseVariant {
  return {
    id, name, description, class: cls, intensity, colorMood, audioMood, baseDuration, baseParticleCount,
    particlePattern, cameraArchetype, curveProfile, tags, lowTierSafe, isFallback,
    mutationBounds: { durationRange, particleCountRange, speedRange, scaleRange },
    baseColors, cameraPath, effects
  };
}
export const BREAKTHROUGH_VARIANTS: BaseVariant[] = [
  // ============ REVEAL CLASS (5 variants) ============
  v('gentle_unfold', 'Gentle Unfold', 'Soft petals of light slowly reveal the truth', 'reveal', 'low', 'dawn', 'serene', 4000, 600, 'dissolve', 'drift', 'ease', ['soft', 'gentle', 'opening', 'discovery'], true, false, [3500, 5000], [400, 800], [0.6, 1.2], [0.8, 1.2], ['#fda4af', '#fb7185', '#f43f5e', '#ffffff'], { from: [0, 0, 15], to: [0, 0, 8], fovFrom: 60, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),
  v('veil_lift', 'Veil Lift', 'A translucent curtain rises to show clarity', 'reveal', 'medium', 'cool', 'mysterious', 4500, 800, 'cascade', 'crane', 'ease', ['unveiling', 'clarity', 'hidden'], true, false, [4000, 5500], [600, 1000], [0.7, 1.3], [0.9, 1.3], ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff'], { from: [0, -8, 12], to: [0, 4, 8], fovFrom: 65, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false }),
  v('dawn_break', 'Dawn Break', 'Light breaks through darkness like sunrise', 'reveal', 'medium', 'warm', 'triumphant', 5000, 1000, 'pulse_wave', 'dolly', 'ease', ['morning', 'hope', 'new-beginning'], false, false, [4500, 6000], [800, 1200], [0.8, 1.4], [1.0, 1.5], ['#f97316', '#fbbf24', '#fef3c7', '#ffffff'], { from: [-15, 0, 20], to: [0, 0, 5], fovFrom: 70, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false }),
  v('mist_clear', 'Mist Clear', 'Dense fog parts to reveal the path', 'reveal', 'low', 'neutral', 'contemplative', 4000, 1200, 'dissolve', 'drift', 'ease', ['fog', 'clearing', 'vision'], true, false, [3500, 4500], [800, 1500], [0.5, 1.0], [0.8, 1.1], ['#f8fafc', '#e2e8f0', '#94a3b8', '#ffffff'], { from: [0, 0, 20], to: [0, 0, 6], fovFrom: 75, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),
  v('truth_bloom', 'Truth Bloom', 'A flower of light blooms with understanding', 'reveal', 'high', 'nature', 'ethereal', 5500, 1400, 'fountain', 'orbit', 'ease', ['growth', 'bloom', 'understanding'], false, false, [5000, 6500], [1000, 1800], [0.9, 1.5], [1.0, 1.6], ['#22c55e', '#10b981', '#34d399', '#ffffff'], { from: [8, -5, 12], to: [-3, 3, 7], fovFrom: 55, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false }),

  // ============ RELEASE CLASS (5 variants) ============
  v('tension_dissolve', 'Tension Dissolve', 'Tight knots of energy unravel and float away', 'release', 'medium', 'cool', 'serene', 4500, 1000, 'dissolve', 'drift', 'ease', ['letting-go', 'relief', 'unbinding'], true, false, [4000, 5500], [800, 1200], [0.6, 1.2], [0.9, 1.3], ['#0ea5e9', '#38bdf8', '#7dd3fc', '#ffffff'], { from: [0, 0, 10], to: [0, 3, 12], fovFrom: 55, fovTo: 60, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),
  v('weight_lift', 'Weight Lift', 'Heavy burdens float upward and disappear', 'release', 'medium', 'dawn', 'contemplative', 5000, 800, 'fountain', 'crane', 'ease', ['burden', 'lightness', 'freedom'], true, false, [4500, 6000], [600, 1000], [0.7, 1.3], [0.8, 1.2], ['#fcd34d', '#fbbf24', '#f59e0b', '#ffffff'], { from: [0, -5, 12], to: [0, 8, 10], fovFrom: 60, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false }),
  v('particle_unbind', 'Particle Unbind', 'Compressed particles expand outward in relief', 'release', 'high', 'electric', 'energetic', 3500, 2000, 'explosion', 'zoom_rush', 'snap', ['explosion', 'expansion', 'freedom'], false, false, [3000, 4500], [1500, 2500], [1.0, 1.8], [1.0, 1.5], ['#22d3ee', '#67e8f9', '#a5f3fc', '#ffffff'], { from: [0, 0, 20], to: [0, 0, 4], fovFrom: 80, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false }),
  v('breath_out', 'Breath Out', 'A deep exhale releases all held tension', 'release', 'low', 'nature', 'serene', 5500, 600, 'dissolve', 'drift', 'ease', ['breath', 'calm', 'peace'], true, true, [5000, 6500], [400, 800], [0.4, 0.9], [0.7, 1.1], ['#86efac', '#4ade80', '#22c55e', '#ffffff'], { from: [0, 0, 8], to: [0, 0, 12], fovFrom: 50, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),
  v('chain_break', 'Chain Break', 'Invisible chains shatter into light fragments', 'release', 'extreme', 'warm', 'dramatic', 4000, 1800, 'explosion', 'snap', 'snap', ['breaking-free', 'liberation', 'power'], false, false, [3500, 5000], [1400, 2200], [1.2, 2.0], [1.1, 1.7], ['#ef4444', '#f97316', '#fbbf24', '#ffffff'], { from: [0, 0, 8], to: [0, 0, 15], fovFrom: 50, fovTo: 70, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false }),

  // ============ REFRAME CLASS (4 variants) ============
  v('perspective_shift', 'Perspective Shift', 'The world tilts to show a new angle', 'reframe', 'medium', 'cosmic', 'mysterious', 4500, 800, 'orbit', 'pivot', 'ease', ['perspective', 'new-view', 'rotation'], true, false, [4000, 5500], [600, 1000], [0.7, 1.3], [0.9, 1.3], ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ffffff'], { from: [10, 0, 8], to: [-10, 5, 8], fovFrom: 55, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false }),
  v('connection_redraw', 'Connection Redraw', 'Lines between elements rearrange into new patterns', 'reframe', 'medium', 'electric', 'contemplative', 5000, 1200, 'streak', 'orbit', 'wave', ['connections', 'network', 'relationships'], false, false, [4500, 6000], [900, 1500], [0.8, 1.4], [1.0, 1.4], ['#f0abfc', '#e879f9', '#d946ef', '#ffffff'], { from: [0, 0, 15], to: [0, 8, 10], fovFrom: 65, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false }),
  v('kaleidoscope', 'Kaleidoscope', 'Reality fragments and reassembles beautifully', 'reframe', 'high', 'rainbow', 'ethereal', 5500, 1600, 'crystallize', 'spiral', 'wave', ['patterns', 'beauty', 'complexity'], false, false, [5000, 6500], [1200, 2000], [0.9, 1.5], [1.0, 1.5], ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'], { from: [0, -10, 15], to: [0, 5, 5], fovFrom: 70, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false }),
  v('mirror_flip', 'Mirror Flip', 'The reflection becomes the reality', 'reframe', 'medium', 'cool', 'mysterious', 4000, 900, 'pulse_wave', 'snap', 'bounce', ['reflection', 'opposite', 'reversal'], true, false, [3500, 5000], [700, 1100], [0.8, 1.4], [0.9, 1.3], ['#6366f1', '#818cf8', '#a5b4fc', '#ffffff'], { from: [0, 0, 10], to: [0, 0, -10], fovFrom: 55, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false }),

  // ============ RESOLVE CLASS (4 variants) ============
  v('node_merge', 'Node Merge', 'Conflicting points converge into harmony', 'resolve', 'medium', 'nature', 'serene', 5000, 1000, 'implosion', 'dolly', 'ease', ['harmony', 'unity', 'resolution'], true, false, [4500, 6000], [800, 1200], [0.7, 1.2], [0.9, 1.3], ['#16a34a', '#22c55e', '#4ade80', '#ffffff'], { from: [0, 0, 18], to: [0, 0, 6], fovFrom: 65, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),
  v('orbit_stable', 'Orbit Stable', 'Chaotic elements find their stable orbits', 'resolve', 'low', 'cosmic', 'contemplative', 5500, 800, 'orbit', 'drift', 'ease', ['balance', 'stability', 'order'], true, false, [5000, 6500], [600, 1000], [0.5, 1.0], [0.8, 1.2], ['#7c3aed', '#8b5cf6', '#a78bfa', '#ffffff'], { from: [5, 5, 15], to: [0, 0, 10], fovFrom: 60, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),
  v('puzzle_complete', 'Puzzle Complete', 'The final piece clicks into place', 'resolve', 'high', 'warm', 'triumphant', 4000, 1400, 'crystallize', 'zoom_rush', 'snap', ['completion', 'solution', 'achievement'], false, false, [3500, 5000], [1100, 1700], [1.0, 1.6], [1.0, 1.5], ['#fbbf24', '#f59e0b', '#d97706', '#ffffff'], { from: [0, 0, 20], to: [0, 0, 4], fovFrom: 75, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false }),
  v('peace_settle', 'Peace Settle', 'Turbulent waters become still and clear', 'resolve', 'low', 'cool', 'serene', 6000, 600, 'dissolve', 'drift', 'ease', ['peace', 'calm', 'stillness'], true, true, [5500, 7000], [400, 800], [0.4, 0.8], [0.7, 1.0], ['#38bdf8', '#7dd3fc', '#bae6fd', '#ffffff'], { from: [0, 3, 12], to: [0, 0, 10], fovFrom: 55, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),

  // ============ COURAGE CLASS (4 variants) ============
  v('barrier_break', 'Barrier Break', 'An invisible wall shatters before you', 'courage', 'extreme', 'warm', 'dramatic', 3500, 2000, 'explosion', 'zoom_rush', 'snap', ['breakthrough', 'power', 'determination'], false, false, [3000, 4500], [1600, 2400], [1.3, 2.0], [1.2, 1.8], ['#dc2626', '#ef4444', '#f97316', '#ffffff'], { from: [0, 0, 25], to: [0, 0, 3], fovFrom: 85, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false }),
  v('forward_leap', 'Forward Leap', 'A powerful surge propels you forward', 'courage', 'high', 'electric', 'energetic', 3000, 1500, 'streak', 'zoom_rush', 'snap', ['momentum', 'action', 'boldness'], false, false, [2500, 4000], [1200, 1800], [1.2, 1.8], [1.1, 1.6], ['#a855f7', '#c084fc', '#d8b4fe', '#ffffff'], { from: [0, 0, 30], to: [0, 0, 2], fovFrom: 90, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false }),
  v('flame_rise', 'Flame Rise', 'Inner fire ignites and rises', 'courage', 'high', 'warm', 'dramatic', 4000, 1400, 'fountain', 'crane', 'pulse', ['fire', 'passion', 'intensity'], false, false, [3500, 5000], [1100, 1700], [1.0, 1.6], [1.0, 1.5], ['#f97316', '#fb923c', '#fbbf24', '#ffffff'], { from: [0, -10, 12], to: [0, 8, 8], fovFrom: 60, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false }),
  v('stand_tall', 'Stand Tall', 'Rising up with quiet, steady strength', 'courage', 'medium', 'nature', 'contemplative', 4500, 900, 'fountain', 'crane', 'ease', ['strength', 'resilience', 'dignity'], true, false, [4000, 5500], [700, 1100], [0.8, 1.3], [0.9, 1.4], ['#15803d', '#16a34a', '#22c55e', '#ffffff'], { from: [0, -5, 10], to: [0, 5, 10], fovFrom: 55, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),

  // ============ BOUNDARY CLASS (3 variants) ============
  v('line_draw', 'Line Draw', 'A clear boundary forms with precision', 'boundary', 'low', 'monochrome', 'minimal', 4000, 500, 'streak', 'dolly', 'linear', ['clarity', 'definition', 'separation'], true, true, [3500, 5000], [350, 650], [0.6, 1.1], [0.8, 1.2], ['#f8fafc', '#e2e8f0', '#94a3b8', '#ffffff'], { from: [0, 0, 15], to: [0, 0, 8], fovFrom: 55, fovTo: 50, lookAt: 'center', }, { bloom: false, chromaticAberration: false, motionBlur: false, vignette: true }),
  v('space_create', 'Space Create', 'Breathing room opens up around you', 'boundary', 'low', 'cool', 'serene', 5000, 600, 'dissolve', 'drift', 'ease', ['space', 'breathing-room', 'openness'], true, false, [4500, 6000], [450, 750], [0.5, 1.0], [0.8, 1.2], ['#bae6fd', '#7dd3fc', '#38bdf8', '#ffffff'], { from: [0, 0, 6], to: [0, 0, 14], fovFrom: 50, fovTo: 60, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),
  v('shield_form', 'Shield Form', 'A protective barrier materializes', 'boundary', 'medium', 'cosmic', 'mysterious', 4500, 900, 'ring', 'orbit', 'ease', ['protection', 'safety', 'boundary'], true, false, [4000, 5500], [700, 1100], [0.7, 1.2], [0.9, 1.3], ['#6d28d9', '#7c3aed', '#8b5cf6', '#ffffff'], { from: [8, 0, 10], to: [-8, 0, 10], fovFrom: 55, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false }),

  // ============ CHOICE CLASS (3 variants) ============
  v('path_illuminate', 'Path Illuminate', 'One path brightens among many', 'choice', 'medium', 'warm', 'contemplative', 4500, 800, 'streak', 'dolly', 'ease', ['decision', 'direction', 'clarity'], true, false, [4000, 5500], [600, 1000], [0.7, 1.2], [0.9, 1.3], ['#fbbf24', '#fcd34d', '#fef3c7', '#ffffff'], { from: [0, 0, 15], to: [0, 0, 5], fovFrom: 65, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),
  v('branch_focus', 'Branch Focus', 'Possibilities narrow to the essential', 'choice', 'medium', 'nature', 'contemplative', 5000, 1000, 'spiral_arm', 'spiral', 'ease', ['focus', 'narrowing', 'commitment'], false, false, [4500, 6000], [800, 1200], [0.8, 1.3], [0.9, 1.4], ['#4ade80', '#22c55e', '#16a34a', '#ffffff'], { from: [10, 5, 15], to: [0, 0, 6], fovFrom: 70, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false }),
  v('door_open', 'Door Open', 'A doorway of light opens before you', 'choice', 'high', 'dawn', 'triumphant', 4000, 1200, 'pulse_wave', 'zoom_rush', 'ease', ['opportunity', 'threshold', 'beginning'], false, false, [3500, 5000], [900, 1500], [0.9, 1.5], [1.0, 1.5], ['#fda4af', '#fbbf24', '#fef3c7', '#ffffff'], { from: [0, 0, 20], to: [0, 0, 3], fovFrom: 75, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false }),

  // ============ INTEGRATION CLASS (3 variants) ============
  v('harmony_align', 'Harmony Align', 'All elements find their perfect positions', 'integration', 'medium', 'cosmic', 'ethereal', 5500, 1200, 'crystallize', 'orbit', 'ease', ['harmony', 'alignment', 'wholeness'], false, false, [5000, 6500], [900, 1500], [0.7, 1.2], [0.9, 1.4], ['#a78bfa', '#8b5cf6', '#7c3aed', '#ffffff'], { from: [0, -8, 15], to: [0, 0, 8], fovFrom: 65, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false }),
  v('weave_complete', 'Weave Complete', 'Threads of understanding interlock', 'integration', 'medium', 'rainbow', 'contemplative', 5000, 1400, 'spiral_arm', 'spiral', 'wave', ['connection', 'weaving', 'synthesis'], false, false, [4500, 6000], [1100, 1700], [0.8, 1.4], [1.0, 1.5], ['#f43f5e', '#fb923c', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa'], { from: [0, 0, 18], to: [0, 5, 6], fovFrom: 70, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false }),
  v('constellation_form', 'Constellation Form', 'Stars connect to form a meaningful pattern', 'integration', 'low', 'cosmic', 'ethereal', 6000, 700, 'nebula', 'drift', 'ease', ['stars', 'meaning', 'big-picture'], true, false, [5500, 7000], [500, 900], [0.4, 0.9], [0.8, 1.2], ['#ddd6fe', '#c4b5fd', '#a78bfa', '#ffffff'], { from: [0, 0, 25], to: [0, 0, 12], fovFrom: 60, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),

  // ============ CLARITY CLASS (Fallback) (2 variants) ============
  v('clarity_pulse', 'Clarity Pulse', 'A simple, reliable moment of clarity', 'clarity', 'low', 'neutral', 'minimal', 3000, 300, 'pulse_wave', 'dolly', 'ease', ['simple', 'reliable', 'clear'], true, true, [2500, 3500], [200, 400], [0.8, 1.2], [0.9, 1.1], ['#ffffff', '#f1f5f9', '#e2e8f0', '#94a3b8'], { from: [0, 0, 12], to: [0, 0, 8], fovFrom: 55, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: false }),
  v('soft_glow', 'Soft Glow', 'A gentle warmth of understanding', 'clarity', 'low', 'warm', 'minimal', 3500, 400, 'dissolve', 'drift', 'ease', ['gentle', 'warm', 'simple'], true, true, [3000, 4000], [300, 500], [0.6, 1.0], [0.8, 1.1], ['#fef3c7', '#fde68a', '#fcd34d', '#ffffff'], { from: [0, 0, 10], to: [0, 0, 8], fovFrom: 52, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),

  // ============ EMERGENCE CLASS (2 variants) ============
  v('crystal_form', 'Crystal Form', 'Order crystallizes from chaos', 'emergence', 'high', 'electric', 'dramatic', 4500, 1600, 'crystallize', 'orbit', 'snap', ['structure', 'formation', 'emergence'], false, false, [4000, 5500], [1200, 2000], [0.9, 1.5], [1.0, 1.5], ['#67e8f9', '#22d3ee', '#06b6d4', '#ffffff'], { from: [10, 5, 15], to: [0, 0, 7], fovFrom: 65, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false }),
  v('butterfly_emerge', 'Butterfly Emerge', 'Transformation completes with graceful emergence', 'emergence', 'medium', 'dusk', 'ethereal', 5000, 1000, 'fountain', 'crane', 'ease', ['transformation', 'metamorphosis', 'beauty'], true, false, [4500, 6000], [800, 1200], [0.7, 1.2], [0.9, 1.4], ['#f472b6', '#ec4899', '#db2777', '#ffffff'], { from: [0, -8, 12], to: [0, 5, 8], fovFrom: 60, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false }),

  // ============ FLOW CLASS (2 variants) ============
  v('river_flow', 'River Flow', 'Smooth, continuous motion like a river', 'flow', 'low', 'cool', 'serene', 5500, 800, 'cascade', 'drift', 'wave', ['flow', 'continuous', 'natural'], true, false, [5000, 6500], [600, 1000], [0.5, 1.0], [0.8, 1.2], ['#7dd3fc', '#38bdf8', '#0ea5e9', '#ffffff'], { from: [-5, 0, 12], to: [5, 0, 10], fovFrom: 55, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: true, vignette: true }),
  v('wind_dance', 'Wind Dance', 'Playful energy moves with the wind', 'flow', 'medium', 'nature', 'energetic', 4500, 1000, 'cascade', 'spiral', 'wave', ['wind', 'playful', 'movement'], true, false, [4000, 5500], [800, 1200], [0.8, 1.4], [0.9, 1.3], ['#86efac', '#4ade80', '#22c55e', '#bbf7d0'], { from: [0, 0, 15], to: [3, 3, 8], fovFrom: 60, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: true, vignette: false }),

  // ============ SPARK CLASS (2 variants) ============
  v('lightbulb_moment', 'Lightbulb Moment', 'A flash of brilliant inspiration', 'spark', 'high', 'warm', 'energetic', 2500, 1200, 'explosion', 'snap', 'snap', ['insight', 'flash', 'eureka'], false, false, [2000, 3000], [900, 1500], [1.2, 1.8], [1.0, 1.5], ['#fef3c7', '#fbbf24', '#f59e0b', '#ffffff'], { from: [0, 0, 10], to: [0, 0, 5], fovFrom: 60, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: false, vignette: false }),
  v('spark_cascade', 'Spark Cascade', 'One spark ignites a cascade of ideas', 'spark', 'extreme', 'electric', 'dramatic', 3000, 1800, 'cascade', 'zoom_rush', 'pulse', ['chain-reaction', 'cascade', 'ignition'], false, false, [2500, 3500], [1400, 2200], [1.3, 2.0], [1.1, 1.7], ['#f0abfc', '#e879f9', '#d946ef', '#ffffff'], { from: [0, 0, 18], to: [0, 0, 3], fovFrom: 80, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false }),
  // ============ ADDITIONAL VARIETY VARIANTS (5 more) ============
  v('echo_fade', 'Echo Fade', 'Ripples of understanding echo outward', 'reveal', 'low', 'dusk', 'contemplative', 5000, 700, 'ring', 'drift', 'wave', ['echo', 'ripple', 'gradual'], true, false, [4500, 5500], [500, 900], [0.5, 1.0], [0.8, 1.2], ['#c084fc', '#a855f7', '#9333ea', '#ffffff'], { from: [0, 0, 12], to: [0, 0, 9], fovFrom: 55, fovTo: 52, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),
  v('gravity_shift', 'Gravity Shift', 'The center of gravity moves to a new place', 'reframe', 'high', 'cosmic', 'dramatic', 4000, 1300, 'implosion', 'pivot', 'bounce', ['gravity', 'shift', 'dramatic'], false, false, [3500, 4500], [1000, 1600], [1.0, 1.6], [1.0, 1.5], ['#6d28d9', '#7c3aed', '#8b5cf6', '#ffffff'], { from: [5, 5, 12], to: [-5, -5, 8], fovFrom: 60, fovTo: 55, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false }),
  v('root_ground', 'Root Ground', 'Deep roots anchor into solid ground', 'boundary', 'medium', 'nature', 'serene', 5500, 900, 'rain', 'crane', 'ease', ['grounding', 'roots', 'stability'], true, false, [5000, 6000], [700, 1100], [0.6, 1.1], [0.9, 1.3], ['#15803d', '#166534', '#14532d', '#86efac'], { from: [0, 8, 12], to: [0, -2, 8], fovFrom: 60, fovTo: 52, lookAt: 'center', }, { bloom: true, chromaticAberration: false, motionBlur: false, vignette: true }),
  v('phoenix_rise', 'Phoenix Rise', 'From ashes, renewed strength emerges', 'courage', 'extreme', 'warm', 'triumphant', 4500, 2200, 'fountain', 'crane', 'pulse', ['rebirth', 'phoenix', 'transformation'], false, false, [4000, 5500], [1800, 2600], [1.2, 1.9], [1.2, 1.8], ['#dc2626', '#ea580c', '#f59e0b', '#fef3c7'], { from: [0, -12, 15], to: [0, 10, 6], fovFrom: 70, fovTo: 50, lookAt: 'center', }, { bloom: true, chromaticAberration: true, motionBlur: true, vignette: false }),
  v('compass_point', 'Compass Point', 'The needle settles on true north', 'choice', 'low', 'monochrome', 'minimal', 4000, 500, 'streak', 'dolly', 'linear', ['direction', 'compass', 'certainty'], true, true, [3500, 4500], [350, 650], [0.7, 1.2], [0.8, 1.1], ['#fafafa', '#d4d4d4', '#a3a3a3', '#525252'], { from: [0, 0, 14], to: [0, 0, 7], fovFrom: 58, fovTo: 50, lookAt: 'center', }, { bloom: false, chromaticAberration: false, motionBlur: false, vignette: true }),
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
 * Convert hex to HSL
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 100 };
  
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to hex
 */
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Rotate hue of a hex color
 */
function rotateHue(hex: string, degrees: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h + degrees, s, l);
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
  
  // Apply hue shift based on seed for variety
  const hueShift = (rng() - 0.5) * 30; // ±15 degrees
  const finalColors = selectedPalette.map((color) => {
    return rotateHue(color, hueShift);
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
  return Math.floor(secureMathRandom() * 2147483647);
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
  
  // Performance Optimization: Consolidated multiple array passes (.filter)
  // into this single loop to avoid creating intermediate arrays and
  // reduce garbage collection overhead.
  let lowTierSafe = 0;
  let fallbacks = 0;

  for (let i = 0; i < BREAKTHROUGH_VARIANTS.length; i++) {
    const v = BREAKTHROUGH_VARIANTS[i];
    byClass[v.class] = (byClass[v.class] || 0) + 1;
    byIntensity[v.intensity] = (byIntensity[v.intensity] || 0) + 1;

    if (v.lowTierSafe) lowTierSafe++;
    if (v.isFallback) fallbacks++;
  }
  
  return {
    total: BREAKTHROUGH_VARIANTS.length,
    byClass,
    byIntensity,
    lowTierSafe,
    fallbacks,
  };
}
