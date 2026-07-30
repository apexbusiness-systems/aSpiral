import { useMemo, useState } from "react";
import type { Entity } from "@/lib/types";
import { getEntityVisualConfig, getColorByValence } from "@/lib/visualVariety";
import { EntityGeometry } from "./EntityGeometry";
import { BaseEntityOrb } from "./BaseEntityOrb";

// NOSONAR - R3F intrinsic JSX props: args, emissive, emissiveIntensity, transparent,
// roughness, metalness, wireframe, position - valid R3F/Three.js props, not HTML attributes.

interface SemanticEntityProps {
  readonly entity: Entity;
  readonly position: [number, number, number];
  readonly onClick?: (entity: Entity) => void;
}

export function SemanticEntity({ entity, position, onClick }: SemanticEntityProps) {
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
  
  const customGeometry = <EntityGeometry type={visualConfig.geometry} size={size} />;
  const customMaterial = (
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
  );

  return (
    <BaseEntityOrb
      entity={entity}
      position={position}
      onClick={onClick}
      onHover={setHovered}
      customColor={color}
      customSize={size}
      customGeometry={customGeometry}
      customMaterial={customMaterial}
    />
  );
}
