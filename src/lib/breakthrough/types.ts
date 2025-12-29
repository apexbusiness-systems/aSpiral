/**
 * Breakthrough System Type Definitions
 * ASPIRAL Infinite Breakthroughs Engine
 */

// ============================================================================
// CORE ENUMS
// ============================================================================

/** Breakthrough emotional/thematic categories */
export type BreakthroughClass =
  | 'reveal'      // Soft uncovering, progressive disclosure
  | 'release'     // Tension dissolves, particles unbind
  | 'reframe'     // Connections redraw, camera pivot
  | 'resolve'     // Conflicting nodes merge into stable orbit
  | 'courage'     // Forward motion, barrier breaks
  | 'boundary'    // Separation line becomes clear, calming
  | 'choice'      // Branch paths appear, one brightens
  | 'integration' // Multiple nodes align into harmonic pattern
  | 'clarity'     // Safe fallback - simple, reliable
  | 'emergence'   // New pattern crystallizes from chaos
  | 'flow'        // Smooth continuous motion, river-like
  | 'spark';      // Quick flash of inspiration

/** Camera movement archetypes */
export type CameraArchetype =
  | 'orbit'       // Circle around center
  | 'dolly'       // Move in/out along z-axis
  | 'spiral'      // Helical path
  | 'snap'        // Quick cuts between positions
  | 'crane'       // Vertical sweep
  | 'drift'       // Slow float
  | 'zoom_rush'   // Dramatic zoom
  | 'pivot';      // Rotate on axis

/** Curve profile for animations */
export type CurveProfile =
  | 'ease'        // Smooth acceleration/deceleration
  | 'pulse'       // Rhythmic intensity
  | 'wave'        // Oscillating
  | 'linear'      // Constant rate
  | 'snap'        // Quick response
  | 'bounce'      // Overshoot and settle
  | 'elastic';    // Springy

/** Particle pattern types */
export type ParticlePattern =
  | 'vortex'
  | 'explosion'
  | 'implosion'
  | 'ring'
  | 'rain'
  | 'streak'
  | 'orbit'
  | 'cascade'
  | 'fountain'
  | 'dissolve'
  | 'crystallize'
  | 'pulse_wave'
  | 'spiral_arm'
  | 'nebula';

/** Audio mood for sound selection */
export type AudioMood =
  | 'triumphant'
  | 'serene'
  | 'mysterious'
  | 'energetic'
  | 'contemplative'
  | 'dramatic'
  | 'ethereal'
  | 'minimal';

/** Color mood/palette type */
export type ColorMood =
  | 'warm'        // Oranges, yellows, reds
  | 'cool'        // Blues, teals, purples
  | 'nature'      // Greens, earth tones
  | 'electric'    // Bright neons
  | 'cosmic'      // Deep purples, cosmic blue
  | 'dawn'        // Soft pinks, golds
  | 'dusk'        // Deep oranges, purples
  | 'monochrome'  // Single hue variations
  | 'rainbow'     // Full spectrum
  | 'neutral';    // Whites, grays

/** Intensity band for fatigue management */
export type IntensityBand = 'low' | 'medium' | 'high' | 'extreme';

/** Quality tier for device adaptation */
export type QualityTier = 'low' | 'mid' | 'high';

// ============================================================================
// MUTATION KNOBS
// ============================================================================

export interface MutationKnobs {
  /** Duration range in milliseconds */
  durationRange: [number, number];
  
  /** Particle count range (before quality multiplier) */
  particleCountRange: [number, number];
  
  /** Animation curve profile */
  curveProfile: CurveProfile;
  
  /** Camera movement archetype */
  cameraArchetype: CameraArchetype;
  
  /** Palette seed (0-1, maps to color variations) */
  paletteSeed: number;
  
  /** Audio intensity (0-1) */
  audioIntensity: number;
  
  /** Audio timing offset in ms */
  audioTimingOffset: number;
  
  /** Speed multiplier (0.5-2.0) */
  speedMultiplier: number;
  
  /** Scale multiplier (0.5-2.0) */
  scaleMultiplier: number;
  
  /** Extra visual elements count */
  extraVisualsCount: number;
}

// ============================================================================
// BASE VARIANT DEFINITION
// ============================================================================

export interface BaseVariant {
  /** Unique identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Brief description */
  description: string;
  
  /** Classification */
  class: BreakthroughClass;
  
  /** Intensity band */
  intensity: IntensityBand;
  
  /** Color mood */
  colorMood: ColorMood;
  
  /** Audio mood */
  audioMood: AudioMood;
  
  /** Base duration in ms */
  baseDuration: number;
  
  /** Default particle count */
  baseParticleCount: number;
  
  /** Particle pattern */
  particlePattern: ParticlePattern;
  
  /** Camera archetype */
  cameraArchetype: CameraArchetype;
  
  /** Default curve profile */
  curveProfile: CurveProfile;
  
  /** Tags for context matching */
  tags: string[];
  
  /** Whether this variant is safe for low-tier devices */
  lowTierSafe: boolean;
  
  /** Whether this is suitable as a fallback */
  isFallback: boolean;
  
  /** Mutation bounds for each knob */
  mutationBounds: {
    durationRange: [number, number];
    particleCountRange: [number, number];
    speedRange: [number, number];
    scaleRange: [number, number];
  };
  
  /** Base colors (HSL strings) */
  baseColors: string[];
  
  /** Camera path waypoints */
  cameraPath: {
    from: [number, number, number];
    to: [number, number, number];
    fovFrom: number;
    fovTo: number;
    lookAt: 'center' | 'follow' | [number, number, number];
  };
  
  /** Post-processing effects */
  effects: {
    bloom: boolean;
    chromaticAberration: boolean;
    motionBlur: boolean;
    vignette: boolean;
  };
}

// ============================================================================
// MUTATED VARIANT (RUNTIME)
// ============================================================================

export interface MutatedVariant extends BaseVariant {
  /** The applied mutation knobs */
  mutation: MutationKnobs;
  
  /** Seed used for this mutation */
  seed: number;
  
  /** Computed final duration */
  finalDuration: number;
  
  /** Computed final particle count */
  finalParticleCount: number;
  
  /** Computed final colors */
  finalColors: string[];
}

// ============================================================================
// SELECTION CONTEXT
// ============================================================================

export interface SelectionContext {
  /** Current session entities (for thematic matching) */
  entities: Array<{
    type: string;
    label: string;
    valence?: number;
  }>;
  
  /** Overall sentiment (-1 to 1) */
  sentiment: number;
  
  /** Friction intensity (0-1) */
  frictionIntensity: number;
  
  /** Breakthrough type hint from AI */
  breakthroughType?: BreakthroughClass;
  
  /** User's recent intensity history */
  recentIntensities: IntensityBand[];
  
  /** Recently used variant IDs */
  recentVariantIds: string[];
  
  /** Device quality tier */
  qualityTier: QualityTier;
  
  /** Whether reduced motion is preferred */
  reducedMotion: boolean;
}

// ============================================================================
// HISTORY ENTRY
// ============================================================================

export interface BreakthroughHistoryEntry {
  /** Variant ID */
  variantId: string;
  
  /** Mutation seed */
  seed: number;
  
  /** Intensity band */
  intensity: IntensityBand;
  
  /** Timestamp */
  timestamp: number;
  
  /** Quality tier used */
  qualityTier: QualityTier;
  
  /** Whether it completed successfully */
  completed: boolean;
  
  /** Was fallback triggered? */
  wasFallback: boolean;
}

// ============================================================================
// DIRECTOR STATE
// ============================================================================

export type DirectorPhase =
  | 'idle'
  | 'prewarming'
  | 'ready'
  | 'playing'
  | 'settling'
  | 'cleanup'
  | 'error';

export interface DirectorState {
  phase: DirectorPhase;
  currentVariant: MutatedVariant | null;
  startTime: number | null;
  error: string | null;
  fpsHistory: number[];
  isSafeMode: boolean;
}

// ============================================================================
// ANALYTICS EVENTS
// ============================================================================

export interface BreakthroughAnalyticsEvent {
  eventType: 'started' | 'completed' | 'aborted' | 'fallback' | 'error' | 'fps_dip';
  variantId: string;
  seed: number;
  intensityBand: IntensityBand;
  qualityTier: QualityTier;
  duration?: number;
  avgFps?: number;
  minFps?: number;
  error?: string;
  timestamp: number;
}

// ============================================================================
// FEATURE FLAG
// ============================================================================

export const BREAKTHROUGH_V2_FLAG = 'BREAKTHROUGH_V2';

export function isBreakthroughV2Enabled(): boolean {
  // Check environment variable
  if (typeof import.meta !== 'undefined') {
    const envFlag = (import.meta as any).env?.VITE_BREAKTHROUGH_V2;
    if (envFlag === 'false' || envFlag === '0') return false;
    if (envFlag === 'true' || envFlag === '1') return true;
  }
  
  // Check localStorage override
  if (typeof localStorage !== 'undefined') {
    const localFlag = localStorage.getItem(BREAKTHROUGH_V2_FLAG);
    if (localFlag === 'false' || localFlag === '0') return false;
    if (localFlag === 'true' || localFlag === '1') return true;
  }
  
  // Default: ON in dev, ON in prod (can be toggled)
  return true;
}

export function setBreakthroughV2Enabled(enabled: boolean): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(BREAKTHROUGH_V2_FLAG, enabled ? 'true' : 'false');
  }
}
