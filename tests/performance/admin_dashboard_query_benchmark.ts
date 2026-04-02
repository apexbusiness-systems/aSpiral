
// Mock data generation
function generateMockData(totalCount: number, userSessionIds: Set<string>) {
  const allBreakthroughs = Array.from({ length: totalCount }, (_, i) => ({
    id: `bt-${i}`,
    session_id: i % 10 === 0 ? `sess-${Math.floor(i / 10)}` : `other-sess-${i}`,
    created_at: new Date().toISOString(),
  }));

  const allEntities = Array.from({ length: totalCount }, (_, i) => ({
    id: `ent-${i}`,
    type: i % 5 === 0 ? 'problem' : 'insight',
    session_id: i % 10 === 0 ? `sess-${Math.floor(i / 10)}` : `other-sess-${i}`,
    created_at: new Date().toISOString(),
  }));

  const allMessages = Array.from({ length: totalCount }, (_, i) => ({
    id: `msg-${i}`,
    session_id: i % 10 === 0 ? `sess-${Math.floor(i / 10)}` : `other-sess-${i}`,
  }));

  return { allBreakthroughs, allEntities, allMessages };
}

function calculateSize(data: any) {
  return JSON.stringify(data).length;
}

function runBenchmark() {
  const totalRecords = 5000;
  const userSessionCount = 50;
  const userSessionIds = new Set(Array.from({ length: userSessionCount }, (_, i) => `sess-${i}`));
  const userSessionIdsArray = Array.from(userSessionIds);

  const { allBreakthroughs, allEntities, allMessages } = generateMockData(totalRecords, userSessionIds);

  console.log(`--- Performance Benchmark: Admin Dashboard Queries ---`);
  console.log(`Total records in DB per table: ${totalRecords}`);
  console.log(`User session count: ${userSessionCount}\n`);

  // --- Baseline: Unbounded Queries + JS Filtering ---
  console.log("Scenario 1: Unbounded Queries (Current)");
  const startBaseline = performance.now();

  // Simulation of fetching all
  const fetchedBreakthroughs = allBreakthroughs;
  const fetchedEntities = allEntities;
  const fetchedMessages = allMessages;

  const baselineSize = calculateSize(fetchedBreakthroughs) + calculateSize(fetchedEntities) + calculateSize(fetchedMessages);

  // Simulation of JS filtering
  const userBreakthroughs = fetchedBreakthroughs.filter((b) => userSessionIds.has(b.session_id));
  const userEntities = fetchedEntities.filter((e) => userSessionIds.has(e.session_id));
  const userMessages = fetchedMessages.filter((m) => userSessionIds.has(m.session_id));

  const endBaseline = performance.now();
  console.log(`- Data Transfer Size: ${(baselineSize / 1024).toFixed(2)} KB`);
  console.log(`- Processing Time (incl. "transfer"): ${(endBaseline - startBaseline).toFixed(4)} ms`);
  console.log(`- Records filtered: BT:${userBreakthroughs.length}, ENT:${userEntities.length}, MSG:${userMessages.length}\n`);

  // --- Optimized: Filtered Queries ---
  console.log("Scenario 2: Filtered Queries (Optimized)");
  const startOptimized = performance.now();

  // Simulation of database filtering (only user sessions)
  const optBreakthroughs = allBreakthroughs.filter(b => userSessionIds.has(b.session_id));
  const optEntities = allEntities.filter(e => userSessionIds.has(e.session_id));
  const optMessages = allMessages.filter(m => userSessionIds.has(m.session_id));

  const optimizedSize = calculateSize(optBreakthroughs) + calculateSize(optEntities) + calculateSize(optMessages);

  // No JS filtering needed after fetch

  const endOptimized = performance.now();
  console.log(`- Data Transfer Size: ${(optimizedSize / 1024).toFixed(2)} KB`);
  console.log(`- Processing Time (simulated DB filter + transfer): ${(endOptimized - startOptimized).toFixed(4)} ms`);

  const sizeSavings = ((baselineSize - optimizedSize) / baselineSize * 100).toFixed(2);
  console.log(`\n--- Results ---`);
  console.log(`Data transfer reduction: ${sizeSavings}%`);
  console.log(`Efficiency gain: ~${(baselineSize / optimizedSize).toFixed(1)}x less data over the wire.`);
}

runBenchmark();
