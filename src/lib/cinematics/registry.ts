/**
 * @fileoverview Cinematic configuration registry
 * @module lib/cinematics/registry
 */

import type { CinematicRegistry } from './types'

/**
 * Immutable registry of cinematic breakthrough configurations.
 * Each variant is carefully crafted for maximum emotional impact.
 */
export const CINEMATICS: CinematicRegistry = Object.freeze({
  spiral_ascend: Object.freeze({
    name: 'Spiral Ascend',
    duration: 4000,
    camera: Object.freeze({
      from: Object.freeze({ x: 0, y: -10, z: 15 }),
      to: Object.freeze({ x: 0, y: 5, z: 8 }),
      rotation: Object.freeze({ x: 0, y: Math.PI * 2, z: 0 })
    }),
    effects: Object.freeze([
      Object.freeze({ type: 'spiral_particles', count: 1000, color: '#10b981' }),
      Object.freeze({ type: 'camera_shake', intensity: 0.3 }),
      Object.freeze({ type: 'chromatic_aberration', strength: 2 })
    ]),
    audio: '/sounds/spiral-whoosh.mp3',
    description: 'Camera spirals up through particle vortex'
  }),

  particle_explosion: Object.freeze({
    name: 'Particle Explosion',
    duration: 3500,
    camera: Object.freeze({
      from: Object.freeze({ x: 0, y: 0, z: 20 }),
      to: Object.freeze({ x: 0, y: 0, z: 5 }),
      zoom: 'aggressive'
    }),
    effects: Object.freeze([
      Object.freeze({ type: 'radial_particles', count: 2000, speed: 5 }),
      Object.freeze({ type: 'bloom', intensity: 3 }),
      Object.freeze({ type: 'shockwave', radius: 50 })
    ]),
    audio: '/sounds/explosion-bass.mp3',
    description: 'Particles explode outward, camera rushes through'
  }),

  portal_reveal: Object.freeze({
    name: 'Portal Reveal',
    duration: 4500,
    camera: Object.freeze({
      from: Object.freeze({ x: -15, y: 0, z: 10 }),
      to: Object.freeze({ x: 0, y: 0, z: 3 }),
      lookAt: 'portal_center'
    }),
    effects: Object.freeze([
      Object.freeze({ type: 'portal_ring', color: '#8b5cf6' }),
      Object.freeze({ type: 'depth_of_field', intensity: 2 }),
      Object.freeze({ type: 'light_rays', count: 8 })
    ]),
    audio: '/sounds/portal-hum.mp3',
    description: 'Dimensional gateway opens to reveal breakthrough'
  }),

  matrix_decode: Object.freeze({
    name: 'Matrix Decode',
    duration: 4000,
    camera: Object.freeze({
      from: Object.freeze({ x: 0, y: 10, z: 12 }),
      to: Object.freeze({ x: 0, y: 0, z: 6 }),
      zoom: 'smooth'
    }),
    effects: Object.freeze([
      Object.freeze({ type: 'data_rain', count: 500, color: '#22c55e' }),
      Object.freeze({ type: 'glitch', intensity: 1.5 }),
      Object.freeze({ type: 'scanlines', opacity: 0.3 })
    ]),
    audio: '/sounds/digital-decode.mp3',
    description: 'Data rain resolves into clarity'
  }),

  space_warp: Object.freeze({
    name: 'Space Warp',
    duration: 3800,
    camera: Object.freeze({
      from: Object.freeze({ x: 0, y: 0, z: 50 }),
      to: Object.freeze({ x: 0, y: 0, z: 4 }),
      zoom: 'aggressive'
    }),
    effects: Object.freeze([
      Object.freeze({ type: 'starfield_stretch', speed: 10 }),
      Object.freeze({ type: 'motion_blur', strength: 3 }),
      Object.freeze({ type: 'tunnel_vignette', intensity: 2 })
    ]),
    audio: '/sounds/warp-drive.mp3',
    description: 'Hyperspace jump to breakthrough destination'
  })
})
