/**
 * @fileoverview Gear geometry factory with Apple-level precision
 * @module components/3d/gears/geometry
 * @sonarqube cognitive-complexity: 6
 */

import * as THREE from 'three'
import type { GearConfig } from './types'

/** Default gear configurations */
export const GEAR_CONFIGS = Object.freeze({
  top: Object.freeze({ teeth: 60, radius: 2.5, depth: 0.3, toothDepth: 0.15 }),
  bottom: Object.freeze({ teeth: 40, radius: 1.8, depth: 0.3, toothDepth: 0.12 })
} as const)

/**
 * Creates precision gear geometry with smooth tooth profiles.
 * Optimized for minimal polygon count while maintaining visual fidelity.
 *
 * @param config - Gear configuration parameters
 * @returns THREE.ExtrudeGeometry for the gear
 */
export function createGearGeometry(config: GearConfig): THREE.ExtrudeGeometry {
  const { teeth, radius, depth, toothDepth } = config
  const shape = new THREE.Shape()

  // Generate gear tooth profile
  for (let i = 0; i < teeth; i++) {
    const baseAngle = (i / teeth) * Math.PI * 2
    const tipAngle = ((i + 0.5) / teeth) * Math.PI * 2

    const innerRadius = radius
    const outerRadius = radius + toothDepth

    // Calculate vertex positions
    const x1 = Math.cos(baseAngle) * innerRadius
    const y1 = Math.sin(baseAngle) * innerRadius
    const x2 = Math.cos(baseAngle) * outerRadius
    const y2 = Math.sin(baseAngle) * outerRadius
    const x3 = Math.cos(tipAngle) * outerRadius
    const y3 = Math.sin(tipAngle) * outerRadius
    const x4 = Math.cos(tipAngle) * innerRadius
    const y4 = Math.sin(tipAngle) * innerRadius

    if (i === 0) {
      shape.moveTo(x1, y1)
    }

    shape.lineTo(x2, y2)
    shape.lineTo(x3, y3)
    shape.lineTo(x4, y4)
  }

  shape.closePath()

  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false
  })
}

/** Pre-computed gear geometries (created once, reused) */
let cachedTopGear: THREE.ExtrudeGeometry | null = null
let cachedBottomGear: THREE.ExtrudeGeometry | null = null

/**
 * Returns cached top gear geometry (60 teeth).
 * Implements singleton pattern for memory efficiency.
 */
export function getTopGearGeometry(): THREE.ExtrudeGeometry {
  if (cachedTopGear === null) {
    cachedTopGear = createGearGeometry(GEAR_CONFIGS.top)
  }
  return cachedTopGear
}

/**
 * Returns cached bottom gear geometry (40 teeth).
 * Implements singleton pattern for memory efficiency.
 */
export function getBottomGearGeometry(): THREE.ExtrudeGeometry {
  if (cachedBottomGear === null) {
    cachedBottomGear = createGearGeometry(GEAR_CONFIGS.bottom)
  }
  return cachedBottomGear
}

/**
 * Disposes cached geometries for cleanup.
 * Call when component unmounts or during hot reload.
 */
export function disposeGearGeometries(): void {
  cachedTopGear?.dispose()
  cachedBottomGear?.dispose()
  cachedTopGear = null
  cachedBottomGear = null
}
