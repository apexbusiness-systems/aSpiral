/**
 * Particle System for ASPIRAL Cinematics
 * GPU-accelerated instanced rendering for thousands of particles
 */

import { useRef, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ParticleConfig, ParticleSystemRef } from './types';

interface ParticleSystemProps extends ParticleConfig {
  /** Auto-start animation */
  autoStart?: boolean;
  /** Loop animation */
  loop?: boolean;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export const ParticleSystem = forwardRef<ParticleSystemRef, ParticleSystemProps>(
  (
    {
      count,
      color,
      size,
      sizeVariation = 0.3,
      speed,
      speedVariation = 0.5,
      lifetime = 3,
      pattern,
      patternParams = {},
      opacity = 0.8,
      blending = THREE.AdditiveBlending,
      autoStart = true,
      loop = false,
    },
    ref
  ) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const particles = useRef<Particle[]>([]);
    const isActive = useRef(autoStart);
    const tempObject = useMemo(() => new THREE.Object3D(), []);
    const tempColor = useMemo(() => new THREE.Color(), []);

    // Parse colors
    const colors = useMemo(() => {
      const colorArray = Array.isArray(color) ? color : [color];
      return colorArray.map((c) => (typeof c === 'string' ? new THREE.Color(c) : c));
    }, [color]);

    // Initialize particles
    useEffect(() => {
      particles.current = [];

      for (let i = 0; i < count; i++) {
        const particle = createParticle(
          pattern,
          patternParams,
          colors,
          size,
          sizeVariation,
          speed,
          speedVariation,
          lifetime
        );
        particles.current.push(particle);
      }

      updateInstancedMesh();
    }, [count, pattern, patternParams, colors, size, sizeVariation, speed, speedVariation, lifetime]);

    // Expose control methods
    useImperativeHandle(ref, () => ({
      reset: () => {
        particles.current = [];
        for (let i = 0; i < count; i++) {
          const particle = createParticle(
            pattern,
            patternParams,
            colors,
            size,
            sizeVariation,
            speed,
            speedVariation,
            lifetime
          );
          particles.current.push(particle);
        }
        updateInstancedMesh();
      },
      setParticleCount: (newCount: number) => {
        // Adjust particle count dynamically
        const diff = newCount - particles.current.length;
        if (diff > 0) {
          // Add particles
          for (let i = 0; i < diff; i++) {
            const particle = createParticle(
              pattern,
              patternParams,
              colors,
              size,
              sizeVariation,
              speed,
              speedVariation,
              lifetime
            );
            particles.current.push(particle);
          }
        } else if (diff < 0) {
          // Remove particles
          particles.current.splice(newCount);
        }
      },
      dispose: () => {
        particles.current = [];
        if (meshRef.current) {
          meshRef.current.geometry.dispose();
          if (Array.isArray(meshRef.current.material)) {
            meshRef.current.material.forEach((m) => m.dispose());
          } else {
            meshRef.current.material.dispose();
          }
        }
      },
    }));

    // Animation loop
    useFrame((_, delta) => {
      if (!isActive.current || !meshRef.current) return;

      const mesh = meshRef.current;

      particles.current.forEach((particle, i) => {
        // Update life
        particle.life -= delta;

        // Reset particle if dead (only if looping)
        if (particle.life <= 0) {
          if (loop) {
            const newParticle = createParticle(
              pattern,
              patternParams,
              colors,
              size,
              sizeVariation,
              speed,
              speedVariation,
              lifetime
            );
            particles.current[i] = newParticle;
            particle.life = newParticle.life;
            particle.position.copy(newParticle.position);
            particle.velocity.copy(newParticle.velocity);
          } else {
            // Hide dead particle
            tempObject.position.set(0, -10000, 0);
            tempObject.scale.setScalar(0);
            tempObject.updateMatrix();
            mesh.setMatrixAt(i, tempObject.matrix);
            return;
          }
        }

        // Update position
        particle.position.add(particle.velocity.clone().multiplyScalar(delta));

        // Update scale based on life (fade out)
        const lifeRatio = particle.life / particle.maxLife;
        const scale = particle.size * lifeRatio;

        // Apply pattern-specific updates
        applyPatternUpdate(particle, pattern, patternParams, delta);

        // Update instance matrix
        tempObject.position.copy(particle.position);
        tempObject.scale.setScalar(scale);
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);

        // Update instance color
        tempColor.copy(particle.color);
        mesh.setColorAt(i, tempColor);
      });

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    });

    // Update instanced mesh
    function updateInstancedMesh() {
      if (!meshRef.current) return;

      const mesh = meshRef.current;

      particles.current.forEach((particle, i) => {
        tempObject.position.copy(particle.position);
        tempObject.scale.setScalar(particle.size);
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);

        tempColor.copy(particle.color);
        mesh.setColorAt(i, tempColor);
      });

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }

    return (
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial
          transparent
          opacity={opacity}
          blending={blending}
          depthWrite={false}
        />
      </instancedMesh>
    );
  }
);

ParticleSystem.displayName = 'ParticleSystem';

/**
 * Create a single particle based on pattern
 */
function createParticle(
  pattern: string,
  patternParams: Record<string, unknown>,
  colors: THREE.Color[],
  size: number,
  sizeVariation: number,
  speed: number,
  speedVariation: number,
  lifetime: number
): Particle {
  const color = colors[Math.floor(Math.random() * colors.length)];
  const particleSize = size * (1 + (Math.random() - 0.5) * sizeVariation);
  const particleSpeed = speed * (1 + (Math.random() - 0.5) * speedVariation);
  const life = lifetime * (0.8 + Math.random() * 0.4);

  let position: THREE.Vector3;
  let velocity: THREE.Vector3;

  switch (pattern) {
    case 'vortex': {
      const radius = (patternParams.radius as number) || 5;
      const height = (patternParams.height as number) || 15;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const y = Math.random() * height - height / 2;

      position = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);

      // Spiral upward velocity
      const tangentX = -Math.sin(angle);
      const tangentZ = Math.cos(angle);
      velocity = new THREE.Vector3(tangentX, 2, tangentZ).normalize().multiplyScalar(particleSpeed);
      break;
    }

    case 'explosion': {
      const spherical = (patternParams.spherical as boolean) || true;
      const initialRadius = (patternParams.initialRadius as number) || 0.5;

      position = new THREE.Vector3(
        (Math.random() - 0.5) * initialRadius,
        (Math.random() - 0.5) * initialRadius,
        (Math.random() - 0.5) * initialRadius
      );

      if (spherical) {
        // Spherical explosion
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        velocity = new THREE.Vector3(
          Math.sin(theta) * Math.cos(phi),
          Math.sin(theta) * Math.sin(phi),
          Math.cos(theta)
        ).multiplyScalar(particleSpeed);
      } else {
        // Random direction
        velocity = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        )
          .normalize()
          .multiplyScalar(particleSpeed);
      }
      break;
    }

    case 'rain': {
      const density = (patternParams.density as string) || 'medium';
      const columns = (patternParams.columns as number) || 30;
      const fallSpeed = (patternParams.fallSpeed as number) || 5;

      const spread = density === 'high' ? 20 : density === 'medium' ? 15 : 10;
      const col = Math.floor(Math.random() * columns);
      const colWidth = spread / columns;

      position = new THREE.Vector3(
        col * colWidth - spread / 2 + (Math.random() - 0.5) * colWidth,
        10 + Math.random() * 10,
        (Math.random() - 0.5) * spread
      );

      velocity = new THREE.Vector3(0, -fallSpeed, 0);
      break;
    }

    case 'streak': {
      const length = (patternParams.length as number) || 20;
      const cylindrical = (patternParams.cylindrical as boolean) || true;
      const radius = (patternParams.radius as number) || 15;

      if (cylindrical) {
        const angle = Math.random() * Math.PI * 2;
        const r = radius + (Math.random() - 0.5) * 5;
        position = new THREE.Vector3(Math.cos(angle) * r, (Math.random() - 0.5) * 10, Math.sin(angle) * r);
      } else {
        position = new THREE.Vector3(
          (Math.random() - 0.5) * radius * 2,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * radius * 2
        );
      }

      // Move towards center
      velocity = position
        .clone()
        .negate()
        .normalize()
        .multiplyScalar(particleSpeed);
      break;
    }

    case 'ring': {
      const radius = (patternParams.radius as number) || 10;
      const thickness = (patternParams.thickness as number) || 2;
      const angle = Math.random() * Math.PI * 2;
      const r = radius + (Math.random() - 0.5) * thickness;

      position = new THREE.Vector3(Math.cos(angle) * r, (Math.random() - 0.5) * thickness, Math.sin(angle) * r);

      // Tangential velocity (rotation)
      velocity = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(particleSpeed);
      break;
    }

    case 'spiral':
    default: {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 5;
      const y = Math.random() * 10;

      position = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
      velocity = new THREE.Vector3(
        -Math.sin(angle) * particleSpeed,
        particleSpeed * 0.5,
        Math.cos(angle) * particleSpeed
      );
      break;
    }
  }

  return {
    position,
    velocity,
    life,
    maxLife: life,
    size: particleSize,
    color: color.clone(),
  };
}

/**
 * Apply pattern-specific updates each frame
 */
function applyPatternUpdate(
  particle: Particle,
  pattern: string,
  patternParams: Record<string, unknown>,
  delta: number
) {
  switch (pattern) {
    case 'vortex': {
      const rotationSpeed = (patternParams.rotationSpeed as number) || 2;
      // Apply rotational force
      const angle = Math.atan2(particle.position.z, particle.position.x);
      const newAngle = angle + rotationSpeed * delta;
      const radius = Math.sqrt(particle.position.x ** 2 + particle.position.z ** 2);

      particle.position.x = Math.cos(newAngle) * radius;
      particle.position.z = Math.sin(newAngle) * radius;
      break;
    }

    case 'ring': {
      const rotationSpeed = (patternParams.rotationSpeed as number) || 1.5;
      const angle = Math.atan2(particle.position.z, particle.position.x);
      const newAngle = angle + rotationSpeed * delta;
      const radius = Math.sqrt(particle.position.x ** 2 + particle.position.z ** 2);

      particle.position.x = Math.cos(newAngle) * radius;
      particle.position.z = Math.sin(newAngle) * radius;
      break;
    }

    case 'explosion':
      // Apply gravity
      particle.velocity.y -= 2 * delta;
      break;

    default:
      break;
  }
}
