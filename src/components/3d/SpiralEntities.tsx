import { useEffect, useRef, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { AdaptiveEntity } from "./AdaptiveEntity";
import { ConnectionLine } from "./ConnectionLine";
import { useEntities } from "@/hooks/useEntities";
import type { Entity } from "@/lib/types";
import * as THREE from "three";

/**
 * APEX Phase 2: Off-Main-Thread Physics Integration
 * Uses useEntities hook for force-directed layout calculations
 */
export function SpiralEntities() {
  const invalidate = useThree((state) => state.invalidate);
  
  // Use shared entities hook - eliminates code duplication
  const { entities, connections, visibleEntityIds, getEntityPosition, workerState, positionRefs } = useEntities();
  
  // Mesh refs for direct 60FPS position updates
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  // Sync mesh positions with physics updates
  useEffect(() => {
    const updateMeshes = () => {
      positionRefs.current.forEach((vec, id) => {
        const mesh = meshRefs.current.get(id);
        if (mesh) {
          mesh.position.lerp(vec, 0.15);
        }
      });
      invalidate();
    };
    
    // Run on every animation frame only if we have meshes
    if (meshRefs.current.size > 0) {
      updateMeshes();
    }
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

      {/* Debug: Show worker state in development */}
      {import.meta.env.DEV && workerState.lastError && (
        <mesh position={[0, 3, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}
    </>
  );
}

