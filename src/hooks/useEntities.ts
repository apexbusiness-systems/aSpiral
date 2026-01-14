/**
 * @fileoverview Hook for accessing entities and their positions
 * Bridges session store entities with physics-based positioning
 */
import { useCallback, useMemo } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { usePhysicsWorker } from './usePhysicsWorker';

/**
 * Hook providing entity data and position management
 * Used by SpiralEntities for 3D visualization
 */
export function useEntities() {
    const entities = useSessionStore((state) => state.entities);
    const connections = useSessionStore((state) => state.connections);

    // Get physics worker with position management
    const { getPositions } = usePhysicsWorker(entities, connections, {
        autoUpdate: true
    });

    // Visible entity IDs (all entities for now)
    const visibleEntityIds = useMemo(() =>
        entities.map(e => e.id),
        [entities]
    );

    // Get entity position from physics or calculate default
    const getEntityPosition = useCallback((entityId: string): [number, number, number] => {
        // Check physics worker positions first
        const positions = getPositions();
        if (positions.has(entityId)) {
            return positions.get(entityId)!;
        }

        // Fallback: calculate spiral position based on entity index
        const entityIndex = entities.findIndex(e => e.id === entityId);
        if (entityIndex === -1) {
            return [0, 0, 0];
        }

        // Spiral layout: entities at different heights and angles
        const angle = (entityIndex / Math.max(entities.length, 1)) * Math.PI * 4;
        const radius = 2 + entityIndex * 0.3;
        const height = entityIndex * 0.5 - (entities.length * 0.25);

        return [
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        ];
    }, [entities, getPositions]);

    return {
        entities,
        connections,
        visibleEntityIds,
        getEntityPosition
    };
}
