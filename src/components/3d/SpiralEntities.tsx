import { useEffect, useRef, useState, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { AdaptiveEntity } from "./AdaptiveEntity";
import { ConnectionLine } from "./ConnectionLine";
import { useSessionStore } from "@/stores/sessionStore";
import { usePhysicsWorker, useFallbackLayout } from "@/hooks/usePhysicsWorker";
import { getVisibleLimit, getStaggerDelay } from "@/lib/entityLimits";
import { useAuth } from "@/contexts/AuthContext";
import type { Entity } from "@/lib/types";
import * as THREE from "three";

type Position3D = [number, number, number];

/**
 * APEX Phase 2: Off-Main-Thread Physics Integration
 * Uses Web Worker for force-directed layout calculations
 */
export function SpiralEntities() {
  const currentSession = useSessionStore((state) => state.currentSession);
  const { profile } = useAuth();
  const invalidate = useThree((state) => state.invalidate);

  const [visibleEntityIds, setVisibleEntityIds] = useState<Set<string>>(new Set());

  // Position refs for 60FPS updates (bypass React state)
  const positionRefs = useRef<Map<string, THREE.Vector3>>(new Map());
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  const entities = currentSession?.entities || [];
  const connections = currentSession?.connections || [];

  // Handle position updates from physics worker
  const handlePositionsUpdate = useCallback((positions: Map<string, Position3D>) => {
    positions.forEach((pos, id) => {
      // Update position ref
      let vec = positionRefs.current.get(id);
      if (!vec) {
        vec = new THREE.Vector3(pos[0], pos[1], pos[2]);
        positionRefs.current.set(id, vec);
      } else {
        vec.set(pos[0], pos[1], pos[2]);
      }

      // Directly update mesh position for 60FPS
      const mesh = meshRefs.current.get(id);
      if (mesh) {
        mesh.position.lerp(vec, 0.15); // Smooth interpolation
      }
    });

    invalidate();
  }, [invalidate]);

  // Initialize physics worker with optimized config
  const { state: workerState } = usePhysicsWorker(entities, connections, {
    onPositionsUpdate: handlePositionsUpdate,
    autoUpdate: true,
    config: {
      iterations: 25, // Reduced from 50 for better performance
      repulsionStrength: 0.8,
      attractionStrength: 0.05,
      damping: 0.92, // Slightly higher damping = fewer updates needed
    },
  });

  // Fallback layout for initial positions or if worker fails
  const fallbackPositions = useFallbackLayout(entities, connections);

  // Get current positions (from worker or fallback)
  const getEntityPosition = useCallback((entityId: string): Position3D => {
    // First check position refs (from worker)
    const workerPos = positionRefs.current.get(entityId);
    if (workerPos) {
      return [workerPos.x, workerPos.y, workerPos.z];
    }

    // Fall back to sync layout
    const fallback = fallbackPositions.get(entityId);
    if (fallback) {
      return fallback;
    }

    // Default position
    return [0, 0, 0];
  }, [fallbackPositions]);

  // Progressive disclosure - show entities over time
  useEffect(() => {
    if (entities.length === 0) {
      setVisibleEntityIds(new Set());
      return;
    }

    // Sort by importance
    const sorted = [...entities].sort((a, b) =>
      (b.metadata?.importance || 0.5) - (a.metadata?.importance || 0.5)
    );

    const userTier = profile?.tier || "free";
    const visibleLimit = getVisibleLimit(userTier);

    // Show initial entities immediately
    const initial = new Set(sorted.slice(0, visibleLimit).map(e => e.id));
    setVisibleEntityIds(initial);
    invalidate();

    // Stagger remaining entities
    sorted.slice(visibleLimit).forEach((entity, index) => {
      const delay = getStaggerDelay(index + visibleLimit, visibleLimit);
      setTimeout(() => {
        setVisibleEntityIds(prev => new Set([...prev, entity.id]));
        invalidate();
      }, delay);
    });
  }, [entities, profile, invalidate]);

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
