/**
 * Particle Explosion Cinematic Variant
 * Camera zooms in while particles explode outward with shockwave
 * NOSONAR - R3F intrinsic JSX props: rotation, args, transparent, side, blending,
 * intensity, position, distance, decay - valid R3F/Three.js props, not HTML attributes.
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CinematicBase } from './CinematicBase';
import { PARTICLE_EXPLOSION_CONFIG } from '@/lib/cinematics/configs';
import * as THREE from 'three';
import { easeOutExpo } from '@/lib/cinematics/easing';

interface ParticleExplosionProps {
  readonly onComplete?: () => void;
  readonly particleCount?: number;
}

export function ParticleExplosion({ onComplete, particleCount }: ParticleExplosionProps) {
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const [startTime] = useState(() => performance.now());

  // Animate shockwave ring
  useFrame(() => {
    if (!shockwaveRef.current) return;

    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / PARTICLE_EXPLOSION_CONFIG.duration, 1);
    const t = easeOutExpo(progress);

    // Scale up ring
    const scale = 0.1 + t * 15;
    shockwaveRef.current.scale.setScalar(scale);

    // Fade out
    const material = shockwaveRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, 0.8 * (1 - t));
  });

  return (
    <CinematicBase
      config={PARTICLE_EXPLOSION_CONFIG}
      onComplete={onComplete}
      particleCount={particleCount}
    >
      {/* Shockwave Ring */}
      <mesh ref={shockwaveRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1, 64]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Central Flash */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </CinematicBase>
  );
}
