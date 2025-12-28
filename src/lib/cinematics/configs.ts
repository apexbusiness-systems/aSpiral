/**
 * Cinematic Configurations for ASPIRAL
 * Defines all 5 cinematic breakthrough reveal variants
 */

import type { CinematicConfig, CinematicVariant } from './types';
import { easeInOutCubic, easeOutExpo, easeInOutQuart } from './easing';
import * as THREE from 'three';

/**
 * VARIANT 1: Spiral Ascend
 * Camera spirals upward with green particles in vortex pattern
 */
export const SPIRAL_ASCEND_CONFIG: CinematicConfig = {
  name: 'spiral_ascend',
  displayName: 'Spiral Ascend',
  duration: 4000,

  camera: {
    from: { x: 0, y: -10, z: 15 },
    to: { x: 0, y: 5, z: 8 },
    rotation: {
      x: 0,
      y: Math.PI * 2, // 360° rotation
      z: 0,
      order: 'YXZ',
    },
    lookAt: 'center',
    fov: {
      from: 60,
      to: 50,
    },
    easing: easeInOutCubic,
  },

  particles: {
    count: 1000,
    color: ['#22c55e', '#10b981', '#34d399'], // Green gradient
    size: 0.05,
    sizeVariation: 0.3,
    speed: 3,
    speedVariation: 0.5,
    lifetime: 3,
    pattern: 'vortex',
    patternParams: {
      radius: 5,
      height: 15,
      rotationSpeed: 2,
    },
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  },

  effects: [
    {
      type: 'cameraShake',
      intensity: 0.3,
      frequency: 20,
    },
    {
      type: 'chromaticAberration',
      intensity: 2.0,
      offset: [0.002, 0.002],
    },
    {
      type: 'bloom',
      intensity: 1.5,
      luminanceThreshold: 0.8,
      luminanceSmoothing: 0.9,
    },
  ],

  audio: {
    src: '/sounds/spiral-whoosh.mp3',
    volume: 0.7,
    fadeIn: 200,
    fadeOut: 500,
  },

  lighting: {
    ambient: {
      color: '#ffffff',
      intensity: 0.3,
    },
    pointLights: [
      {
        position: { x: 0, y: 5, z: 0 },
        color: '#22c55e',
        intensity: 2,
        distance: 20,
      },
    ],
  },

  background: {
    type: 'stars',
    stars: {
      count: 2000,
      radius: 100,
      depth: 50,
      speed: 0.5,
    },
  },
};

/**
 * VARIANT 2: Particle Explosion
 * Camera zooms in while particles explode radially outward
 */
export const PARTICLE_EXPLOSION_CONFIG: CinematicConfig = {
  name: 'particle_explosion',
  displayName: 'Particle Explosion',
  duration: 3500,

  camera: {
    from: { x: 0, y: 0, z: 20 },
    to: { x: 0, y: 0, z: 5 },
    lookAt: 'center',
    fov: {
      from: 70,
      to: 55,
    },
    easing: easeOutExpo,
  },

  particles: {
    count: 2000,
    color: ['#fbbf24', '#f59e0b', '#f97316', '#ef4444', '#ffffff'],
    size: 0.08,
    sizeVariation: 0.5,
    speed: 8,
    speedVariation: 0.7,
    lifetime: 2.5,
    pattern: 'explosion',
    patternParams: {
      spherical: true,
      initialRadius: 0.5,
    },
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  },

  effects: [
    {
      type: 'bloom',
      intensity: 3.0,
      luminanceThreshold: 0.6,
      luminanceSmoothing: 0.8,
    },
    {
      type: 'vignette',
      intensity: 0.5,
      darkness: 0.8,
    },
  ],

  audio: {
    src: '/sounds/explosion-bass.mp3',
    volume: 0.8,
    fadeIn: 100,
    fadeOut: 400,
  },

  visuals: [
    {
      type: 'ring',
      position: { x: 0, y: 0, z: 0 },
      scale: 0.1,
      color: '#ffffff',
      animation: {
        property: 'scale',
        from: 0.1,
        to: 15,
        duration: 3500,
        easing: easeOutExpo,
      },
      params: {
        innerRadius: 0.9,
        outerRadius: 1,
        opacity: 0.6,
      },
    },
  ],

  lighting: {
    ambient: {
      color: '#ffffff',
      intensity: 0.5,
    },
    pointLights: [
      {
        position: { x: 0, y: 0, z: 0 },
        color: '#fbbf24',
        intensity: 5,
        distance: 25,
        decay: 2,
      },
    ],
  },

  background: {
    type: 'color',
    color: '#0f0f1a',
  },
};

/**
 * VARIANT 3: Portal Reveal
 * Camera glides through rotating portal with energy tendrils
 */
export const PORTAL_REVEAL_CONFIG: CinematicConfig = {
  name: 'portal_reveal',
  displayName: 'Portal Reveal',
  duration: 4500,

  camera: {
    from: { x: -15, y: 0, z: 10 },
    to: { x: 0, y: 0, z: 3 },
    lookAt: 'center',
    fov: {
      from: 65,
      to: 50,
    },
    easing: easeInOutQuart,
  },

  particles: {
    count: 800,
    color: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ffffff'],
    size: 0.06,
    sizeVariation: 0.4,
    speed: 2,
    speedVariation: 0.6,
    lifetime: 4,
    pattern: 'ring',
    patternParams: {
      radius: 10,
      thickness: 2,
      rotationSpeed: 1.5,
    },
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  },

  effects: [
    {
      type: 'lensFlare',
      intensity: 2.0,
      position: [0, 0, 0],
    },
    {
      type: 'bloom',
      intensity: 2.0,
      luminanceThreshold: 0.7,
      luminanceSmoothing: 0.9,
    },
    {
      type: 'chromaticAberration',
      intensity: 1.5,
    },
  ],

  audio: {
    src: '/sounds/portal-open.mp3',
    volume: 0.75,
    fadeIn: 300,
    fadeOut: 600,
  },

  visuals: [
    {
      type: 'portal',
      position: { x: 0, y: 0, z: 0 },
      scale: 10,
      color: '#8b5cf6',
      animation: {
        property: 'rotation',
        from: { x: 0, y: 0, z: 0 },
        to: { x: 0, y: Math.PI * 2, z: 0 },
        duration: 4500,
        easing: 'linear',
      },
      params: {
        segments: 64,
        innerGlow: true,
      },
    },
  ],

  lighting: {
    ambient: {
      color: '#ffffff',
      intensity: 0.4,
    },
    pointLights: [
      {
        position: { x: 0, y: 0, z: 0 },
        color: '#8b5cf6',
        intensity: 3,
        distance: 30,
      },
      {
        position: { x: 5, y: 5, z: 5 },
        color: '#a78bfa',
        intensity: 1.5,
        distance: 20,
      },
    ],
  },

  background: {
    type: 'gradient',
    gradientColors: ['#1e1b4b', '#312e81', '#4c1d95'],
  },
};

/**
 * VARIANT 4: Matrix Decode
 * Digital matrix rain with glitch effects
 */
export const MATRIX_DECODE_CONFIG: CinematicConfig = {
  name: 'matrix_decode',
  displayName: 'Matrix Decode',
  duration: 3000,

  camera: {
    from: { x: 0, y: 0, z: 25 },
    to: { x: 0, y: 0, z: 5 },
    lookAt: 'center',
    fov: {
      from: 55,
      to: 50,
    },
    easing: easeInOutCubic,
  },

  particles: {
    count: 1500,
    color: ['#22c55e', '#10b981', '#84cc16'],
    size: 0.04,
    sizeVariation: 0.2,
    speed: 5,
    speedVariation: 0.3,
    lifetime: 2,
    pattern: 'rain',
    patternParams: {
      density: 'high',
      columns: 50,
      fallSpeed: 6,
    },
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  },

  effects: [
    {
      type: 'glitch',
      intensity: 0.8,
      frequency: 10, // 10 Hz
      duration: 3000,
    },
    {
      type: 'scanlines',
      intensity: 0.3,
      opacity: 0.3,
      count: 100,
    },
    {
      type: 'chromaticAberration',
      intensity: 1.5,
    },
  ],

  audio: {
    src: '/sounds/digital-decode.mp3',
    volume: 0.7,
    fadeIn: 150,
    fadeOut: 300,
  },

  visuals: [
    {
      type: 'grid',
      position: { x: 0, y: 0, z: -5 },
      scale: 20,
      color: '#22c55e',
      animation: {
        property: 'opacity',
        from: 0,
        to: 0.3,
        duration: 1500,
        easing: easeInOutCubic,
      },
      params: {
        divisions: 20,
        wireframe: true,
      },
    },
  ],

  lighting: {
    ambient: {
      color: '#22c55e',
      intensity: 0.6,
    },
    pointLights: [
      {
        position: { x: 0, y: 0, z: 5 },
        color: '#22c55e',
        intensity: 2,
        distance: 15,
      },
    ],
  },

  background: {
    type: 'color',
    color: '#000000',
  },
};

/**
 * VARIANT 5: Space Warp
 * Camera accelerates through light tunnel with star streaks
 */
export const SPACE_WARP_CONFIG: CinematicConfig = {
  name: 'space_warp',
  displayName: 'Space Warp',
  duration: 5000,

  camera: {
    from: { x: 0, y: 0, z: 100 },
    to: { x: 0, y: 0, z: 3 },
    lookAt: 'center',
    fov: {
      from: 80,
      to: 50,
    },
    easing: easeOutExpo,
  },

  particles: {
    count: 500,
    color: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ffffff'],
    size: 0.1,
    sizeVariation: 0.6,
    speed: 15,
    speedVariation: 0.5,
    lifetime: 4,
    pattern: 'streak',
    patternParams: {
      length: 20,
      cylindrical: true,
      radius: 15,
    },
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  },

  effects: [
    {
      type: 'motionBlur',
      intensity: 0.8,
      samples: 16,
    },
    {
      type: 'timeDilation',
      intensity: 0.3,
      speed: 2,
    },
    {
      type: 'bloom',
      intensity: 2.5,
      luminanceThreshold: 0.7,
      luminanceSmoothing: 0.9,
    },
  ],

  audio: {
    src: '/sounds/warp-drive.mp3',
    volume: 0.8,
    fadeIn: 400,
    fadeOut: 800,
  },

  visuals: [
    {
      type: 'tunnel',
      position: { x: 0, y: 0, z: 0 },
      scale: 20,
      color: '#8b5cf6',
      animation: {
        property: 'rotation',
        from: { x: 0, y: 0, z: 0 },
        to: { x: 0, y: 0, z: Math.PI * 4 },
        duration: 5000,
        easing: easeOutExpo,
      },
      params: {
        segments: 32,
        opacity: 0.3,
        wireframe: true,
      },
    },
  ],

  lighting: {
    ambient: {
      color: '#8b5cf6',
      intensity: 0.5,
    },
    pointLights: [
      {
        position: { x: 0, y: 0, z: 0 },
        color: '#8b5cf6',
        intensity: 4,
        distance: 50,
      },
    ],
  },

  background: {
    type: 'color',
    color: '#0a0014',
  },
};

/**
 * All cinematic configurations
 */
export const CINEMATIC_CONFIGS: Record<CinematicVariant, CinematicConfig> = {
  spiral_ascend: SPIRAL_ASCEND_CONFIG,
  particle_explosion: PARTICLE_EXPLOSION_CONFIG,
  portal_reveal: PORTAL_REVEAL_CONFIG,
  matrix_decode: MATRIX_DECODE_CONFIG,
  space_warp: SPACE_WARP_CONFIG,
};

/**
 * Get configuration for a specific variant
 */
export function getCinematicConfig(variant: CinematicVariant): CinematicConfig {
  return CINEMATIC_CONFIGS[variant];
}

/**
 * Get random cinematic variant
 */
export function getRandomVariant(): CinematicVariant {
  const variants = Object.keys(CINEMATIC_CONFIGS) as CinematicVariant[];
  return variants[Math.floor(Math.random() * variants.length)];
}

/**
 * Get all variant names
 */
export function getAllVariants(): CinematicVariant[] {
  return Object.keys(CINEMATIC_CONFIGS) as CinematicVariant[];
}
