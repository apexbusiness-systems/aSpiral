/**
 * Breakthrough Fallback - Lightweight Clarity Pulse Effect
 * Safe mode fallback when main breakthrough effects fail or device is low-tier
 * NOSONAR - R3F intrinsic JSX props: args, transparent, rotation, side, intensity, position
 * are valid R3F/Three.js props, not standard HTML attributes.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BreakthroughFallbackProps {
  readonly onComplete: () => void;
  readonly duration?: number;
  readonly color?: string;
}

export function BreakthroughFallback({
  onComplete,
  duration = 3000,
  color = '#60a5fa',
}: BreakthroughFallbackProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const hasCompleted = useRef(false);
  
  // Simple pulsing rings
  const ringCount = 4;
  const ringRefs = useRef<THREE.Mesh[]>([]);
  
  useFrame(() => {
    const elapsed = Date.now() - startTime.current;
    const progress = Math.min(elapsed / duration, 1);
    
    // Complete when duration reached
    if (progress >= 1 && !hasCompleted.current) {
      hasCompleted.current = true;
      onComplete();
      return;
    }
    
    // Animate rings
    ringRefs.current.forEach((ring, i) => {
      if (!ring) return;
      
      const offset = i / ringCount;
      const phase = (progress + offset) % 1;
      
      // Scale from 0 to 2, then fade out
      ring.scale.setScalar(0.5 + phase * 2);
      
      // Fade in then out
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.sin(phase * Math.PI) * 0.6;
      
      // Gentle rotation
      ring.rotation.z = phase * Math.PI * 0.5;
    });
    
    // Gentle group rotation
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });
  
  // Parse color
  const threeColor = new THREE.Color(color);
  
  return (
    <group ref={groupRef}>
      {/* Central glow sphere */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Pulsing rings */}
      {Array.from({ length: ringCount }).map((_, i) => (
        <mesh
          key={i}
          ref={(ref) => {
            if (ref) ringRefs.current[i] = ref;
          }}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.8, 1.0, 32]} />
          <meshBasicMaterial
            color={threeColor}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      
      {/* Ambient light for visibility */}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={1} color={threeColor} />
    </group>
  );
}
