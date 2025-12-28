/**
 * Space Warp Cinematic Variant
 * Camera accelerates through light tunnel with star streaks
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraController } from '@/lib/cinematics/CameraController';
import { ParticleSystem } from '@/lib/cinematics/ParticleSystem';
import { SPACE_WARP_CONFIG } from '@/lib/cinematics/configs';
import type { CameraControllerRef, ParticleSystemRef } from '@/lib/cinematics/types';
import * as THREE from 'three';
import { easeOutExpo } from '@/lib/cinematics/easing';

interface SpaceWarpProps {
  onComplete?: () => void;
  particleCount?: number;
}

export function SpaceWarp({ onComplete, particleCount }: SpaceWarpProps) {
  const cameraRef = useRef<CameraControllerRef>(null);
  const particlesRef = useRef<ParticleSystemRef>(null);
  const tunnelRef = useRef<THREE.Group>(null);
  const [startTime] = useState(() => performance.now());

  const config = SPACE_WARP_CONFIG;
  const actualParticleCount = particleCount || config.particles!.count;

  // Rotate tunnel
  useFrame(() => {
    if (!tunnelRef.current) return;

    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / config.duration, 1);
    const t = easeOutExpo(progress);

    tunnelRef.current.rotation.z = t * Math.PI * 4;
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

      {/* Star Streak Particles */}
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

      {/* Light Tunnel */}
      <group ref={tunnelRef}>
        {/* Tunnel rings */}
        {Array.from({ length: 20 }).map((_, i) => {
          const z = i * 5;
          const scale = 1 + i * 0.1;

          return (
            <mesh key={i} position={[0, 0, -z]} scale={[scale, scale, 1]}>
              <torusGeometry args={[10, 0.1, 8, 32]} />
              <meshBasicMaterial
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
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[20, 10, 100, 32, 1, true]} />
          <meshBasicMaterial
            color="#8b5cf6"
            wireframe
            transparent
            opacity={0.15}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
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

      {/* Central Destination Point */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
