/**
 * Portal Reveal Cinematic Variant
 * Camera glides through rotating portal ring with energy particles
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraController } from '@/lib/cinematics/CameraController';
import { ParticleSystem } from '@/lib/cinematics/ParticleSystem';
import { PORTAL_REVEAL_CONFIG } from '@/lib/cinematics/configs';
import type { CameraControllerRef, ParticleSystemRef } from '@/lib/cinematics/types';
import * as THREE from 'three';

interface PortalRevealProps {
  onComplete?: () => void;
  particleCount?: number;
}

export function PortalReveal({ onComplete, particleCount }: PortalRevealProps) {
  const cameraRef = useRef<CameraControllerRef>(null);
  const particlesRef = useRef<ParticleSystemRef>(null);
  const portalRef = useRef<THREE.Group>(null);
  const [startTime] = useState(() => performance.now());

  const config = PORTAL_REVEAL_CONFIG;
  const actualParticleCount = particleCount || config.particles!.count;

  // Rotate portal
  useFrame(() => {
    if (!portalRef.current) return;

    const elapsed = performance.now() - startTime;
    const progress = elapsed / config.duration;

    portalRef.current.rotation.y = progress * Math.PI * 2;
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

      {/* Ring Particles */}
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
        loop
      />

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
        />
      ))}
    </group>
  );
}
