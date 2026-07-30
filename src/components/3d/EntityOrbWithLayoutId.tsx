/**
 * EntityOrbWithLayoutId - Phase 4 Cinematic Polish
 * 
 * Wraps the 3D EntityOrb with a framer-motion layoutId for
 * seamless morphing between 3D scene and 2D chat interface.
 * NOSONAR - R3F intrinsic JSX props: position, args, emissive, emissiveIntensity,
 * transparent, roughness, metalness, rotation, side - valid R3F props, not HTML.
 */

import { useState } from "react";
import { Html } from "@react-three/drei";
import { motion } from "framer-motion";
import * as THREE from "three";
import type { Entity } from "@/lib/types";
import { BaseEntityOrb, entityColors, entitySizes } from "./BaseEntityOrb";

interface EntityOrbWithLayoutIdProps {
  readonly entity: Entity;
  readonly position: [number, number, number];
  readonly onClick?: (entity: Entity) => void;
  readonly enableLayoutAnimation?: boolean;
}

export function EntityOrbWithLayoutId({ 
  entity, 
  position, 
  onClick,
  enableLayoutAnimation = true,
}: EntityOrbWithLayoutIdProps) {
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  
  const color = entityColors[entity.type] || "#ffffff";
  const size = entitySizes[entity.type] || 0.3;
  
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
    >
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
    </BaseEntityOrb>
  );
}
