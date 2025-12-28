import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// SEMANTIC ENTITY EXTRACTION PROMPT
const ENTITY_EXTRACTION_PROMPT = `You are an expert at identifying the KEY actors and forces in someone's decision.

CRITICAL RULES:
1. Extract MAX 5 entities (NEVER more)
2. Only extract entities that MATTER to the friction
3. Each entity must have a CLEAR ROLE
4. Ask MAX 2 questions total, then stop
5. Under 15 words per question, direct, no fluff

ABSOLUTELY FORBIDDEN (will break the product):
❌ "I hear your..."
❌ "It sounds like you're feeling..."
❌ "I'm here to help you..."
❌ "Let's explore..."
❌ "Can you tell me more about..."
❌ "What I'm hearing is..."

ALLOWED STYLES:
✅ Direct: "So it's X. What's grinding?"
✅ Blunt: "What's stopping you?"
✅ Minimal: "And?"

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
  "question": "Under 15 words. Direct. No fluff.",
  "response": "Max 10 words. No therapy-speak."
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
- Extract 3-5 entities MAX (be ruthless)
- Connect ONLY semantically related entities
- Ask ONE direct question
- Be blunt, be helpful, get to clarity FAST`;

const ABSOLUTE_MAX_ENTITIES = 5;
const MAX_QUESTIONS = 2;

interface RequestBody {
  transcript: string;
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
    const { transcript, sessionContext } = body;

    console.log("[SPIRAL-AI] Processing transcript:", transcript.slice(0, 100));

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

    // HARD CAP entities at 5 - NO EXCEPTIONS
    let entities: EntityOutput[] = Array.isArray(parsed.entities) 
      ? parsed.entities.slice(0, ABSOLUTE_MAX_ENTITIES) 
      : [];
    
    if (parsed.entities?.length > ABSOLUTE_MAX_ENTITIES) {
      console.warn(`[SPIRAL-AI] ⚠️ AI tried to extract ${parsed.entities.length} entities. Capped at ${ABSOLUTE_MAX_ENTITIES}.`);
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
