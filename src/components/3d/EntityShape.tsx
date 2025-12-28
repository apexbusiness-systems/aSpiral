import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Float, Cloud } from "@react-three/drei";
import * as THREE from "three";
import type { Entity, EntityType } from "@/lib/types";

interface EntityShapeProps {
  entity: Entity;
  position: [number, number, number];
  onClick?: (entity: Entity) => void;
}

// Colors for each entity type
const entityColors: Record<EntityType, string> = {
  problem: "#ef4444", // Red
  emotion: "#a855f7", // Purple
  value: "#eab308", // Yellow/Gold
  action: "#3b82f6", // Blue
  friction: "#f97316", // Orange
  grease: "#22c55e", // Green
};

// Sizes for each entity type
const entitySizes: Record<EntityType, number> = {
  problem: 0.5,
  emotion: 0.4,
  value: 0.45,
  action: 0.4,
  friction: 0.55,
  grease: 0.5,
};

// Sphere - for people/actions (blue)
function SphereShape({ color, size }: { color: string; size: number }) {
  return (
    <>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        transparent
        opacity={0.9}
        roughness={0.2}
        metalness={0.3}
      />
    </>
  );
}

// Cube - for problems (red)
function CubeShape({ color, size }: { color: string; size: number }) {
  return (
    <>
      <boxGeometry args={[size * 1.4, size * 1.4, size * 1.4]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        transparent
        opacity={0.9}
        roughness={0.3}
        metalness={0.2}
      />
    </>
  );
}

// Pyramid - for values/ideas (yellow)
function PyramidShape({ color, size }: { color: string; size: number }) {
  return (
    <>
      <coneGeometry args={[size, size * 1.5, 4]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        transparent
        opacity={0.9}
        roughness={0.2}
        metalness={0.4}
      />
    </>
  );
}

// Octahedron - for friction (orange)
function OctahedronShape({ color, size }: { color: string; size: number }) {
  return (
    <>
      <octahedronGeometry args={[size, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        transparent
        opacity={0.85}
        roughness={0.25}
        metalness={0.35}
      />
    </>
  );
}

// Torus - for grease (green, smooth)
function TorusShape({ color, size }: { color: string; size: number }) {
  return (
    <>
      <torusGeometry args={[size * 0.6, size * 0.25, 16, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        transparent
        opacity={0.9}
        roughness={0.1}
        metalness={0.5}
      />
    </>
  );
}

// Cloud shape for emotions - using billboard sprite approach
function EmotionCloud({ color, size }: { color: string; size: number }) {
  return (
    <group>
      {/* Main cloud body */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[size * 0.6, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.7}
        />
      </mesh>
      {/* Cloud bumps */}
      <mesh position={[size * 0.4, size * 0.1, 0]}>
        <sphereGeometry args={[size * 0.4, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.7}
        />
      </mesh>
      <mesh position={[-size * 0.35, size * 0.15, 0]}>
        <sphereGeometry args={[size * 0.35, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.7}
        />
      </mesh>
      <mesh position={[size * 0.1, size * 0.35, 0]}>
        <sphereGeometry args={[size * 0.3, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}

export function EntityShape({ entity, position, onClick }: EntityShapeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const color = entityColors[entity.type];
  const size = entitySizes[entity.type];

  // Rotation and pulsing animation
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle rotation
      meshRef.current.rotation.y += 0.005;
      if (entity.type === "friction") {
        meshRef.current.rotation.x += 0.003;
      }

      // Pulsing effect
      const scale =
        1 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05;
      meshRef.current.scale.setScalar(hovered ? scale * 1.2 : scale);
    }
  });

  // Get the shape component based on entity type
  const ShapeComponent = useMemo(() => {
    switch (entity.type) {
      case "problem":
        return <CubeShape color={color} size={size} />;
      case "emotion":
        return <EmotionCloud color={color} size={size} />;
      case "value":
        return <PyramidShape color={color} size={size} />;
      case "action":
        return <SphereShape color={color} size={size} />;
      case "friction":
        return <OctahedronShape color={color} size={size} />;
      case "grease":
        return <TorusShape color={color} size={size} />;
      default:
        return <SphereShape color={color} size={size} />;
    }
  }, [entity.type, color, size]);

  return (
    <Float
      speed={1.5}
      rotationIntensity={0.3}
      floatIntensity={0.4}
      floatingRange={[-0.1, 0.1]}
    >
      <group ref={groupRef} position={position}>
        {/* Main shape */}
        <mesh
          ref={meshRef}
          onClick={() => onClick?.(entity)}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          {ShapeComponent}
        </mesh>

        {/* Glow effect */}
        <mesh scale={1.4}>
          <sphereGeometry args={[size, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={hovered ? 0.25 : 0.1}
          />
        </mesh>

        {/* Label */}
        <Text
          position={[0, size + 0.4, 0]}
          fontSize={0.14}
          color="white"
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {entity.label}
        </Text>

        {/* Type indicator badge */}
        <Text
          position={[0, size + 0.2, 0]}
          fontSize={0.08}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {entity.type.toUpperCase()}
        </Text>
      </group>
    </Float>
  );
}
