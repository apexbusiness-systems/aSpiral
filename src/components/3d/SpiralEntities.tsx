import { useRef, useMemo, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { AdaptiveEntity } from "./AdaptiveEntity";
import { ConnectionLine } from "./ConnectionLine";
import { useEntities } from "@/hooks/useEntities";
import type { Entity } from "@/lib/types";
import * as THREE from "three";

/**
 * APEX Phase 2: Off-Main-Thread Physics Integration
 * Uses Web Worker for force-directed layout calculations
 */
export function SpiralEntities() {
  const {
    entities,
    connections,
    visibleEntityIds,
    getEntityPosition
  } = useEntities();

  // Mesh refs for 60FPS updates (bypass React state)
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  // Reusable vector for lerping to avoid GC
  const targetVec = useMemo(() => new THREE.Vector3(), []);

  // Frame loop for smooth physics interpolation
  useFrame(() => {
    // We iterate over visible entities to update their positions 
    // based on the latest physics calculation from useEntities
    visibleEntityIds.forEach((id) => {
      const mesh = meshRefs.current.get(id);
      if (mesh) {
        const [x, y, z] = getEntityPosition(id);
        targetVec.set(x, y, z);
        // Smooth interpolation to target position
        mesh.position.lerp(targetVec, 0.15);
      }
    });
  });

  const handleEntityClick = (entity: Entity) => {
    console.log("Entity clicked:", entity);
  };

  // Register mesh ref for direct physics updates
  const handleMeshRef = useCallback((id: string) => (mesh: THREE.Mesh | null) => {
    if (mesh) {
      meshRefs.current.set(id, mesh);
    } else {
      meshRefs.current.delete(id);
    }
  }, []);

  return (
    <>
      {/* Render entities with adaptive visibility */}
      {entities.map((entity) => {
        // Initial position for mounting (subsequent updates via useFrame/ref)
        const position = getEntityPosition(entity.id);
        const isVisible = visibleEntityIds.has(entity.id);
        const importance = entity.metadata?.importance || 0.5;

        return (
          <AdaptiveEntity
            key={entity.id}
            entity={entity}
            position={position}
            isVisible={isVisible}
            onClick={handleEntityClick}
            showLabel={importance > 0.7 ? "important" : "hover"}
            onMeshRef={handleMeshRef(entity.id)}
          />
        );
      })}

      {/* Only show connections for visible entities */}
      {connections
        .filter(conn =>
          visibleEntityIds.has(conn.fromEntityId) &&
          visibleEntityIds.has(conn.toEntityId)
        )
        .map((connection) => {
          // Connections still need react state updates for positions 
          // unless we refactor ConnectionLine to use refs too. 
          // For now, let's trust that getEntityPosition returns up-to-date values
          // during render cycles triggered by the physics worker invokation.
          const fromPos = getEntityPosition(connection.fromEntityId);
          const toPos = getEntityPosition(connection.toEntityId);

          return (
            <ConnectionLine
              key={connection.id}
              connection={connection}
              fromPosition={fromPos}
              toPosition={toPos}
            />
          );
        })}
    </>
  );
}
