/**
 * TypeScript Types and Interfaces for ASPIRAL Cinematics
 */

import type { EasingFunction } from './easing';
import type * as THREE from 'three';

/**
 * Cinematic variant names
 */
export type CinematicVariant =
  | 'spiral_ascend'
  | 'particle_explosion'
  | 'portal_reveal'
  | 'matrix_decode'
  | 'space_warp';

/**
 * Post-processing effect types
 */
export type EffectType =
  | 'bloom'
  | 'chromaticAberration'
  | 'motionBlur'
  | 'depthOfField'
  | 'vignette'
  | 'scanlines'
  | 'glitch'
  | 'lensFlare'
  | 'cameraShake'
  | 'timeDilation';

/**
 * Particle pattern types
 */
export type ParticlePattern =
  | 'vortex'
  | 'explosion'
  | 'rain'
  | 'streak'
  | 'ring'
  | 'spiral'
  | 'grid';

/**
 * Vector3 type (compatible with THREE.Vector3)
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Euler rotation type (compatible with THREE.Euler)
 */
export interface Euler {
  x: number;
  y: number;
  z: number;
  order?: 'XYZ' | 'YXZ' | 'ZXY' | 'ZYX' | 'YZX' | 'XZY';
}

/**
 * Color type (hex string or THREE.Color)
 */
export type Color = string | THREE.Color;

/**
 * Camera path configuration
 */
export interface CameraPath {
  /** Starting position */
  from: Vector3;
  /** Ending position */
  to: Vector3;
  /** Optional rotation path */
  rotation?: Euler;
  /** Look-at target (can be coordinates or 'center') */
  lookAt?: Vector3 | 'center';
  /** Camera FOV (field of view) animation */
  fov?: {
    from: number;
    to: number;
  };
  /** Easing function for camera movement */
  easing?: EasingFunction | string;
}

/**
 * Particle configuration
 */
export interface ParticleConfig {
  /** Number of particles */
  count: number;
  /** Particle color(s) */
  color: Color | Color[];
  /** Particle size */
  size: number;
  /** Size variation (0-1) */
  sizeVariation?: number;
  /** Particle speed/velocity */
  speed: number;
  /** Speed variation (0-1) */
  speedVariation?: number;
  /** Particle lifetime (seconds) */
  lifetime?: number;
  /** Distribution pattern */
  pattern: ParticlePattern;
  /** Pattern-specific parameters */
  patternParams?: Record<string, unknown>;
  /** Opacity */
  opacity?: number;
  /** Blend mode */
  blending?: THREE.Blending;
}

/**
 * Post-processing effect configuration
 */
export interface Effect {
  /** Effect type */
  type: EffectType;
  /** Effect intensity (0-1 typically) */
  intensity?: number;
  /** Effect-specific parameters */
  [key: string]: unknown;
}

/**
 * Audio configuration
 */
export interface AudioConfig {
  /** Audio file path (relative to /public) */
  src: string;
  /** Volume (0-1) */
  volume?: number;
  /** Start time offset (ms) */
  startTime?: number;
  /** Fade in duration (ms) */
  fadeIn?: number;
  /** Fade out duration (ms) */
  fadeOut?: number;
  /** Loop audio */
  loop?: boolean;
}

/**
 * Complete cinematic configuration
 */
export interface CinematicConfig {
  /** Unique cinematic name */
  name: string;
  /** Display name (for UI) */
  displayName: string;
  /** Total duration (ms) */
  duration: number;
  /** Camera animation path */
  camera: CameraPath;
  /** Post-processing effects */
  effects: Effect[];
  /** Audio configuration */
  audio: AudioConfig;
  /** Particle system configuration */
  particles?: ParticleConfig;
  /** Additional visual elements */
  visuals?: VisualElement[];
  /** Lighting configuration */
  lighting?: LightingConfig;
  /** Background configuration */
  background?: BackgroundConfig;
}

/**
 * Visual element (rings, portals, etc.)
 */
export interface VisualElement {
  /** Element type */
  type: 'ring' | 'portal' | 'grid' | 'tunnel' | 'tendrils' | 'mesh';
  /** Position */
  position?: Vector3;
  /** Scale */
  scale?: Vector3 | number;
  /** Rotation */
  rotation?: Euler;
  /** Color */
  color?: Color;
  /** Animation parameters */
  animation?: {
    /** Property to animate */
    property: string;
    /** Start value */
    from: number | Vector3;
    /** End value */
    to: number | Vector3;
    /** Duration (ms) */
    duration: number;
    /** Easing function */
    easing?: EasingFunction | string;
  };
  /** Element-specific parameters */
  params?: Record<string, unknown>;
}

/**
 * Lighting configuration
 */
export interface LightingConfig {
  /** Ambient light */
  ambient?: {
    color: Color;
    intensity: number;
  };
  /** Point lights */
  pointLights?: Array<{
    position: Vector3;
    color: Color;
    intensity: number;
    distance?: number;
    decay?: number;
  }>;
  /** Directional lights */
  directionalLights?: Array<{
    position: Vector3;
    color: Color;
    intensity: number;
  }>;
  /** Spot lights */
  spotLights?: Array<{
    position: Vector3;
    target: Vector3;
    color: Color;
    intensity: number;
    angle?: number;
    penumbra?: number;
  }>;
}

/**
 * Background configuration
 */
export interface BackgroundConfig {
  /** Background type */
  type: 'color' | 'gradient' | 'stars' | 'custom';
  /** Background color */
  color?: Color;
  /** Gradient colors (if type is 'gradient') */
  gradientColors?: Color[];
  /** Stars configuration (if type is 'stars') */
  stars?: {
    count: number;
    radius: number;
    depth: number;
    speed?: number;
  };
}

/**
 * Cinematic playback state
 */
export type PlaybackState = 'idle' | 'playing' | 'paused' | 'completed' | 'skipped';

/**
 * Cinematic player props
 */
export interface CinematicPlayerProps {
  /** Variant to play (optional, random if not specified) */
  variant?: CinematicVariant;
  /** Callback when cinematic completes */
  onComplete?: () => void;
  /** Callback when cinematic is skipped */
  onSkip?: () => void;
  /** Callback when cinematic starts */
  onStart?: () => void;
  /** Enable skip button */
  allowSkip?: boolean;
  /** Auto-play on mount */
  autoPlay?: boolean;
  /** Enable performance monitoring */
  enableAnalytics?: boolean;
  /** Enable reduced motion mode */
  reducedMotion?: boolean;
  /** Custom CSS class */
  className?: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Average FPS */
  avgFps: number;
  /** Minimum FPS */
  minFps: number;
  /** Maximum FPS */
  maxFps: number;
  /** Peak memory usage (MB) */
  peakMemoryMB: number;
  /** Frame count */
  frameCount: number;
  /** Dropped frames */
  droppedFrames: number;
}

/**
 * Camera controller ref
 */
export interface CameraControllerRef {
  /** Skip to end of animation */
  skip: () => void;
  /** Pause animation */
  pause: () => void;
  /** Resume animation */
  resume: () => void;
  /** Reset animation */
  reset: () => void;
  /** Get current progress (0-1) */
  getProgress: () => number;
}

/**
 * Particle system ref
 */
export interface ParticleSystemRef {
  /** Reset particle system */
  reset: () => void;
  /** Update particle count */
  setParticleCount: (count: number) => void;
  /** Dispose particle system */
  dispose: () => void;
}

/**
 * Audio manager ref
 */
export interface AudioManagerRef {
  /** Play audio */
  play: () => Promise<void>;
  /** Pause audio */
  pause: () => void;
  /** Stop audio */
  stop: () => void;
  /** Set volume */
  setVolume: (volume: number) => void;
  /** Get current time */
  getCurrentTime: () => number;
}

/**
 * Adaptive quality settings
 */
export interface QualitySettings {
  /** Particle count multiplier (0-1) */
  particleMultiplier: number;
  /** Enable post-processing */
  enablePostProcessing: boolean;
  /** Enable shadows */
  enableShadows: boolean;
  /** Render scale (0.5-1) */
  renderScale: number;
  /** Antialiasing */
  antialias: boolean;
}

/**
 * Device capabilities
 */
export interface DeviceCapabilities {
  /** Device type */
  deviceType: 'desktop' | 'mobile' | 'tablet';
  /** GPU tier (1-3, higher is better) */
  gpuTier: number;
  /** Max texture size */
  maxTextureSize: number;
  /** WebGL version */
  webglVersion: number;
  /** Available memory (MB) */
  availableMemory?: number;
  /** GPU vendor (e.g., "NVIDIA Corporation") */
  gpuVendor?: string;
  /** GPU renderer (e.g., "NVIDIA GeForce RTX 3080") */
  gpuRenderer?: string;
}
