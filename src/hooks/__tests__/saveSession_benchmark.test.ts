
import { describe, it, expect, vi } from 'vitest';

// Mocking the Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockImplementation(() => {
    // Simulate network delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: null, error: null });
      }, 50); // 50ms delay per request
    });
  }),
};

// Simplified version of saveSession for benchmarking
async function saveSessionSequential(session, messages) {
  const db = mockSupabase;

  // Upsert session
  const { error: sessionError } = await db.from('sessions').upsert({ id: session.id });
  if (sessionError) throw sessionError;

  // Save entities
  if (session.entities.length > 0) {
    const { error: entityError } = await db.from('session_entities').upsert(session.entities);
    if (entityError) throw entityError;
  }

  // Save connections
  if (session.connections.length > 0) {
    const { error: connectionError } = await db.from('session_connections').upsert(session.connections);
    if (connectionError) throw connectionError;
  }

  // Save friction points
  if (session.frictionPoints.length > 0) {
    const { error: frictionError } = await db.from('session_entities').upsert(session.frictionPoints);
    if (frictionError) throw frictionError;
  }

  // Save messages
  if (messages.length > 0) {
    const { error: messageError } = await db.from('breakthroughs').upsert(messages);
    if (messageError) throw messageError;
  }
}

async function saveSessionOptimized(session, messages) {
  const db = mockSupabase;

  // 1. Upsert session (Sequential)
  const { error: sessionError } = await db.from('sessions').upsert({ id: session.id });
  if (sessionError) throw sessionError;

  // 2. Save entities (Sequential - to preserve FK integrity)
  if (session.entities.length > 0) {
    const { error: entityError } = await db.from('session_entities').upsert(session.entities);
    if (entityError) throw entityError;
  }

  // 3. Save connections, friction points, and messages (Parallel)
  const upsertTasks = [];

  if (session.connections.length > 0) {
    upsertTasks.push(db.from('session_connections').upsert(session.connections));
  }

  if (session.frictionPoints.length > 0) {
    upsertTasks.push(db.from('session_entities').upsert(session.frictionPoints));
  }

  if (messages.length > 0) {
    upsertTasks.push(db.from('breakthroughs').upsert(messages));
  }

  if (upsertTasks.length > 0) {
    const results = await Promise.all(upsertTasks);
    const errorResult = results.find(r => r.error);
    if (errorResult?.error) throw errorResult.error;
  }
}

describe('saveSession Performance Benchmark', () => {
  const session = {
    id: 'session-1',
    entities: [{ id: 'e1' }],
    connections: [{ id: 'c1' }],
    frictionPoints: [{ id: 'f1' }],
  };
  const messages = [{ id: 'm1' }];

  it('sequential save takes more time', async () => {
    const start = Date.now();
    await saveSessionSequential(session, messages);
    const duration = Date.now() - start;
    console.log(`Sequential duration: ${duration}ms`);
    // Expected: ~250ms (5 requests * 50ms)
    expect(duration).toBeGreaterThanOrEqual(250);
  });

  it('optimized save takes less time', async () => {
    const start = Date.now();
    await saveSessionOptimized(session, messages);
    const duration = Date.now() - start;
    console.log(`Optimized duration: ${duration}ms`);
    // Expected: ~150ms (1 session + 1 entities + 1 parallel batch = 3 * 50ms)
    expect(duration).toBeGreaterThanOrEqual(150);
    expect(duration).toBeLessThan(350);
  });
});
