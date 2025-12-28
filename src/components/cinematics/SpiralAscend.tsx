/**
 * Spiral Ascend Cinematic Variant
 * Camera spirals upward with green vortex particles
 */

import { useRef } from 'react';
import { Stars } from '@react-three/drei';
import { CameraController } from '@/lib/cinematics/CameraController';
import { ParticleSystem } from '@/lib/cinematics/ParticleSystem';
import { SPIRAL_ASCEND_CONFIG } from '@/lib/cinematics/configs';
import type { CameraControllerRef, ParticleSystemRef } from '@/lib/cinematics/types';

interface SpiralAscendProps {
  onComplete?: () => void;
  particleCount?: number;
}

export function SpiralAscend({ onComplete, particleCount }: SpiralAscendProps) {
  const cameraRef = useRef<CameraControllerRef>(null);
  const particlesRef = useRef<ParticleSystemRef>(null);

  const config = SPIRAL_ASCEND_CONFIG;
  const actualParticleCount = particleCount || config.particles!.count;

  return (
    <group>
      {/* Camera Animation */}
      <CameraController
        ref={cameraRef}
        path={config.camera}
        duration={config.duration}
        onComplete={onComplete}
        enableShake
        shakeIntensity={0.3}
      />

      {/* Vortex Particles */}
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
    </group>
  );
}
