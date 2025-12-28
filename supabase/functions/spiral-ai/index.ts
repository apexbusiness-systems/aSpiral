import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// CONVERSATIONAL QUESTION PATTERNS for variety
const QUESTION_PATTERN_EXAMPLES = `
QUESTION STRUCTURE VARIETY (cycle through these):
- Direct: "{specific} - when did that start?" or "So {paraphrase}. Then what?"
- Reflection: "You said '{quote}' - what's grinding there?"
- Excavation: "Underneath that {surface}, what else?"
- Contrast: "When you're NOT feeling {negative}, what's different?"
- Embodied: "Close your eyes. Where in your body is that {emotion} sitting?"
- Hypothetical: "If {constraint} wasn't a factor, what would you do?"
- Challenge: "You keep saying '{word}' - is it really that, or something else?"
- Stakes: "What happens if you do nothing?"
- Binary: "Simple: stay or go?" or "Fear or laziness?"
- Silence: "And?" or "What else?"

START WORDS TO ROTATE (never use same start 2x in a row):
✅ "So", "Walk me through", "That {X} you mentioned", "Underneath", "When's the last time"
✅ "Compare", "Strip away", "Close your eyes", "Imagine", "Simple:"
✅ "You said", "Interesting.", "Help me understand", "What happens if"
❌ Never start 2+ questions with "What" in a row
`;

// SEMANTIC ENTITY EXTRACTION PROMPT
const ENTITY_EXTRACTION_PROMPT = `You are the discovery voice for ASPIRAL - a 3D visual thinking tool.

Your job: Extract entities AND ask ONE question that helps discover what's grinding.

TONE:
- Conversational, not clinical
- Direct, not fluffy
- Curious, not interrogative
- Human, not robotic

${QUESTION_PATTERN_EXAMPLES}

ABSOLUTELY FORBIDDEN (will break the product):
❌ "I hear your..." / "It sounds like..."
❌ "I'm here to help you..." / "Let's explore..."
❌ "Can you tell me more about..."
❌ "What I'm hearing is..." / "What I'm noticing is..."
❌ "How does that make you feel?"
❌ "What would success look like?"
❌ Starting with "What" more than once every 3 questions

ENTITY RULES:
1. Extract MAX 5 entities (NEVER more)
2. Only extract entities that MATTER to the friction
3. Each entity must have a CLEAR ROLE
4. Combine similar concepts (don't split "traffic" and "bad drivers")

ENTITY TYPES:
- problem: Obstacle or friction point (external)
- emotion: Internal feeling state
- value: What matters to them (goal, aspiration)
- friction: What's blocking them (internal conflict)
- grease: Potential solution (action, decision)
- action: Something they could do

ENTITY ROLES:
- external_irritant: Outside force causing friction
- internal_conflict: Inner struggle
- desire: What they want
- fear: What they're avoiding
- constraint: External limit
- solution: Potential grease

OUTPUT FORMAT (JSON):
{
  "entities": [
    {
      "type": "problem",
      "label": "short 3-word max",
      "role": "external_irritant",
      "emotionalValence": -0.8,
      "importance": 0.7,
      "positionHint": "lower_left"
    }
  ],
  "connections": [
    {
      "from": 0,
      "to": 1,
      "type": "causes",
      "strength": 0.9
    }
  ],
  "question": "Under 15 words. Use pattern variety. Reference their exact words.",
  "response": "Max 10 words. Acknowledge, don't analyze."
}

CONNECTION TYPES:
- causes: A leads to B
- blocks: A prevents B  
- enables: A helps B
- resolves: A solves B
- opposes: A conflicts with B

POSITION HINTS (based on emotional valence):
- upper_right: Positive desires, goals
- upper_left: Positive constraints
- lower_right: Negative but actionable
- lower_left: Negative friction points
- center: Core problem

WORKFLOW:
1. Extract 3-5 entities MAX (be ruthless)
2. Connect ONLY semantically related entities
3. Ask ONE question using varied pattern (check recent questions to avoid repetition)
4. Match their energy (casual if they're casual, intense if they're intense)
5. Under 15 words. Reference their EXACT words when possible.`;

// Tier-based entity limits
const ENTITY_LIMITS: Record<string, number> = {
  free: 5,
  creator: 7,
  pro: 10,
  business: 10,
  enterprise: 10,
};
const MAX_QUESTIONS = 2;

interface RequestBody {
  transcript: string;
  userTier?: string;
  sessionContext?: {
    entities?: Array<{ type: string; label: string }>;
    recentQuestions?: string[];
    questionCount?: number;
  };
  forceBreakthrough?: boolean;
}

interface EntityOutput {
  type: string;
  label: string;
  role?: string;
  emotionalValence?: number;
  importance?: number;
  positionHint?: string;
}

interface ConnectionOutput {
  from: number;
  to: number;
  type: "causes" | "blocks" | "enables" | "resolves" | "opposes";
  strength: number;
}

interface AIResponse {
  entities: EntityOutput[];
  connections: ConnectionOutput[];
  question: string;
  response: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      console.error("[SPIRAL-AI] OPENAI_API_KEY not configured");
      throw new Error("API key not configured");
    }

    const body: RequestBody = await req.json();
    const { transcript, sessionContext, userTier = "free" } = body;
    const maxEntities = ENTITY_LIMITS[userTier] || ENTITY_LIMITS.free;

    console.log("[SPIRAL-AI] Processing transcript:", transcript.slice(0, 100), "tier:", userTier, "maxEntities:", maxEntities);

    // Build context with existing entities
    let contextInfo = "";
    if (sessionContext?.entities?.length) {
      contextInfo += `\nExisting entities (don't duplicate): ${JSON.stringify(sessionContext.entities)}`;
    }
    if (sessionContext?.recentQuestions?.length) {
      contextInfo += `\nRecent questions (don't repeat): ${sessionContext.recentQuestions.join(", ")}`;
    }
    
    const questionCount = sessionContext?.questionCount || 0;
    if (questionCount >= MAX_QUESTIONS - 1) {
      contextInfo += `\n\nCRITICAL: This is the LAST question allowed. Make it count, then prepare for breakthrough.`;
    }

    const messages = [
      { role: "system", content: ENTITY_EXTRACTION_PROMPT + contextInfo },
      { role: "user", content: transcript },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SPIRAL-AI] OpenAI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    console.log("[SPIRAL-AI] Raw response:", content);

    // Parse the JSON response
    let parsed: AIResponse;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("[SPIRAL-AI] JSON parse error:", e);
      // Fallback response
      parsed = {
        entities: [],
        connections: [],
        question: "Tell me more about what you're experiencing?",
        response: "I hear you. Let's explore this together.",
      };
    }

    // HARD CAP entities by tier limit
    let entities: EntityOutput[] = Array.isArray(parsed.entities) 
      ? parsed.entities.slice(0, maxEntities) 
      : [];
    
    if (parsed.entities?.length > maxEntities) {
      console.warn(`[SPIRAL-AI] ⚠️ AI tried to extract ${parsed.entities.length} entities. Capped at ${maxEntities}.`);
    }

    // Validate entity labels are short (3 words max)
    entities = entities.map(e => ({
      ...e,
      label: e.label.split(' ').slice(0, 4).join(' '), // Cap at 4 words
    }));

    // Check if we should stop asking questions (reuse questionCount from above)
    const shouldStopQuestions = questionCount >= MAX_QUESTIONS || body.forceBreakthrough;
    
    // Filter connections to only valid ones
    const validConnections = Array.isArray(parsed.connections) 
      ? parsed.connections.filter(conn => 
          conn.from >= 0 && 
          conn.from < entities.length && 
          conn.to >= 0 && 
          conn.to < entities.length &&
          conn.strength > 0.5 // Only strong connections
        )
      : [];
    
    // Validate and clean response
    const result: AIResponse = {
      entities,
      connections: validConnections,
      question: shouldStopQuestions ? "" : (parsed.question || ""),
      response: parsed.response || "Got it.",
    };

    console.log("[SPIRAL-AI] Processed result:", {
      entityCount: result.entities.length,
      hasQuestion: !!result.question,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[SPIRAL-AI] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        entities: [],
        connections: [],
        question: "I'm having trouble processing that. Could you try again?",
        response: "",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
