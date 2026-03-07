
// Mock data
const mockEntities = Array.from({ length: 50 }, (_, i) => ({
  id: `ent-${i}`,
  session_id: "sess-123",
  type: i % 2 === 0 ? "problem" : "emotion",
  label: "This is a relatively long label for an entity to simulate real data",
  position_x: i * 0.1,
  position_y: i * 0.2,
  position_z: i * 0.3,
  metadata: { role: "desire", valence: 0.5, importance: 0.8 },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  energy: 0.5
}));

const mockFrictionPoints = Array.from({ length: 20 }, (_, i) => ({
  id: `fric-${i}`,
  session_id: "sess-123",
  entity_ids: ["ent-1", "ent-2"],
  intensity: 0.8,
  description: "A detailed description of why this is a friction point and what it means for the user's progress.",
  discovered: true,
  resolved: i % 3 === 0
}));

const mockMessages = Array.from({ length: 100 }, (_, i) => ({
  id: `msg-${i}`,
  session_id: "sess-123",
  role: i % 2 === 0 ? "user" : "assistant",
  content: "This is a typical message content. It could be quite long especially when the assistant is explaining complex concepts or providing detailed feedback.",
  created_at: new Date().toISOString()
}));

const mockBreakthroughs = Array.from({ length: 5 }, (_, i) => ({
  id: `bt-${i}`,
  session_id: "sess-123",
  friction: "Some friction text",
  grease: "Some grease text",
  insight: "A very important insight that helps the user move forward.",
  achieved_at: new Date().toISOString()
}));

function calculateSize(data: any) {
  return JSON.stringify(data).length;
}

function runBenchmark() {
  console.log("--- Performance Baseline ---");

  const fullSize = calculateSize(mockEntities) +
                   calculateSize(mockFrictionPoints) +
                   calculateSize(mockMessages) +
                   calculateSize(mockBreakthroughs);

  console.log(`Full data fetching size (estimated): ${fullSize} bytes`);

  // Optimized sizes
  const optEntities = mockEntities.map(e => ({ type: e.type, energy: e.energy }));
  const optFriction = mockFrictionPoints.map(f => ({ resolved: f.resolved }));
  const optMessagesSize = 0; // count query doesn't fetch rows
  const optBreakthroughs = mockBreakthroughs; // kept as is

  const optSize = calculateSize(optEntities) +
                  calculateSize(optFriction) +
                  optMessagesSize +
                  calculateSize(optBreakthroughs);

  console.log(`Optimized data fetching size (estimated): ${optSize} bytes`);
  const savings = ((fullSize - optSize) / fullSize * 100).toFixed(2);
  console.log(`Potential data transfer savings: ${savings}%`);

  // Verification of logic
  const entityTypesFull = mockEntities.reduce((acc: Record<string, number>, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  const entityTypesOpt = optEntities.reduce((acc: Record<string, number>, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  console.log("\n--- Logic Verification ---");
  console.log("Entity types match:", JSON.stringify(entityTypesFull) === JSON.stringify(entityTypesOpt));

  const resolvedFull = mockFrictionPoints.filter(f => f.resolved).length;
  const resolvedOpt = optFriction.filter(f => f.resolved).length;
  console.log("Resolved friction points match:", resolvedFull === resolvedOpt);
}

runBenchmark();
