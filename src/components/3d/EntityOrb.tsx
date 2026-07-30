import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Float } from "@react-three/drei";
import * as THREE from "three";
import type { Entity } from "@/lib/types";

// NOSONAR - R3F intrinsic JSX props: position, args, emissive, emissiveIntensity,
// transparent, roughness, metalness, intensity, distance - valid R3F props, not HTML.

interface EntityOrbProps {
  readonly entity: Entity;
  readonly position: [number, number, number];
  readonly onClick?: (entity: Entity) => void;
}

const entityColors: Record<string, string> = {
  problem: "#ef4444",     // Red
  emotion: "#8b5cf6",     // Purple  
  value: "#10b981",       // Emerald
  action: "#3b82f6",      // Blue
  friction: "#f97316",    // Orange
  grease: "#22c55e",      // Green
};

const entitySizes: Record<string, number> = {
  problem: 0.4,
  emotion: 0.35,
  value: 0.3,
  action: 0.35,
  friction: 0.5,
  grease: 0.45,
};

export function EntityOrb({ entity, position, onClick }: EntityOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const color = entityColors[entity.type] || "#ffffff";
  const size = entitySizes[entity.type] || 0.3;
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle pulsing effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05;
      meshRef.current.scale.setScalar(hovered ? scale * 1.2 : scale);
    }
  });

  return (
    <Float
      speed={2}
      rotationIntensity={0.5}
      floatIntensity={0.5}
      floatingRange={[-0.1, 0.1]}
    >
      <group position={position}>
        {/* Main orb */}
        <mesh
          ref={meshRef}
          onClick={() => onClick?.(entity)}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[size, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.8 : 0.4}
            transparent
            opacity={0.9}
            roughness={0.2}
            metalness={0.3}
          />
        </mesh>
        
        {/* Glow effect */}
        <mesh scale={1.3}>
          <sphereGeometry args={[size, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={hovered ? 0.3 : 0.15}
          />
        </mesh>
        
        {/* Label */}
        <Text
          position={[0, size + 0.3, 0]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
        >
          {entity.label}
        </Text>
        
        {/* Type indicator */}
        <Text
          position={[0, size + 0.15, 0]}
          fontSize={0.08}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          {entity.type.toUpperCase()}
        </Text>
      </group>
    </Float>
  );
}
