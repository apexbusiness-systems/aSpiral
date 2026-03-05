import { describe, it, expect } from 'vitest';
import { calculateOptimalLayout } from '../spatialLayout';
import type { Entity, Connection } from '../types';

describe('spatialLayout performance and correctness', () => {
  it('verifies correctness and measures performance of calculateOptimalLayout', () => {
    const entityCount = 1000;
    const connectionCount = 1000;

    const entities: Entity[] = Array.from({ length: entityCount }, (_, i) => ({
      id: `e${i}`,
      type: 'problem',
      label: `Entity ${i}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const connections: Connection[] = Array.from({ length: connectionCount }, (_, i) => ({
      id: `c${i}`,
      fromEntityId: `e${Math.floor(Math.random() * entityCount)}`,
      toEntityId: `e${Math.floor(Math.random() * entityCount)}`,
      type: 'causes',
      strength: Math.random(),
    }));

    // Benchmark
    const start = performance.now();
    const iterations = 5;
    for (let i = 0; i < iterations; i++) {
      calculateOptimalLayout(entities, connections);
    }
    const end = performance.now();

    console.log(`Average execution time for ${entityCount} entities and ${connectionCount} connections: ${((end - start) / iterations).toFixed(2)}ms`);
  });
});
