import { AdaptiveEntity } from "./AdaptiveEntity";
import { ConnectionLine } from "./ConnectionLine";
import { useEntities } from "@/hooks/useEntities";
import type { Entity } from "@/lib/types";

/**
 * APEX Phase 2: Off-Main-Thread Physics Integration
 * Uses Web Worker for force-directed layout calculations
 */
export function SpiralEntities() {
  const {
    entities,
    visibleConnections,
    visibleEntityIds,
    getEntityPosition,
    handleMeshRef,
    workerState
  } = useEntities();

  const handleEntityClick = (entity: Entity) => {
    console.log("Entity clicked:", entity);
  };

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
      {visibleConnections.map((connection) => {
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
