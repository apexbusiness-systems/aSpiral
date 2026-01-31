/* eslint-disable react/no-unknown-property */
import { Stars } from '@react-three/drei';
import { SPIRAL_ASCEND_CONFIG } from '@/lib/cinematics/configs';
import { CinematicWrapper } from './CinematicWrapper';

interface SpiralAscendProps {
  onComplete?: () => void;
  particleCount?: number;
}

export function SpiralAscend({ onComplete, particleCount }: SpiralAscendProps) {
  const config = SPIRAL_ASCEND_CONFIG;

  return (
    <CinematicWrapper
      config={config}
      onComplete={onComplete}
      particleCount={particleCount}
    >
      {/* Background Stars */}
      <Stars
        radius={config.background!.stars!.radius}
        depth={config.background!.stars!.depth}
        count={config.background!.stars!.count}
        factor={4}
        saturation={0}
        fade
        speed={config.background!.stars!.speed}
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
    </CinematicWrapper>
  );
}
