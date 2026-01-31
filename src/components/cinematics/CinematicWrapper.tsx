/* eslint-disable react/no-unknown-property */
import { useRef, ReactNode } from 'react';
import { CameraController } from '@/lib/cinematics/CameraController';
import { ParticleSystem } from '@/lib/cinematics/ParticleSystem';
import type { CameraControllerRef, ParticleSystemRef, CinematicConfig } from '@/lib/cinematics/types';

interface CinematicWrapperProps {
  config: CinematicConfig;
  onComplete?: () => void;
  particleCount?: number;
  children?: ReactNode;
}

export function CinematicWrapper({ config, onComplete, particleCount, children }: CinematicWrapperProps) {
  const cameraRef = useRef<CameraControllerRef>(null);
  const particlesRef = useRef<ParticleSystemRef>(null);

  const actualParticleCount = particleCount || config.particles?.count || 1000;

  return (
    <group>
      {/* Camera Animation */}
      <CameraController
        ref={cameraRef}
        path={config.camera}
        duration={config.duration}
        onComplete={onComplete}
      />

      {/* Particles */}
      {config.particles && (
        <ParticleSystem
          ref={particlesRef}
          count={actualParticleCount}
          color={config.particles.color}
          size={config.particles.size}
          sizeVariation={config.particles.sizeVariation}
          speed={config.particles.speed}
          speedVariation={config.particles.speedVariation}
          lifetime={config.particles.lifetime}
          pattern={config.particles.pattern}
          patternParams={config.particles.patternParams}
          opacity={config.particles.opacity}
          blending={config.particles.blending}
          loop
        />
      )}

      {/* Lighting */}
      {config.lighting?.ambient && (
        <ambientLight
          intensity={config.lighting.ambient.intensity}
          color={config.lighting.ambient.color}
        />
      )}

      {config.lighting?.pointLights?.map((light, i) => (
        <pointLight
          key={i}
          position={[light.position.x, light.position.y, light.position.z]}
          color={light.color}
          intensity={light.intensity}
          distance={light.distance}
          decay={light.decay}
        />
      ))}

      {/* Variant-specific content */}
      {children}
    </group>
  );
}
