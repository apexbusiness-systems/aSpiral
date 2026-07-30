/**
 * EntityOrbWithLayoutId - Phase 4 Cinematic Polish
 * 
 * Wraps the 3D EntityOrb with a framer-motion layoutId for
 * seamless morphing between 3D scene and 2D chat interface.
 * NOSONAR - R3F intrinsic JSX props: position, args, emissive, emissiveIntensity,
 * transparent, roughness, metalness, rotation, side - valid R3F props, not HTML.
 */

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Float, Html } from "@react-three/drei";
import { motion } from "framer-motion";
import * as THREE from "three";
import type { Entity } from "@/lib/types";

interface EntityOrbWithLayoutIdProps {
  readonly entity: Entity;
  readonly position: [number, number, number];
  readonly onClick?: (entity: Entity) => void;
  readonly enableLayoutAnimation?: boolean;
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

export function EntityOrbWithLayoutId({ 
  entity, 
  position, 
  onClick,
  enableLayoutAnimation = true,
}: EntityOrbWithLayoutIdProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  
  const color = entityColors[entity.type] || "#ffffff";
  const size = entitySizes[entity.type] || 0.3;
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle pulsing effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05;
      meshRef.current.scale.setScalar(hovered ? scale * 1.2 : scale);
    }
  });

  const handleClick = () => {
    setSelected(!selected);
    onClick?.(entity);
  };

  return (
    <Float
      speed={2}
      rotationIntensity={0.5}
      floatIntensity={0.5}
      floatingRange={[-0.1, 0.1]}
    >
      <group position={position}>
        {/* Layout Animation Proxy - HTML overlay for framer-motion */}
        {enableLayoutAnimation && (
          <Html center style={{ pointerEvents: 'none' }}>
            <motion.div
              layoutId={`entity-${entity.id}`}
              className="pointer-events-none"
              style={{
                width: size * 100,
                height: size * 100,
                borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${color}88, ${color}44)`,
                boxShadow: `0 0 ${hovered ? 40 : 20}px ${color}66`,
                opacity: selected ? 0.8 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 25,
              }}
            />
          </Html>
        )}

        {/* Main orb */}
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[size, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.8 : selected ? 0.6 : 0.4}
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
        
        {/* Selection ring */}
        {selected && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[size * 1.4, size * 1.5, 32]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
        
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
