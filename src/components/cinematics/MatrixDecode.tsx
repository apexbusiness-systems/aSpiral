/* eslint-disable react/no-unknown-property */
import { MATRIX_DECODE_CONFIG } from '@/lib/cinematics/configs';
import { CinematicWrapper } from './CinematicWrapper';
import * as THREE from 'three';

interface MatrixDecodeProps {
  onComplete?: () => void;
  particleCount?: number;
}

export function MatrixDecode({ onComplete, particleCount }: MatrixDecodeProps) {
  return (
    <CinematicWrapper
      config={MATRIX_DECODE_CONFIG}
      onComplete={onComplete}
      particleCount={particleCount}
    >
      {/* Background Grid */}
      <mesh position={[0, 0, -5]} rotation={[0, 0, 0]}>
        <planeGeometry args={[40, 40, 20, 20]} />
        <meshBasicMaterial
          color="#22c55e"
          wireframe
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Vertical Grid Lines */}
      {Array.from({ length: 20 }).map((_, i) => {
        const x = (i - 10) * 2;
        return (
          <mesh key={`v-${i}`} position={[x, 0, -5]}>
            <boxGeometry args={[0.02, 40, 0.02]} />
            <meshBasicMaterial
              color="#10b981"
              transparent
              opacity={0.2}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}

      {/* Central Data Sphere */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#22c55e"
          wireframe
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </CinematicWrapper>
  );
}
