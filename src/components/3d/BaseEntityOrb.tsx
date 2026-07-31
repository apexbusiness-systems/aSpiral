import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Float } from "@react-three/drei";
import * as THREE from "three";
import type { Entity } from "@/lib/types";

// NOSONAR - R3F intrinsic JSX props: position, args, emissive, emissiveIntensity,
// transparent, roughness, metalness, intensity, distance - valid R3F props, not HTML.

export interface BaseEntityOrbProps {
  readonly entity: Entity;
  readonly position: [number, number, number];
  readonly onClick?: (entity: Entity) => void;
  readonly onHover?: (hovered: boolean) => void;
  readonly children?: React.ReactNode;
  readonly floatSpeed?: number;
  readonly customColor?: string;
  readonly customSize?: number;
  readonly customGeometry?: React.ReactNode;
  readonly customMaterial?: React.ReactNode;
  readonly hideDefaultLabel?: boolean;
  readonly groupRef?: React.RefObject<THREE.Group>;
}

export const entityColors: Record<string, string> = {
  problem: "#ef4444",     // Red
  emotion: "#8b5cf6",     // Purple  
  value: "#10b981",       // Emerald
  action: "#3b82f6",      // Blue
  friction: "#f97316",    // Orange
  grease: "#22c55e",      // Green
};

export const entitySizes: Record<string, number> = {
  problem: 0.4,
  emotion: 0.35,
  value: 0.3,
  action: 0.35,
  friction: 0.5,
  grease: 0.45,
};

export function BaseEntityOrb({ 
  entity, 
  position, 
  onClick, 
  onHover, 
  children, 
  floatSpeed = 2,
  customColor,
  customSize,
  customGeometry,
  customMaterial,
  hideDefaultLabel,
  groupRef
}: BaseEntityOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const color = customColor || entityColors[entity.type] || "#ffffff";
  const size = customSize || entitySizes[entity.type] || 0.3;
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle pulsing effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05;
      meshRef.current.scale.setScalar(hovered ? scale * 1.2 : scale);
    }
  });

  const handlePointerOver = () => {
    setHovered(true);
    onHover?.(true);
  };

  const handlePointerOut = () => {
    setHovered(false);
    onHover?.(false);
  };

  return (
    <Float
      speed={floatSpeed}
      rotationIntensity={0.5}
      floatIntensity={0.5}
      floatingRange={[-0.1, 0.1]}
    >
      <group position={position} ref={groupRef}>
        {/* Main orb */}
        <mesh // NOSONAR
          ref={meshRef}
          onClick={() => onClick?.(entity)}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          {customGeometry || <sphereGeometry args={[size, 32, 32]} />} {/* NOSONAR */}
          {customMaterial || (
            <meshStandardMaterial // NOSONAR
              color={color}
              emissive={color}
              emissiveIntensity={hovered ? 0.8 : 0.4}
              transparent
              opacity={0.9}
              roughness={0.2}
              metalness={0.3}
            />
          )}
        </mesh>
        
        {/* Glow effect */}
        <mesh scale={1.3}> {/* NOSONAR */}
          {customGeometry || <sphereGeometry args={[size, 16, 16]} />} {/* NOSONAR */}
          <meshBasicMaterial // NOSONAR
            color={color}
            transparent
            opacity={hovered ? 0.3 : 0.15}
          />
        </mesh>
        
        {/* Label */}
        {!hideDefaultLabel && (
          <>
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
            
            <Text
              position={[0, size + 0.15, 0]}
              fontSize={0.08}
              color={color}
              anchorX="center"
              anchorY="middle"
            >
              {entity.metadata?.role || entity.type.toUpperCase()}
            </Text>
          </>
        )}
        {children}
      </group>
    </Float>
  );
}
