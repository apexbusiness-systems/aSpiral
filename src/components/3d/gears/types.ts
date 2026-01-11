/**
 * @fileoverview Grinding gears type definitions
 * @module components/3d/gears/types
 */

/** Grease application result type */
export type GreaseType = 'wrong' | 'right' | null

/** Grinding gears component props */
export interface GrindingGearsProps {
  /** Primary friction label displayed on top gear */
  readonly friction: string
  /** Opposing force label displayed on bottom gear */
  readonly opposingForce: string
  /** Whether gears are currently grinding (friction state) */
  readonly isGrinding: boolean
  /** Whether grease has been applied */
  readonly greaseApplied: boolean
  /** Type of grease applied */
  readonly greaseType: GreaseType
  /** Visibility toggle */
  readonly visible?: boolean
}

/** Gear geometry configuration */
export interface GearConfig {
  readonly teeth: number
  readonly radius: number
  readonly depth: number
  readonly toothDepth: number
}
