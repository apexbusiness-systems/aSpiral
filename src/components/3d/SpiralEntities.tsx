import { useCallback, useMemo } from "react";
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

  // Memoize callback to prevent redundant execution of useEffects in child components
  const handleEntityClick = useCallback((entity: Entity) => {
    console.log("Entity clicked:", entity);
  }, []);

  // Performance Optimization: Wrap .map() loops that generate Three.js subcomponents
  // in useMemo. This stabilizes props like higher-order callbacks and derived arrays,
  // preventing redundant execution of useEffect hooks in child components that depend on these references.
  const renderedEntities = useMemo(() => {
    return entities.map((entity) => {
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
    });
  }, [entities, getEntityPosition, visibleEntityIds, handleEntityClick, handleMeshRef]);

  const renderedConnections = useMemo(() => {
    return visibleConnections.map((connection) => {
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
    });
  }, [visibleConnections, getEntityPosition]);

  return (
    <>
      {/* Render entities with adaptive visibility */}
      {renderedEntities}

      {/* Only show connections for visible entities */}
      {renderedConnections}

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
