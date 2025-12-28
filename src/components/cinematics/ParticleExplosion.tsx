/**
 * Particle Explosion Cinematic Variant
 * Camera zooms in while particles explode outward with shockwave
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraController } from '@/lib/cinematics/CameraController';
import { ParticleSystem } from '@/lib/cinematics/ParticleSystem';
import { PARTICLE_EXPLOSION_CONFIG } from '@/lib/cinematics/configs';
import type { CameraControllerRef, ParticleSystemRef } from '@/lib/cinematics/types';
import * as THREE from 'three';
import { easeOutExpo } from '@/lib/cinematics/easing';

interface ParticleExplosionProps {
  onComplete?: () => void;
  particleCount?: number;
}

export function ParticleExplosion({ onComplete, particleCount }: ParticleExplosionProps) {
  const cameraRef = useRef<CameraControllerRef>(null);
  const particlesRef = useRef<ParticleSystemRef>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const [startTime] = useState(() => performance.now());

  const config = PARTICLE_EXPLOSION_CONFIG;
  const actualParticleCount = particleCount || config.particles!.count;

  // Animate shockwave ring
  useFrame(() => {
    if (!shockwaveRef.current) return;

    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / config.duration, 1);
    const t = easeOutExpo(progress);

    // Scale up ring
    const scale = 0.1 + t * 15;
    shockwaveRef.current.scale.setScalar(scale);

    // Fade out
    const material = shockwaveRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, 0.8 * (1 - t));
  });

  return (
    <group>
      {/* Camera Animation */}
      <CameraController
        ref={cameraRef}
        path={config.camera}
        duration={config.duration}
        onComplete={onComplete}
      />

      {/* Explosion Particles */}
      <ParticleSystem
        ref={particlesRef}
        count={actualParticleCount}
        color={config.particles!.color}
        size={config.particles!.size}
        sizeVariation={config.particles!.sizeVariation}
        speed={config.particles!.speed}
        speedVariation={config.particles!.speedVariation}
        lifetime={config.particles!.lifetime}
        pattern={config.particles!.pattern}
        patternParams={config.particles!.patternParams}
        opacity={config.particles!.opacity}
        blending={config.particles!.blending}
      />

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

      {/* Lighting */}
      <ambientLight
        intensity={config.lighting!.ambient!.intensity}
        color={config.lighting!.ambient!.color}
      />
      {config.lighting!.pointLights!.map((light, i) => (
        <pointLight
          key={i}
          position={[light.position.x, light.position.y, light.position.z]}
          color={light.color}
          intensity={light.intensity}
          distance={light.distance}
          decay={light.decay}
        />
      ))}

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
    </group>
  );
}
