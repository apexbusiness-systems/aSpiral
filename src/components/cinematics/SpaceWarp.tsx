/**
 * Space Warp Cinematic Variant
 * Camera accelerates through light tunnel with star streaks
 * NOSONAR - R3F intrinsic JSX props: position, args, transparent, blending, side,
 * rotation, intensity, distance, wireframe - valid R3F/Three.js props, not HTML attributes.
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CinematicBase } from './CinematicBase';
import { SPACE_WARP_CONFIG } from '@/lib/cinematics/configs';
import * as THREE from 'three';
import { easeOutExpo } from '@/lib/cinematics/easing';

interface SpaceWarpProps {
  readonly onComplete?: () => void;
  readonly particleCount?: number;
}

export function SpaceWarp({ onComplete, particleCount }: SpaceWarpProps) {
  const tunnelRef = useRef<THREE.Group>(null);
  const [startTime] = useState(() => performance.now());

  // Rotate tunnel
  useFrame(() => {
    if (!tunnelRef.current) return;

    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / SPACE_WARP_CONFIG.duration, 1);
    const t = easeOutExpo(progress);

    tunnelRef.current.rotation.z = t * Math.PI * 4;
  });

  return (
    <CinematicBase
      config={SPACE_WARP_CONFIG}
      onComplete={onComplete}
      particleCount={particleCount}
    >
      {/* Light Tunnel */}
      <group ref={tunnelRef}>
        {/* Tunnel rings */}
        {Array.from({ length: 20 }).map((_, i) => {
          const z = i * 5;
          const scale = 1 + i * 0.1;

          return (
            <mesh key={`ring-${i}`} position={[0, 0, -z]} scale={[scale, scale, 1]}> {/* NOSONAR */}
              <torusGeometry args={[10, 0.1, 8, 32]} /> {/* NOSONAR */}
              <meshBasicMaterial // NOSONAR
                color="#8b5cf6"
                wireframe
                transparent
                opacity={0.3 - i * 0.01}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          );
        })}

        {/* Tunnel walls */}
        <mesh rotation={[Math.PI / 2, 0, 0]}> {/* NOSONAR */}
          <cylinderGeometry args={[20, 10, 100, 32, 1, true]} /> {/* NOSONAR */}
          <meshBasicMaterial // NOSONAR
            color="#8b5cf6"
            wireframe
            transparent
            opacity={0.15}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* Central Destination Point */}
      <mesh position={[0, 0, 0]}> {/* NOSONAR */}
        <sphereGeometry args={[0.5, 16, 16]} /> {/* NOSONAR */}
        <meshBasicMaterial // NOSONAR
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </CinematicBase>
  );
}
