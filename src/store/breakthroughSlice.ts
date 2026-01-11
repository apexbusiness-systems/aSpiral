/**
 * @fileoverview Breakthrough state slice for Zustand store
 * @module store/breakthroughSlice
 */

import type { StateCreator } from 'zustand'
import type { CinematicType } from '../lib/cinematics'
import type { GreaseType } from '../components/3d/gears'

/** Breakthrough state interface */
export interface BreakthroughState {
  // Friction state
  readonly frictionLabel: string | null
  readonly opposingForce: string | null
  readonly isGrinding: boolean

  // Grease state
  readonly greaseApplied: boolean
  readonly greaseType: GreaseType

  // Cinematic state
  readonly cinematicType: CinematicType
  readonly isCinematicPlaying: boolean
}

/** Breakthrough actions interface */
export interface BreakthroughActions {
  setFriction: (friction: string, opposingForce: string) => void
  setGrinding: (isGrinding: boolean) => void
  applyGrease: (type: GreaseType) => void
  triggerBreakthrough: (cinematic?: CinematicType) => void
  resetBreakthrough: () => void
}

/** Combined slice type */
export type BreakthroughSlice = BreakthroughState & BreakthroughActions

/** Initial state */
const initialState: BreakthroughState = {
  frictionLabel: null,
  opposingForce: null,
  isGrinding: false,
  greaseApplied: false,
  greaseType: null,
  cinematicType: 'spiral_ascend',
  isCinematicPlaying: false
}

/**
 * Creates breakthrough state slice.
 * Manages friction visualization and breakthrough cinematics.
 */
export const createBreakthroughSlice: StateCreator<
  BreakthroughSlice,
  [],
  [],
  BreakthroughSlice
> = (set) => ({
  ...initialState,

  setFriction: (friction, opposingForce) => {
    set({
      frictionLabel: friction,
      opposingForce,
      isGrinding: true,
      greaseApplied: false,
      greaseType: null
    })
  },

  setGrinding: (isGrinding) => {
    set({ isGrinding })
  },

  applyGrease: (type) => {
    set({
      greaseApplied: true,
      greaseType: type,
      isGrinding: type !== 'right'
    })
  },

  triggerBreakthrough: (cinematic = 'spiral_ascend') => {
    set({
      cinematicType: cinematic,
      isCinematicPlaying: true
    })
  },

  resetBreakthrough: () => {
    set(initialState)
  }
})
