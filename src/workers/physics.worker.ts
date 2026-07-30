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

import { 
  DEFAULT_PHYSICS_CONFIG, 
  initializePositions, 
  runPhysicsIteration, 
  normalizePositions,
  type PhysicsEntity,
  type PhysicsConnection
} from "@/lib/physicsEngine";

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
const config: Required<PhysicsConfig> = { ...DEFAULT_PHYSICS_CONFIG };

// ============================================================================
// FORCE-DIRECTED ALGORITHM
// ============================================================================

function runSimulation(): { totalMovement: number; stabilized: boolean } {
  if (entities.length === 0 || isPaused) {
    return { totalMovement: 0, stabilized: true };
  }
  
  const totalMovement = runPhysicsIteration(
    entities as unknown as PhysicsEntity[],
    connections as unknown as PhysicsConnection[],
    positions,
    config,
    iteration
  );
  
  const stabilized = totalMovement < config.stabilizationThreshold;
  
  return { totalMovement, stabilized };
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
  
  initializePositions(entities as unknown as PhysicsEntity[], positions);
  
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
  normalizePositions(positions, config.targetRange);
  
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
