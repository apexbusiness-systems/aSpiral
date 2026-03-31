import { describe, it, expect } from "vitest";

interface BreakthroughItem {
  id: string;
  friction: string;
  grease: string;
  insight: string;
  achieved_at: string;
  session_id: string;
}

// Mocking some items
function generateItems(count: number): BreakthroughItem[] {
  const items: BreakthroughItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: `id-${i}`,
      friction: `Some friction text ${i} that might be long and contains details`,
      grease: `Some grease text ${i} that describes how to overcome the friction`,
      insight: `Some insight text ${i} that was gained during the session`,
      achieved_at: new Date().toISOString(),
      session_id: `session-${i % 100}`,
    });
  }
  return items;
}

const breakthroughs = generateItems(10000);
const searchQuery = "insight text 999";

function originalFilter(items: BreakthroughItem[], query: string) {
  return items.filter((b) => {
    // Text search
    if (query) {
      const q = query.toLowerCase();
      const matches =
        b.friction.toLowerCase().includes(q) ||
        b.grease.toLowerCase().includes(q) ||
        b.insight.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });
}

function optimizedFilter(items: BreakthroughItem[], query: string) {
  const q = query.toLowerCase();
  return items.filter((b) => {
    // Text search
    if (q) {
      const matches =
        b.friction.toLowerCase().includes(q) ||
        b.grease.toLowerCase().includes(q) ||
        b.insight.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });
}

describe("Breakthroughs filter benchmark", () => {
  it("measures original filter performance", () => {
    const start = performance.now();
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      originalFilter(breakthroughs, searchQuery);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;
    console.log(`Original filter avg: ${avgMs.toFixed(4)} ms`);
  });

  it("measures optimized filter performance", () => {
    const start = performance.now();
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      optimizedFilter(breakthroughs, searchQuery);
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;
    console.log(`Optimized filter avg: ${avgMs.toFixed(4)} ms`);
  });

  it("verifies both filters return the same results", () => {
    const res1 = originalFilter(breakthroughs, searchQuery);
    const res2 = optimizedFilter(breakthroughs, searchQuery);
    expect(res1.length).toBe(res2.length);
    expect(res1).toEqual(res2);
  });
});
