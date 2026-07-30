/**
 * Force-Directed Spatial Layout
 * Distributes entities to avoid overlap with smart positioning
 */

import type { Entity, Connection } from "./types";
import { 
  DEFAULT_PHYSICS_CONFIG, 
  initializePositions, 
  runPhysicsIteration, 
  normalizePositions,
  type Position 
} from "./physicsEngine";

/**
 * Calculate optimal layout using force-directed algorithm
 */
export function calculateOptimalLayout(
  entities: Entity[],
  connections: Connection[]
): Map<string, Position> {
  const positions = new Map<string, Position>();
  if (entities.length === 0) return positions;
  
  const physicsEntities = entities.map(e => ({ id: e.id, positionHint: e.metadata?.positionHint as string }));
  const physicsConnections = connections.map(c => ({ fromEntityId: c.fromEntityId, toEntityId: c.toEntityId, strength: c.strength }));

  initializePositions(physicsEntities, positions);
  
  for (let i = 0; i < DEFAULT_PHYSICS_CONFIG.iterations; i++) {
    runPhysicsIteration(physicsEntities, physicsConnections, positions, DEFAULT_PHYSICS_CONFIG, i);
  }
  
  normalizePositions(positions, DEFAULT_PHYSICS_CONFIG.targetRange);
  return positions;
}
