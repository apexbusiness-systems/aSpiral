/**
 * Physics Worker - Force-Directed Layout
 * 
 * APEX Architecture Phase 2: The Muscle
 * Runs force-directed graph calculations off the main thread
 * Uses Float32Array for zero-overhead transfer
 */

import type { 
  WorkerInputMessage, 
  WorkerOutputMessage,
  SerializableEntity,
  SerializableConnection,
  PhysicsConfig,
  PositionsUpdatedMessage,
} from "./physics.types";

// ============================================================================
// STATE
// ============================================================================

let entities: SerializableEntity[] = [];
let connections: SerializableConnection[] = [];
const positions: Map<string, [number, number, number]> = new Map();
let isPaused = false;
let iteration = 0;
let lastTotalMovement = Infinity;

// Default physics configuration
const config: Required<PhysicsConfig> = {
  iterations: 50,
  repulsionStrength: 0.8,
  attractionStrength: 0.05,
  damping: 0.9,
  minDistance: 1.5,
  idealDistance: 2,
  targetRange: 4,
  stabilizationThreshold: 0.001,
};

// ============================================================================
// FORCE-DIRECTED ALGORITHM
// ============================================================================

function initializePositions(): void {
  positions.clear();
  
  if (entities.length === 0) return;
  
  // Initialize with circular distribution
  entities.forEach((entity, index) => {
    const angle = (index / entities.length) * Math.PI * 2;
    const radius = 2.5;
    
    // Use position hint if available
    const hint = entity.positionHint;
    let baseOffset: [number, number, number] = [0, 0, 0];
    
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
}

function runSimulation(): { totalMovement: number; stabilized: boolean } {
  if (entities.length === 0 || isPaused) {
    return { totalMovement: 0, stabilized: true };
  }
  
  const forces = new Map<string, [number, number, number]>();
  entities.forEach(e => forces.set(e.id, [0, 0, 0]));
  
  let totalMovement = 0;
  
  // Repulsive forces between all entities
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const e1 = entities[i];
      const e2 = entities[j];
      
      const pos1 = positions.get(e1.id)!;
      const pos2 = positions.get(e2.id)!;
      
      const dx = pos1[0] - pos2[0];
      const dy = pos1[1] - pos2[1];
      const dz = pos1[2] - pos2[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (distance < 0.1) continue; // Avoid division by zero
      
      // Repulsion force (inverse square)
      if (distance < config.minDistance) {
        const force = config.repulsionStrength / (distance * distance);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        const fz = (dz / distance) * force * 0.3; // Reduce Z force
        
        const f1 = forces.get(e1.id)!;
        forces.set(e1.id, [f1[0] + fx, f1[1] + fy, f1[2] + fz]);
        
        const f2 = forces.get(e2.id)!;
        forces.set(e2.id, [f2[0] - fx, f2[1] - fy, f2[2] - fz]);
      }
    }
  }
  
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
    const displacement = distance - config.idealDistance;
    const force = displacement * config.attractionStrength * conn.strength;
    
    const fx = (dx / distance) * force;
    const fy = (dy / distance) * force;
    const fz = (dz / distance) * force * 0.3;
    
    const f1 = forces.get(conn.fromEntityId)!;
    forces.set(conn.fromEntityId, [f1[0] + fx, f1[1] + fy, f1[2] + fz]);
    
    const f2 = forces.get(conn.toEntityId)!;
    forces.set(conn.toEntityId, [f2[0] - fx, f2[1] - fy, f2[2] - fz]);
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
  const decay = Math.max(0.5, 1 - (iteration / config.iterations) * 0.5);
  
  entities.forEach(entity => {
    const pos = positions.get(entity.id)!;
    const force = forces.get(entity.id)!;
    
    const movement = Math.sqrt(
      force[0] * force[0] + 
      force[1] * force[1] + 
      force[2] * force[2]
    ) * config.damping * decay;
    
    totalMovement += movement;
    
    positions.set(entity.id, [
      pos[0] + force[0] * config.damping * decay,
      pos[1] + force[1] * config.damping * decay,
      pos[2] + force[2] * config.damping * decay,
    ]);
  });
  
  const stabilized = totalMovement < config.stabilizationThreshold;
  
  return { totalMovement, stabilized };
}

function normalizePositions(): void {
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
  
  positions.forEach((pos, id) => {
    positions.set(id, [
      ((pos[0] - minX) / rangeX - 0.5) * config.targetRange,
      ((pos[1] - minY) / rangeY - 0.5) * config.targetRange * 0.7,
      pos[2],
    ]);
  });
}

function getPositionsAsFloat32Array(): { positions: Float32Array; entityIds: string[] } {
  const entityIds: string[] = [];
  const posArray = new Float32Array(entities.length * 3);
  
  entities.forEach((entity, index) => {
    entityIds.push(entity.id);
    const pos = positions.get(entity.id) || [0, 0, 0];
    posArray[index * 3] = pos[0];
    posArray[index * 3 + 1] = pos[1];
    posArray[index * 3 + 2] = pos[2];
  });
  
  return { positions: posArray, entityIds };
}

// ============================================================================
// MAIN SIMULATION LOOP
// ============================================================================

function runFullSimulation(): void {
  if (entities.length === 0) return;
  
  initializePositions();
  
  // Run iterations
  for (let i = 0; i < config.iterations; i++) {
    iteration = i;
    const { totalMovement, stabilized } = runSimulation();
    lastTotalMovement = totalMovement;
    
    if (stabilized) {
      break;
    }
  }
  
  // Normalize final positions
  normalizePositions();
  
  // Send results
  const { positions: posArray, entityIds } = getPositionsAsFloat32Array();
  
  const message: PositionsUpdatedMessage = {
    type: "POSITIONS_UPDATED",
    positions: posArray,
    entityIds,
    iteration,
    stabilized: lastTotalMovement < config.stabilizationThreshold,
  };
  
  // Transfer Float32Array for zero-copy
  self.postMessage(message, { transfer: [posArray.buffer] });
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.onmessage = (event: MessageEvent<WorkerInputMessage>) => {
  const { type } = event.data;
  
  try {
    switch (type) {
      case "UPDATE_NODES": {
        const { entities: newEntities, connections: newConnections, config: newConfig } = event.data;
        
        entities = newEntities;
        connections = newConnections;
        
        // Merge config
        if (newConfig) {
          Object.assign(config, newConfig);
        }
        
        // Run simulation
        runFullSimulation();
        break;
      }
      
      case "RESET": {
        entities = [];
        connections = [];
        positions.clear();
        iteration = 0;
        isPaused = false;
        
        const message: WorkerOutputMessage = {
          type: "POSITIONS_UPDATED",
          positions: new Float32Array(0),
          entityIds: [],
          iteration: 0,
          stabilized: true,
        };
        self.postMessage(message);
        break;
      }
      
      case "PAUSE": {
        isPaused = true;
        break;
      }
      
      case "RESUME": {
        isPaused = false;
        runFullSimulation();
        break;
      }
    }
  } catch (error) {
    const errorMessage: WorkerOutputMessage = {
      type: "WORKER_ERROR",
      error: error instanceof Error ? error.message : "Unknown worker error",
    };
    self.postMessage(errorMessage);
  }
};

// Signal ready
const readyMessage: WorkerOutputMessage = { type: "WORKER_READY" };
self.postMessage(readyMessage);
