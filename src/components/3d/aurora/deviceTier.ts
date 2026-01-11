/**
 * @fileoverview Device capability detection for adaptive rendering
 * @module components/3d/aurora/deviceTier
 */

/** Device performance tier */
export type DeviceTier = 'low' | 'mid' | 'high'

/** Particle count by tier */
export const PARTICLE_COUNTS: Readonly<Record<DeviceTier, number>> = Object.freeze({
  low: 80,
  mid: 120,
  high: 160
})

/**
 * Detects device performance tier based on hardware.
 * Uses navigator.hardwareConcurrency as proxy for GPU capability.
 *
 * @returns Device tier classification
 */
export function getDeviceTier(): DeviceTier {
  if (typeof navigator === 'undefined') {
    return 'mid'
  }

  const cores = navigator.hardwareConcurrency ?? 4

  if (cores <= 2) return 'low'
  if (cores <= 4) return 'mid'
  return 'high'
}

/**
 * Gets optimal particle count for current device.
 *
 * @param override - Optional manual override
 * @returns Particle count
 */
export function getOptimalParticleCount(override?: number): number {
  if (override !== undefined) {
    return override
  }

  const tier = getDeviceTier()
  return PARTICLE_COUNTS[tier]
}
