import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSessionStore } from "@/stores/sessionStore";
import { useAuth } from "@/contexts/AuthContext";
import { usePhysicsWorker, useFallbackLayout } from "@/hooks/usePhysicsWorker";
import { getVisibleLimit, getStaggerDelay } from "@/lib/entityLimits";
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

type Position3D = [number, number, number];

export function useEntities() {
    const currentSession = useSessionStore((state) => state.currentSession);
    const { profile } = useAuth();
    const invalidate = useThree((state) => state.invalidate);

    const [visibleEntityIds, setVisibleEntityIds] = useState<Set<string>>(new Set());

    // Position refs for 60FPS updates
    const positionRefs = useRef<Map<string, THREE.Vector3>>(new Map());

    const entities = useMemo(() => currentSession?.entities || [], [currentSession?.entities]);
    const connections = useMemo(() => currentSession?.connections || [], [currentSession?.connections]);

    // Physics integration
    const handlePositionsUpdate = useCallback((positions: Map<string, Position3D>) => {
        positions.forEach((pos, id) => {
            let vec = positionRefs.current.get(id);
            if (!vec) {
                vec = new THREE.Vector3(pos[0], pos[1], pos[2]);
                positionRefs.current.set(id, vec);
            } else {
                vec.set(pos[0], pos[1], pos[2]);
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
        const initial = new Set(sorted.slice(0, visibleLimit).map(e => e.id));
        setVisibleEntityIds(initial);
        invalidate();

        // Staggered rest
        sorted.slice(visibleLimit).forEach((entity, index) => {
            const delay = getStaggerDelay(index + visibleLimit, visibleLimit);
            setTimeout(() => {
                setVisibleEntityIds(prev => new Set([...prev, entity.id]));
                invalidate();
            }, delay);
        });
    }, [entities, profile, invalidate]);

    return {
        entities,
        connections,
        visibleEntityIds,
        getEntityPosition,
        workerState
    };
}
