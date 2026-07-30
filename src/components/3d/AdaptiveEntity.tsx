import { useRef, useState, useMemo, useEffect } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Entity } from "@/lib/types";
import { getEntityVisualConfig, getColorByValence } from "@/lib/visualVariety";
import { EntityGeometry } from "./EntityGeometry";
import { BaseEntityOrb } from "./BaseEntityOrb";

interface AdaptiveEntityProps {
  readonly entity: Entity;
  readonly position: [number, number, number];
  readonly isVisible: boolean;
  readonly onClick?: (entity: Entity) => void;
  readonly showLabel?: "always" | "hover" | "important";
  /** Callback to register mesh ref for direct position updates (60FPS physics) */
  readonly onMeshRef?: (mesh: THREE.Mesh | null) => void;
}

export function AdaptiveEntity({
  entity,
  position,
  isVisible,
  onClick,
  showLabel = "hover",
  onMeshRef,
}: AdaptiveEntityProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);

  // Register mesh ref for direct position updates from physics worker
  useEffect(() => {
    if (groupRef.current) {
      onMeshRef?.(groupRef.current as unknown as THREE.Mesh);
    }
    return () => onMeshRef?.(null);
  }, [onMeshRef]);

  const visualConfig = useMemo(() =>
    getEntityVisualConfig(entity.type, entity.metadata?.role),
    [entity.type, entity.metadata?.role]
  );

  const color = useMemo(() =>
    getColorByValence(entity.metadata?.valence || 0, entity.type),
    [entity.metadata?.valence, entity.type]
  );

  // Size based on importance - compact for mobile
  const importance = entity.metadata?.importance || 0.5;
  const baseSize = 0.18 + importance * 0.17;

  // Determine if label should show
  const shouldShowLabel = useMemo(() => {
    if (showLabel === "always") return true;
    if (showLabel === "hover") return hovered || selected;
    if (showLabel === "important") return importance > 0.7 || hovered || selected;
    return false;
  }, [showLabel, hovered, selected, importance]);

  if (!isVisible) return null;

  const customGeometry = <EntityGeometry type={visualConfig.geometry} size={baseSize} />;
  const customMaterial = (
    <meshBasicMaterial
      color={color}
      transparent // NOSONAR
      opacity={hovered ? 1 : 0.85}
    />
  );

  const handleClick = (e: Entity) => {
    setSelected(!selected);
    onClick?.(e);
  };

  return (
    <BaseEntityOrb
      entity={entity}
      position={position}
      onClick={handleClick}
      onHover={setHovered}
      customColor={color}
      customSize={baseSize}
      customGeometry={customGeometry}
      customMaterial={customMaterial}
      hideDefaultLabel={true}
      groupRef={groupRef}
      floatSpeed={1.5}
    >
      {/* Ground indicator - simplified */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -baseSize - 0.1, 0]}> {/* NOSONAR */}
        <ringGeometry args={[baseSize * 0.8, baseSize * 1, 16]} />{/* NOSONAR */}
        <meshBasicMaterial
          color={color}
          transparent // NOSONAR
          opacity={hovered ? 0.3 : 0.1}
        />
      </mesh>

      {/* Adaptive label using Html - compact for mobile */}
      {shouldShowLabel && (
        <Html
          position={[0, baseSize + 0.3, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: "none" }}
          zIndexRange={[0, 10]}
        >
          <div
            className="entity-label"
            style={{
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "6px",
              padding: "3px 8px",
              fontFamily: "var(--font-body, system-ui)",
              fontSize: "10px",
              fontWeight: 500,
              color: "white",
              whiteSpace: "nowrap",
              maxWidth: "140px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              animation: "labelFadeIn 0.2s ease-out",
            }}
          >
            {entity.label}
            <div
              style={{
                fontSize: "7px",
                color: color,
                textTransform: "uppercase",
                marginTop: "1px",
                opacity: 0.8,
              }}
            >
              {entity.metadata?.role || entity.type}
            </div>
          </div>
        </Html>
      )}
    </BaseEntityOrb>
  );
}
