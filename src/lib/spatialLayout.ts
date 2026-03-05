/**
 * Force-Directed Spatial Layout
 * Distributes entities to avoid overlap with smart positioning
 */

import type { Entity, Connection } from "./types";

type Position = [number, number, number];

// Hoisted constants for performance
const ITERATIONS = 50;
const REPULSION_STRENGTH = 0.8;
const ATTRACTION_STRENGTH = 0.05;
const DAMPING = 0.9;
const MIN_DISTANCE = 1.5;
const MIN_DISTANCE_SQ = MIN_DISTANCE * MIN_DISTANCE;
const IDEAL_DISTANCE = 2;
const EPSILON = 0.1;
const EPSILON_SQ = EPSILON * EPSILON;

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
  for (let i = 0; i < ITERATIONS; i++) {
    const forces = new Map<string, Position>();
    entities.forEach(e => forces.set(e.id, [0, 0, 0]));
    
    // Repulsive forces between all entities
    entities.forEach((e1, idx1) => {
      const pos1 = positions.get(e1.id);
      if (!pos1) return;

      entities.forEach((e2, idx2) => {
        if (idx1 >= idx2) return;

        const pos2 = positions.get(e2.id);
        if (!pos2) return;

        const dx = pos1[0] - pos2[0];
        const dy = pos1[1] - pos2[1];
        const dz = pos1[2] - pos2[2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < EPSILON_SQ) return; // Avoid division by zero

        // Repulsion force (inverse square)
        if (distSq < MIN_DISTANCE_SQ) {
          const distance = Math.sqrt(distSq);
          // force = REPULSION_STRENGTH / distSq
          // fx = (dx / distance) * force = dx * (REPULSION_STRENGTH / (distSq * distance))
          const common = REPULSION_STRENGTH / (distSq * distance);
          const fx = dx * common;
          const fy = dy * common;
          const fz = dz * common * 0.3; // Reduce Z force

          const f1 = forces.get(e1.id);
          if (f1) forces.set(e1.id, [f1[0] + fx, f1[1] + fy, f1[2] + fz]);

          const f2 = forces.get(e2.id);
          if (f2) forces.set(e2.id, [f2[0] - fx, f2[1] - fy, f2[2] - fz]);
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
      const distSq = dx * dx + dy * dy + dz * dz;
      
      if (distSq < EPSILON_SQ) return;

      const distance = Math.sqrt(distSq);
      
      // Attraction force (linear spring)
      const displacement = distance - IDEAL_DISTANCE;
      // force = displacement * ATTRACTION_STRENGTH * conn.strength
      // fx = (dx / distance) * force = dx * (force / distance)
      const common = (displacement * ATTRACTION_STRENGTH * conn.strength) / distance;
      
      const fx = dx * common;
      const fy = dy * common;
      const fz = dz * common * 0.3;

      const f1 = forces.get(conn.fromEntityId);
      if (f1) forces.set(conn.fromEntityId, [f1[0] + fx, f1[1] + fy, f1[2] + fz]);

      const f2 = forces.get(conn.toEntityId);
      if (f2) forces.set(conn.toEntityId, [f2[0] - fx, f2[1] - fy, f2[2] - fz]);
    });
    
    // Center gravity (prevent drift)
    entities.forEach(entity => {
      const pos = positions.get(entity.id);
      const f = forces.get(entity.id);
      if (!pos || !f) return;

      forces.set(entity.id, [
        f[0] - pos[0] * 0.01,
        f[1] - pos[1] * 0.01,
        f[2] - pos[2] * 0.02,
      ]);
    });
    
    // Apply forces with damping
    const decay = 1 - (i / ITERATIONS) * 0.5; // Reduce movement over time
    const stepDamping = DAMPING * decay;

    entities.forEach(entity => {
      const pos = positions.get(entity.id);
      const force = forces.get(entity.id);
      if (!pos || !force) return;

      positions.set(entity.id, [
        pos[0] + force[0] * stepDamping,
        pos[1] + force[1] * stepDamping,
        pos[2] + force[2] * stepDamping,
      ]);
    });
  }
  
  // Normalize positions to fit in view
  normalizePositions(positions);
  
  return positions;
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
