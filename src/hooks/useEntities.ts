import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSessionStore } from "@/stores/sessionStore";
import { useAuth } from "@/contexts/AuthContext";
import { usePhysicsWorker, useFallbackLayout } from "@/hooks/usePhysicsWorker";
import { getVisibleLimit, getStaggerDelay } from "@/lib/entityLimits";
import { useDeepCompareMemo } from "./useDeepCompareMemo";
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

type Position3D = [number, number, number];

export function useEntities() {
    const currentSession = useSessionStore((state) => state.currentSession);
    const { profile } = useAuth();
    const invalidate = useThree((state) => state.invalidate);

    const [visibleEntityIds, setVisibleEntityIds] = useState<Set<string>>(new Set());

    // Position refs for 60FPS updates (bypass React state)
    const positionRefs = useRef<Map<string, THREE.Vector3>>(new Map());
    const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());

    const entities = useDeepCompareMemo(
        () => currentSession?.entities || [],
        [currentSession?.entities]
    );

    const connections = useDeepCompareMemo(
        () => currentSession?.connections || [],
        [currentSession?.connections]
    );

    // Physics integration
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

            // Directly update mesh position for 60FPS if available
            const mesh = meshRefs.current.get(id);
            if (mesh) {
                mesh.position.lerp(vec, 0.15); // Smooth interpolation
            }
        });
        invalidate();
    }, [invalidate]);

    const { state: workerState } = usePhysicsWorker(entities, connections, {
        onPositionsUpdate: handlePositionsUpdate,
        autoUpdate: true,
        config: {
            iterations: 25,
            repulsionStrength: 0.8,
            attractionStrength: 0.05,
            damping: 0.92,
        },
    });

    const fallbackPositions = useFallbackLayout(entities, connections);

    const getEntityPosition = useCallback((entityId: string): Position3D => {
        const workerPos = positionRefs.current.get(entityId);
        if (workerPos) return [workerPos.x, workerPos.y, workerPos.z];

        const fallback = fallbackPositions.get(entityId);
        if (fallback) return fallback;

        return [0, 0, 0];
    }, [fallbackPositions]);

    // Progressive Disclosure
    useEffect(() => {
        if (entities.length === 0) {
            setVisibleEntityIds(new Set());
            return;
        }

        const sorted = [...entities].sort((a, b) =>
            (b.metadata?.importance || 0.5) - (a.metadata?.importance || 0.5)
        );

        const userTier = profile?.tier || "free";
        const visibleLimit = getVisibleLimit(userTier);

        // Initial batch
        // Performance Optimization: Replace .slice().map() with standard for loop
        const initial = new Set<string>();
        const limit = Math.min(sorted.length, visibleLimit);
        for (let i = 0; i < limit; i++) {
            initial.add(sorted[i].id);
        }
        setVisibleEntityIds(initial);
        invalidate();

        // Schedule staggered rest
        const timeoutIds: ReturnType<typeof setTimeout>[] = [];
        for (let i = visibleLimit; i < sorted.length; i++) {
            const entity = sorted[i];
            const delay = getStaggerDelay(i, visibleLimit);

            const timeoutId = setTimeout(() => {
                setVisibleEntityIds(prev => {
                    const next = new Set(prev);
                    next.add(entity.id);
                    return next;
                });
                invalidate();
            }, delay);
            timeoutIds.push(timeoutId);
        }

        // Cleanup timeouts on unmount or dependency change
        return () => {
            timeoutIds.forEach(clearTimeout);
        };
    }, [entities, profile, invalidate]);

    // Register mesh ref for direct physics updates
    const handleMeshRef = useCallback((id: string) => (mesh: THREE.Mesh | null) => {
        if (mesh) {
            meshRefs.current.set(id, mesh);
        } else {
            meshRefs.current.delete(id);
        }
    }, []);

    // Memoize filtered connections for performance
    const visibleConnections = useMemo(() => {
        return connections.filter(conn =>
            visibleEntityIds.has(conn.fromEntityId) &&
            visibleEntityIds.has(conn.toEntityId)
        );
    }, [connections, visibleEntityIds]);

    return useMemo(() => ({
        entities,
        connections,
        visibleConnections,
        visibleEntityIds,
        getEntityPosition,
        handleMeshRef,
        workerState
    }), [
        entities,
        connections,
        visibleConnections,
        visibleEntityIds,
        getEntityPosition,
        handleMeshRef,
        workerState
    ]);
}
