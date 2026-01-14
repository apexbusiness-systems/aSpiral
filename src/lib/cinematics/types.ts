/**
 * @fileoverview Cinematic breakthrough type definitions
 * @module lib/cinematics/types
 */

/** Available cinematic transformation variants */
export type CinematicType =
  | 'spiral_ascend'
  | 'particle_explosion'
  | 'portal_reveal'
  | 'matrix_decode'
  | 'space_warp'

/** Camera path configuration */
export interface CameraPath {
  readonly from: Readonly<{ x: number; y: number; z: number }>
  readonly to: Readonly<{ x: number; y: number; z: number }>
  readonly rotation?: Readonly<{ x: number; y: number; z: number }>
  readonly zoom?: 'aggressive' | 'smooth' | 'none'
  readonly lookAt?: string
}

/** Visual effect configuration */
export interface CinematicEffect {
  readonly type: string
  readonly count?: number
  readonly color?: string
  readonly intensity?: number
  readonly speed?: number
  readonly radius?: number
  readonly strength?: number
  readonly opacity?: number
}

/** Complete cinematic configuration */
export interface CinematicConfig {
  readonly name: string
  readonly duration: number
  readonly camera: CameraPath
  readonly effects: readonly CinematicEffect[]
  readonly audio: string
  readonly description: string
}

/** Registry of all cinematics */
export type CinematicRegistry = Readonly<Record<CinematicType, CinematicConfig>>

/** Device capabilities for adaptive rendering */
export interface DeviceCapabilities {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  gpuTier: number;
  maxTextureSize: number;
  webglVersion: number;
  availableMemory?: number;
  gpuVendor: string;
  gpuRenderer: string;
}

/** Quality settings based on capabilities */
export interface QualitySettings {
  particleMultiplier: number;
  enablePostProcessing: boolean;
  enableShadows: boolean;
  renderScale: number;
  antialias: boolean;
}

/** Performance metrics */
export interface PerformanceMetrics {
  avgFps: number;
  minFps: number;
  maxFps: number;
  frameCount: number;
  droppedFrames: number;
}

/** Variant type alias for backward compatibility */
export type CinematicVariant = CinematicType;

/** Props for the CinematicPlayer component */
export interface CinematicPlayerProps {
  variant?: CinematicVariant;
  onComplete?: () => void;
  onSkip?: () => void;
  onStart?: () => void;
  allowSkip?: boolean;
  autoPlay?: boolean;
  enableAnalytics?: boolean;
  reducedMotion?: boolean;
  className?: string;
}
