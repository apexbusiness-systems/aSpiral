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
  readonly from: Readonly<Vec3>
  readonly to: Readonly<Vec3>
  readonly rotation?: Readonly<Vec3>
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

/** 3D vector type for camera positions */
export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** Device capability detection for adaptive rendering */
export interface DeviceCapabilities {
  readonly deviceType: 'mobile' | 'tablet' | 'desktop'
  readonly gpuTier: 1 | 2 | 3
  readonly memoryGB: number
  readonly cores: number
  readonly supportsWebGL2: boolean
}
