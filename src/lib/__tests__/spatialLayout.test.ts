import { describe, it, expect } from 'vitest';
import { calculateOptimalLayout } from '../spatialLayout';
import type { Entity, Connection } from '../types';

describe('spatialLayout correctness', () => {
  it('produces valid layout for small set of entities', () => {
    const entities: Entity[] = [
      { id: 'e1', type: 'problem', label: 'E1', createdAt: new Date(), updatedAt: new Date() },
      { id: 'e2', type: 'emotion', label: 'E2', createdAt: new Date(), updatedAt: new Date() },
    ];
    const connections: Connection[] = [
      { id: 'c1', fromEntityId: 'e1', toEntityId: 'e2', type: 'causes', strength: 0.5 }
    ];

    const positions = calculateOptimalLayout(entities, connections);
    expect(positions.size).toBe(2);
    expect(positions.has('e1')).toBe(true);
    expect(positions.has('e2')).toBe(true);

    const p1 = positions.get('e1')!;
    const p2 = positions.get('e2')!;

    // Check if they are not identical (repulsion should have moved them)
    expect(p1[0]).not.toBe(p2[0]);
  });

  it('handles empty input', () => {
    const positions = calculateOptimalLayout([], []);
    expect(positions.size).toBe(0);
  });
});
