/**
 * ASPIRAL Cinematics
 * Export all cinematic components and utilities
 */

// Main Player
export { CinematicPlayer } from './CinematicPlayer';

// Thumbnail & Selector
export { CinematicThumbnail } from './CinematicThumbnail';
export { CinematicSelector } from './CinematicSelector';

// Individual Variants
export { SpiralAscend } from './SpiralAscend';
export { ParticleExplosion } from './ParticleExplosion';
export { PortalReveal } from './PortalReveal';
export { MatrixDecode } from './MatrixDecode';
export { SpaceWarp } from './SpaceWarp';

// Re-export types
export type {
  CinematicPlayerProps,
  CinematicVariant,
  CinematicConfig,
} from '@/lib/cinematics/types';

// Re-export utilities
export { getCinematicConfig, getRandomVariant, getAllVariants } from '@/lib/cinematics/configs';
