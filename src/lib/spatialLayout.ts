/**
 * Force-Directed Spatial Layout
 * Distributes entities to avoid overlap with smart positioning
 */

import type { Entity, Connection } from "./types";

type Position = [number, number, number];

/**
 * Calculate optimal layout using force-directed algorithm
 */
export function calculateOptimalLayout(
  entities: Entity[],
  connections: Connection[]
): Map<string, Position> {
  const positions = new Map<string, Position>();
  
  if (entities.length === 0) return positions;
  
  // Initialize with circular distribution
  entities.forEach((entity, index) => {
    const angle = (index / entities.length) * Math.PI * 2;
    const radius = 2.5;
    
    // Use position hint if available
    const hint = entity.metadata?.positionHint;
    let baseOffset: Position = [0, 0, 0];
    
    if (hint === "upper_right") baseOffset = [1, 1, 0];
    else if (hint === "upper_left") baseOffset = [-1, 1, 0];
    else if (hint === "lower_right") baseOffset = [1, -1, 0];
    else if (hint === "lower_left") baseOffset = [-1, -1, 0];
    
    positions.set(entity.id, [
      Math.cos(angle) * radius + baseOffset[0] * 0.5,
      Math.sin(angle) * radius * 0.6 + baseOffset[1] * 0.5,
      Math.sin(angle) * 0.5,
    ]);
  });
  
  // Apply force-directed iterations
  const iterations = 50;
  const repulsionStrength = 0.8;
  const attractionStrength = 0.05;
  const damping = 0.9;
  
  for (let i = 0; i < iterations; i++) {
    const forces = new Map<string, Position>();
    entities.forEach(e => forces.set(e.id, [0, 0, 0]));
    
    // Repulsive forces between all entities
    entities.forEach((e1, idx1) => {
      entities.forEach((e2, idx2) => {
        if (idx1 >= idx2) return;
        
        const pos1 = positions.get(e1.id)!;
        const pos2 = positions.get(e2.id)!;
        
        const dx = pos1[0] - pos2[0];
        const dy = pos1[1] - pos2[1];
        const dz = pos1[2] - pos2[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < 0.1) return; // Avoid division by zero
        
        // Repulsion force (inverse square)
        const minDistance = 1.5;
        if (distance < minDistance) {
          const force = repulsionStrength / (distance * distance);
          applyMutualForce(forces, e1.id, e2.id, [dx, dy, dz], distance, force);
        }
      });
    });
    
    // Attractive forces for connected entities
    connections.forEach(conn => {
      const pos1 = positions.get(conn.fromEntityId);
      const pos2 = positions.get(conn.toEntityId);
      
      if (!pos1 || !pos2) return;
      
      const dx = pos2[0] - pos1[0];
      const dy = pos2[1] - pos1[1];
      const dz = pos2[2] - pos1[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (distance < 0.1) return;
      
      // Attraction force (linear spring)
      const idealDistance = 2;
      const displacement = distance - idealDistance;
      const force = displacement * attractionStrength * conn.strength;
      
      applyMutualForce(forces, conn.fromEntityId, conn.toEntityId, [dx, dy, dz], distance, force);
    });
    
    // Center gravity (prevent drift)
    entities.forEach(entity => {
      const pos = positions.get(entity.id)!;
      const f = forces.get(entity.id)!;
      
      forces.set(entity.id, [
        f[0] - pos[0] * 0.01,
        f[1] - pos[1] * 0.01,
        f[2] - pos[2] * 0.02,
      ]);
    });
    
    // Apply forces with damping
    entities.forEach(entity => {
      const pos = positions.get(entity.id)!;
      const force = forces.get(entity.id)!;
      
      const decay = 1 - (i / iterations) * 0.5; // Reduce movement over time
      
      positions.set(entity.id, [
        pos[0] + force[0] * damping * decay,
        pos[1] + force[1] * damping * decay,
        pos[2] + force[2] * damping * decay,
      ]);
    });
  }
  
  // Normalize positions to fit in view
  normalizePositions(positions);
  
  return positions;
}

/**
 * Apply mutual force between two entities
 */
function applyMutualForce(
  forces: Map<string, Position>,
  id1: string,
  id2: string,
  delta: Position,
  distance: number,
  forceMagnitude: number
) {
  const fx = (delta[0] / distance) * forceMagnitude;
  const fy = (delta[1] / distance) * forceMagnitude;
  const fz = (delta[2] / distance) * forceMagnitude * 0.3; // Reduce Z force
  
  const f1 = forces.get(id1)!;
  forces.set(id1, [f1[0] + fx, f1[1] + fy, f1[2] + fz]);
  
  const f2 = forces.get(id2)!;
  forces.set(id2, [f2[0] - fx, f2[1] - fy, f2[2] - fz]);
}

/**
 * Normalize positions to fit within bounds
 */
function normalizePositions(positions: Map<string, Position>): void {
  if (positions.size === 0) return;
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  positions.forEach(pos => {
    minX = Math.min(minX, pos[0]);
    maxX = Math.max(maxX, pos[0]);
    minY = Math.min(minY, pos[1]);
    maxY = Math.max(maxY, pos[1]);
  });
  
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const targetRange = 4; // Desired spread
  
  positions.forEach((pos, id) => {
    positions.set(id, [
      ((pos[0] - minX) / rangeX - 0.5) * targetRange,
      ((pos[1] - minY) / rangeY - 0.5) * targetRange * 0.7,
      pos[2],
    ]);
  });
}
