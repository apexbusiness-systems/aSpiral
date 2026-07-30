/**
 * Portal Reveal Cinematic Variant
 * Camera glides through rotating portal ring with energy particles
 * NOSONAR - R3F intrinsic JSX props: rotation, args, transparent, blending, position,
 * intensity, distance - valid R3F/Three.js props, not standard HTML attributes.
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CinematicBase } from './CinematicBase';
import { PORTAL_REVEAL_CONFIG } from '@/lib/cinematics/configs';
import * as THREE from 'three';

interface PortalRevealProps {
  readonly onComplete?: () => void;
  readonly particleCount?: number;
}

export function PortalReveal({ onComplete, particleCount }: PortalRevealProps) {
  const portalRef = useRef<THREE.Group>(null);
  const [startTime] = useState(() => performance.now());

  // Rotate portal
  useFrame(() => {
    if (!portalRef.current) return;

    const elapsed = performance.now() - startTime;
    const progress = elapsed / PORTAL_REVEAL_CONFIG.duration;

    portalRef.current.rotation.y = progress * Math.PI * 2;
  });

  return (
    <CinematicBase
      config={PORTAL_REVEAL_CONFIG}
      onComplete={onComplete}
      particleCount={particleCount}
    >
      {/* Portal Ring */}
      <group ref={portalRef}>
        {/* Outer ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[10, 0.3, 16, 100]} />
          <meshBasicMaterial
            color="#8b5cf6"
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Inner glow ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[10, 0.5, 16, 100]} />
          <meshBasicMaterial
            color="#a78bfa"
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Energy tendrils */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const x = Math.cos(angle) * 10;
          const z = Math.sin(angle) * 10;

          return (
            <mesh key={`tendril-${i}`} position={[x, 0, z]} rotation={[Math.PI / 2, 0, angle]}>
              <cylinderGeometry args={[0.05, 0.05, 2, 8]} />
              <meshBasicMaterial
                color="#c4b5fd"
                transparent
                opacity={0.5}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          );
        })}
      </group>
    </CinematicBase>
  );
}
