/**
 * Matrix Decode Cinematic Variant
 * Digital matrix rain with grid and glitch effects
 */

import { useRef } from 'react';
import { CameraController } from '@/lib/cinematics/CameraController';
import { ParticleSystem } from '@/lib/cinematics/ParticleSystem';
import { MATRIX_DECODE_CONFIG } from '@/lib/cinematics/configs';
import type { CameraControllerRef, ParticleSystemRef } from '@/lib/cinematics/types';
import * as THREE from 'three';

interface MatrixDecodeProps {
  onComplete?: () => void;
  particleCount?: number;
}

export function MatrixDecode({ onComplete, particleCount }: MatrixDecodeProps) {
  const cameraRef = useRef<CameraControllerRef>(null);
  const particlesRef = useRef<ParticleSystemRef>(null);

  const config = MATRIX_DECODE_CONFIG;
  const actualParticleCount = particleCount || config.particles!.count;

  return (
    <group>
      {/* Camera Animation */}
      <CameraController
        ref={cameraRef}
        path={config.camera}
        duration={config.duration}
        onComplete={onComplete}
      />

      {/* Matrix Rain Particles */}
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

      {/* Background Grid */}
      <mesh position={[0, 0, -5]} rotation={[0, 0, 0]}>
        <planeGeometry args={[40, 40, 20, 20]} />
        <meshBasicMaterial
          color="#22c55e"
          wireframe
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Vertical Grid Lines */}
      {Array.from({ length: 20 }).map((_, i) => {
        const x = (i - 10) * 2;
        return (
          <mesh key={`v-${i}`} position={[x, 0, -5]}>
            <boxGeometry args={[0.02, 40, 0.02]} />
            <meshBasicMaterial
              color="#10b981"
              transparent
              opacity={0.2}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}

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

      {/* Central Data Sphere */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#22c55e"
          wireframe
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
