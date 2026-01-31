/* eslint-disable react/no-unknown-property */
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { PORTAL_REVEAL_CONFIG } from '@/lib/cinematics/configs';
import { CinematicWrapper } from './CinematicWrapper';
import * as THREE from 'three';

interface PortalRevealProps {
  onComplete?: () => void;
  particleCount?: number;
}

export function PortalReveal({ onComplete, particleCount }: PortalRevealProps) {
  const portalRef = useRef<THREE.Group>(null);
  const [startTime] = useState(() => performance.now());

  const config = PORTAL_REVEAL_CONFIG;

  // Rotate portal
  useFrame(() => {
    if (!portalRef.current) return;

    const elapsed = performance.now() - startTime;
    const progress = elapsed / config.duration;

    portalRef.current.rotation.y = progress * Math.PI * 2;
  });

  return (
    <CinematicWrapper
      config={config}
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
            <mesh key={i} position={[x, 0, z]} rotation={[Math.PI / 2, 0, angle]}>
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
    </CinematicWrapper>
  );
}
