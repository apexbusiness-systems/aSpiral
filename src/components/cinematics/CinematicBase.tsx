import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { CameraController } from '@/lib/cinematics/CameraController';
import { ParticleSystem } from '@/lib/cinematics/ParticleSystem';
import type { CameraControllerRef, ParticleSystemRef, CinematicConfig } from '@/lib/cinematics/types';

export interface CinematicBaseProps {
  readonly config: CinematicConfig;
  readonly onComplete?: () => void;
  readonly particleCount?: number;
  readonly enableShake?: boolean;
  readonly shakeIntensity?: number;
  readonly children?: React.ReactNode;
}

export interface CinematicBaseRef {
  readonly cameraRef: React.RefObject<CameraControllerRef | null>;
  readonly particlesRef: React.RefObject<ParticleSystemRef | null>;
}

export const CinematicBase = forwardRef<CinematicBaseRef, CinematicBaseProps>(({
  config,
  onComplete,
  particleCount,
  enableShake,
  shakeIntensity,
  children
}, ref) => {
  const cameraRef = useRef<CameraControllerRef>(null);
  const particlesRef = useRef<ParticleSystemRef>(null);

  useImperativeHandle(ref, () => ({
    cameraRef,
    particlesRef
  }));

  const actualParticleCount = particleCount || (config.particles?.count ?? 0);

  return (
    <group>
      {/* Camera Animation */}
      {config.camera && (
        <CameraController
          ref={cameraRef}
          path={config.camera}
          duration={config.duration}
          onComplete={onComplete}
          enableShake={enableShake}
          shakeIntensity={shakeIntensity}
        />
      )}

      {/* Particles */}
      {config.particles && actualParticleCount > 0 && (
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
        />
      ))}

      {/* Custom Geometry / Specific Effects */}
      {children}
    </group>
  );
});

CinematicBase.displayName = 'CinematicBase';
