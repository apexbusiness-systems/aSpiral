import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Float } from "@react-three/drei";
import * as THREE from "three";
import type { Entity } from "@/lib/types";
import { getEntityVisualConfig, getColorByValence } from "@/lib/visualVariety";

interface SemanticEntityProps {
  entity: Entity;
  position: [number, number, number];
  onClick?: (entity: Entity) => void;
}

// Geometry components
function EntityGeometry({ 
  type, 
  size 
}: { 
  type: "sphere" | "cube" | "octahedron" | "torus" | "cone"; 
  size: number;
}) {
  switch (type) {
    case "cube":
      return <boxGeometry args={[size, size, size]} />;
    case "octahedron":
      return <octahedronGeometry args={[size, 0]} />;
    case "torus":
      return <torusGeometry args={[size * 0.6, size * 0.2, 16, 32]} />;
    case "cone":
      return <coneGeometry args={[size * 0.6, size, 16]} />;
    case "sphere":
    default:
      return <sphereGeometry args={[size, 32, 32]} />;
  }
}

export function SemanticEntity({ entity, position, onClick }: SemanticEntityProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Get visual config based on entity type and role
  const visualConfig = useMemo(() => 
    getEntityVisualConfig(entity.type, entity.metadata?.role),
    [entity.type, entity.metadata?.role]
  );
  
  // Color based on emotional valence
  const color = useMemo(() => 
    getColorByValence(entity.metadata?.valence || 0, entity.type),
    [entity.metadata?.valence, entity.type]
  );
  
  // Size based on importance
  const size = useMemo(() => {
    const baseSize = 0.3;
    const importance = entity.metadata?.importance || 0.5;
    return baseSize + importance * 0.2;
  }, [entity.metadata?.importance]);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Pulsing effect for pulse entities
    if (visualConfig.pulse) {
      const scale = 1 + Math.sin(time * 3) * 0.1;
      meshRef.current.scale.setScalar(hovered ? scale * 1.2 : scale);
    } else {
      const scale = 1 + Math.sin(time * 2 + position[0]) * 0.03;
      meshRef.current.scale.setScalar(hovered ? scale * 1.15 : scale);
    }
    
    // Gentle rotation
    meshRef.current.rotation.y += 0.003;
  });

  return (
    <Float
      speed={2}
      rotationIntensity={0.3}
      floatIntensity={0.4}
      floatingRange={[-0.08, 0.08]}
    >
      <group position={position}>
        {/* Main mesh */}
        <mesh
          ref={meshRef}
          onClick={() => onClick?.(entity)}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <EntityGeometry type={visualConfig.geometry} size={size} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.8 : visualConfig.glow ? 0.5 : 0.3}
            transparent
            opacity={0.9}
            roughness={0.2}
            metalness={0.3}
            wireframe={visualConfig.wireframe}
          />
        </mesh>
        
        {/* Glow effect */}
        {visualConfig.glow && (
          <mesh scale={1.4}>
            <EntityGeometry type={visualConfig.geometry} size={size} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={hovered ? 0.25 : 0.12}
            />
          </mesh>
        )}
        
        {/* Label - ensure proper rendering */}
        <Text
          position={[0, size + 0.25, 0]}
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {entity.label}
        </Text>
        
        {/* Type/Role indicator */}
        <Text
          position={[0, size + 0.1, 0]}
          fontSize={0.06}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.005}
          outlineColor="#000000"
        >
          {entity.metadata?.role || entity.type}
        </Text>
      </group>
    </Float>
  );
}
