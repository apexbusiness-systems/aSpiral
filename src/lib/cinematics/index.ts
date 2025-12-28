/**
 * ASPIRAL Cinematics Library
 * Core utilities and components for cinematic breakthrough reveals
 */

// Components
export { CameraController } from './CameraController';
export { ParticleSystem } from './ParticleSystem';

// Audio
export { AudioManager, createAudioManager, preloadAudioFiles } from './AudioManager';

// Configurations
export {
  getCinematicConfig,
  getRandomVariant,
  getAllVariants,
  CINEMATIC_CONFIGS,
  SPIRAL_ASCEND_CONFIG,
  PARTICLE_EXPLOSION_CONFIG,
  PORTAL_REVEAL_CONFIG,
  MATRIX_DECODE_CONFIG,
  SPACE_WARP_CONFIG,
} from './configs';

// Easing Functions
export * from './easing';

// Types
export type * from './types';
