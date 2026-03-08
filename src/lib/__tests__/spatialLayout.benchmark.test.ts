/**
 * Benchmark tests for spatialLayout force-directed algorithm.
 *
 * Uses a seeded deterministic PRNG (Mulberry32) instead of Math.random()
 * to ensure reproducible results and avoid PRNG security-hotspot warnings.
 */

import { calculateOptimalLayout } from "../spatialLayout";
import type { Entity, Connection } from "../types";

// ---------------------------------------------------------------------------
// Seeded PRNG – Mulberry32
// Produces values in [0, 1) just like Math.random() but fully deterministic.
// ---------------------------------------------------------------------------
function createPrng(seed: number): () => number {
  let s = seed >>> 0;
  return function mulberry32(): number {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Helper – build a synthetic dataset
// ---------------------------------------------------------------------------
function buildDataset(
  entityCount: number,
  connectionCount: number,
  rand: () => number
): { entities: Entity[]; connections: Connection[] } {
  const now = new Date();
  const entities: Entity[] = Array.from({ length: entityCount }, (_, i) => ({
    id: `e${i}`,
    type: "problem" as const,
    label: `Entity ${i}`,
    createdAt: now,
    updatedAt: now,
  }));

  const connections: Connection[] = Array.from(
    { length: connectionCount },
    (_, i) => ({
      id: `c${i}`,
      fromEntityId: `e${Math.floor(rand() * entityCount)}`,
      toEntityId: `e${Math.floor(rand() * entityCount)}`,
      type: "causes" as const,
      strength: rand(),
    })
  );

  return { entities, connections };
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

describe("spatialLayout benchmark – small graph (10 entities, 15 connections)", () => {
  it("completes within 100 ms", () => {
    const rand = createPrng(0xdeadbeef);
    const { entities, connections } = buildDataset(10, 15, rand);

    const start = performance.now();
    const iterations = 5;
    for (let i = 0; i < iterations; i++) {
      calculateOptimalLayout(entities, connections);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    console.log(`Small graph avg: ${avgMs.toFixed(2)} ms`);
    expect(avgMs).toBeLessThan(100);
  });
});

describe("spatialLayout benchmark – medium graph (50 entities, 75 connections)", () => {
  it("completes within 500 ms", () => {
    const rand = createPrng(0xcafebabe);
    const { entities, connections } = buildDataset(50, 75, rand);

    const start = performance.now();
    const iterations = 5;
    for (let i = 0; i < iterations; i++) {
      calculateOptimalLayout(entities, connections);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    console.log(`Medium graph avg: ${avgMs.toFixed(2)} ms`);
    expect(avgMs).toBeLessThan(500);
  });
});

describe("spatialLayout benchmark – large graph (100 entities, 150 connections)", () => {
  it("completes within 2000 ms", () => {
    const rand = createPrng(0xbadf00d);
    const { entities, connections } = buildDataset(100, 150, rand);

    const start = performance.now();
    const iterations = 5;
    for (let i = 0; i < iterations; i++) {
      calculateOptimalLayout(entities, connections);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    console.log(`Large graph avg: ${avgMs.toFixed(2)} ms`);
    expect(avgMs).toBeLessThan(2000);
  });
});
