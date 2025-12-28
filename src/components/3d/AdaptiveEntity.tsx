import { useRef, useState, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Float, Html } from "@react-three/drei";
import * as THREE from "three";
import type { Entity } from "@/lib/types";
import { getEntityVisualConfig, getColorByValence } from "@/lib/visualVariety";

interface AdaptiveEntityProps {
  entity: Entity;
  position: [number, number, number];
  isVisible: boolean;
  onClick?: (entity: Entity) => void;
  showLabel?: "always" | "hover" | "important";
  /** Callback to register mesh ref for direct position updates (60FPS physics) */
  onMeshRef?: (mesh: THREE.Mesh | null) => void;
}

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

export function AdaptiveEntity({ 
  entity, 
  position, 
  isVisible,
  onClick,
  showLabel = "hover",
  onMeshRef,
}: AdaptiveEntityProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  const [appeared, setAppeared] = useState(false);
  
  // Register mesh ref for direct position updates from physics worker
  useEffect(() => {
    if (groupRef.current) {
      onMeshRef?.(groupRef.current as unknown as THREE.Mesh);
    }
    return () => onMeshRef?.(null);
  }, [onMeshRef]);
  
  // Animate appearance
  useEffect(() => {
    if (isVisible && !appeared) {
      const timer = setTimeout(() => setAppeared(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible, appeared]);
  
  const visualConfig = useMemo(() => 
    getEntityVisualConfig(entity.type, entity.metadata?.role),
    [entity.type, entity.metadata?.role]
  );
  
  const color = useMemo(() => 
    getColorByValence(entity.metadata?.valence || 0, entity.type),
    [entity.metadata?.valence, entity.type]
  );
  
  // Size based on importance
  const importance = entity.metadata?.importance || 0.5;
  const baseSize = 0.25 + importance * 0.25;
  
  // Determine if label should show
  const shouldShowLabel = useMemo(() => {
    if (showLabel === "always") return true;
    if (showLabel === "hover") return hovered || selected;
    if (showLabel === "important") return importance > 0.7 || hovered || selected;
    return false;
  }, [showLabel, hovered, selected, importance]);
  
  useFrame((state) => {
    if (!meshRef.current || !isVisible) return;
    
    const time = state.clock.elapsedTime;
    
    // Scale animation
    const targetScale = appeared ? 1 : 0;
    const currentScale = meshRef.current.scale.x;
    const newScale = currentScale + (targetScale - currentScale) * 0.1;
    
    // Hover/pulse effects
    const pulseAmount = visualConfig.pulse ? Math.sin(time * 3) * 0.08 : Math.sin(time * 2) * 0.03;
    const hoverScale = hovered ? 1.15 : 1;
    
    meshRef.current.scale.setScalar(newScale * hoverScale * (1 + pulseAmount));
    meshRef.current.rotation.y += 0.002;
  });

  if (!isVisible) return null;

  return (
    <Float
      speed={2}
      rotationIntensity={0.2}
      floatIntensity={0.3}
      floatingRange={[-0.05, 0.05]}
    >
      <group ref={groupRef} position={position}>
        {/* Main mesh */}
        <mesh
          ref={meshRef}
          onClick={() => {
            setSelected(!selected);
            onClick?.(entity);
          }}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          scale={0}
        >
          <EntityGeometry type={visualConfig.geometry} size={baseSize} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.9 : visualConfig.glow ? 0.5 : 0.3}
            transparent
            opacity={0.9}
            roughness={0.2}
            metalness={0.3}
            wireframe={visualConfig.wireframe}
          />
        </mesh>
        
        {/* Glow effect */}
        {visualConfig.glow && (
          <mesh scale={appeared ? 1.4 : 0}>
            <EntityGeometry type={visualConfig.geometry} size={baseSize} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={hovered ? 0.2 : 0.1}
            />
          </mesh>
        )}
        
        {/* Subtle indicator ring (always visible) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -baseSize - 0.1, 0]}>
          <ringGeometry args={[baseSize * 0.8, baseSize * 1, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={hovered ? 0.4 : 0.15}
          />
        </mesh>
        
        {/* Adaptive label using Html for better rendering */}
        {shouldShowLabel && (
          <Html
            position={[0, baseSize + 0.4, 0]}
            center
            distanceFactor={8}
            style={{ pointerEvents: "none" }}
            zIndexRange={[10, 50]}
          >
            <div
              className="entity-label"
              style={{
                background: "rgba(0, 0, 0, 0.85)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                padding: "6px 12px",
                fontFamily: "var(--font-body, system-ui)",
                fontSize: "12px",
                fontWeight: 500,
                color: "white",
                whiteSpace: "nowrap",
                animation: "labelFadeIn 0.2s ease-out",
                zIndex: 10,
                position: "relative",
              }}
            >
              {entity.label}
              <div
                style={{
                  fontSize: "9px",
                  color: color,
                  textTransform: "uppercase",
                  marginTop: "2px",
                  opacity: 0.8,
                }}
              >
                {entity.metadata?.role || entity.type}
              </div>
            </div>
          </Html>
        )}
      </group>
    </Float>
  );
}
