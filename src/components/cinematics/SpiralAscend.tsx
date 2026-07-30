/**
 * Spiral Ascend Cinematic Variant
 * Camera spirals upward with green vortex particles
 * NOSONAR - R3F intrinsic JSX props: position, args, transparent, emissive,
 * emissiveIntensity, intensity, distance - valid R3F/Three.js props, not HTML attributes.
 */

import { Stars } from '@react-three/drei';
import { CinematicBase } from './CinematicBase';
import { SPIRAL_ASCEND_CONFIG } from '@/lib/cinematics/configs';

interface SpiralAscendProps {
  readonly onComplete?: () => void;
  readonly particleCount?: number;
}

export function SpiralAscend({ onComplete, particleCount }: SpiralAscendProps) {
  return (
    <CinematicBase
      config={SPIRAL_ASCEND_CONFIG}
      onComplete={onComplete}
      particleCount={particleCount}
      enableShake={true}
      shakeIntensity={0.3}
    >
      {/* Background Stars */}
      <Stars
        radius={SPIRAL_ASCEND_CONFIG.background!.stars!.radius}
        depth={SPIRAL_ASCEND_CONFIG.background!.stars!.depth}
        count={SPIRAL_ASCEND_CONFIG.background!.stars!.count}
        factor={4}
        saturation={0}
        fade
        speed={SPIRAL_ASCEND_CONFIG.background!.stars!.speed}
      />

      {/* Central Vortex Indicator */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.5, 0.05, 16, 100]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={1.5}
          transparent
          opacity={0.8}
        />
      </mesh>
    </CinematicBase>
  );
}
