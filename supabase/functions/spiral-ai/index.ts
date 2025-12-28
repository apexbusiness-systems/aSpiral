import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// FRUSTRATION PATTERNS - immediate breakthrough trigger
const FRUSTRATION_PATTERNS = [
  /annoying/i, /stop/i, /enough/i, /just tell me/i, /wtf/i, /ffs/i,
  /come on/i, /seriously/i, /waste.*time/i, /dragging/i, /taking forever/i,
  /get to the point/i, /skip/i, /cut to/i, /what's the answer/i,
];

// Hard caps
const HARD_ENTITY_CAP = 5;
const MAX_QUESTIONS = 3;

// QUESTION PATTERNS for variety
const QUESTION_PATTERNS = `
QUESTION STRUCTURE (rotate these):
- Direct: "So {paraphrase}. What's grinding?"
- Excavation: "Underneath that, what else?"
- Contrast: "When you're NOT feeling {negative}, what's different?"
- Challenge: "Is it really {surface}, or something deeper?"
- Stakes: "What happens if you do nothing?"
- Binary: "Simple: stay or go?"

ABSOLUTELY FORBIDDEN:
❌ "I hear your..." / "It sounds like..."
❌ "I'm here to help..." / "Let's explore..."
❌ "Can you tell me more..."
❌ "How does that make you feel?"
❌ Starting consecutive questions with "What"

Be DIRECT. Under 15 words. Reference their EXACT words.`;

// Entity extraction prompt
const ENTITY_EXTRACTION_PROMPT = `You are ASPIRAL's discovery engine. Extract entities and ask ONE direct question.

${QUESTION_PATTERNS}

ENTITY RULES:
1. Extract MAX 5 entities (HARD LIMIT - violating this breaks the product)
2. Combine similar concepts
3. Only extract what MATTERS to the friction

ENTITY TYPES: problem, emotion, value, friction, grease, action
ENTITY ROLES: external_irritant, internal_conflict, desire, fear, constraint, solution

CONNECTION TYPES: causes, blocks, enables, resolves, opposes

OUTPUT JSON:
{
  "entities": [
    {"type": "problem", "label": "3-word max", "role": "external_irritant", "emotionalValence": -0.8, "importance": 0.9}
  ],
  "connections": [{"from": 0, "to": 1, "type": "causes", "strength": 0.8}],
  "question": "Under 15 words. Direct. No fluff.",
  "response": "Max 8 words. Acknowledge briefly."
}

NEVER exceed 5 entities. This is non-negotiable.`;

// Breakthrough prompt
const BREAKTHROUGH_PROMPT = `Synthesize the breakthrough from this conversation.

OUTPUT JSON:
{
  "friction": "The gears grinding (concise, <15 words)",
  "grease": "The solution (actionable, <15 words)", 
  "insight": "The memorable one-liner (<25 words)",
  "entities": [],
  "connections": [],
  "question": "",
  "response": ""
}

RULES:
1. Be SPECIFIC to their situation
2. Reference their actual words
3. Make insight memorable and quotable
4. Grease must be ACTIONABLE

EXAMPLES:
Traffic frustration → "You can't change the drivers. You can change how much space they take in your head."
Job decision → "You don't need to leap. You need to take the first step."

Be SPECIFIC. Be ACTIONABLE. Be MEMORABLE.`;

interface RequestBody {
  transcript: string;
  userTier?: string;
  ultraFast?: boolean;
  sessionContext?: {
    entities?: Array<{ type: string; label: string }>;
    conversationHistory?: string[];
    questionsAsked?: number;
    stage?: "friction" | "desire" | "blocker" | "breakthrough";
    detectedPatterns?: Array<{ name: string; confidence: number }>;
  };
  forceBreakthrough?: boolean;
  stagePrompt?: string;
}

interface AIResponse {
  entities: Array<{
    type: string;
    label: string;
    role?: string;
    emotionalValence?: number;
    importance?: number;
  }>;
  connections: Array<{
    from: number;
    to: number;
    type: string;
    strength: number;
  }>;
  question: string;
  response: string;
  friction?: string;
  grease?: string;
  insight?: string;
}

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      console.error("[SPIRAL-AI] LOVABLE_API_KEY not configured");
      throw new Error("API key not configured");
    }

    const body: RequestBody = await req.json();
    const { 
      transcript, 
      sessionContext, 
      userTier = "free", 
      stagePrompt,
      ultraFast = false 
    } = body;
    
    const questionsAsked = sessionContext?.questionsAsked || 0;
    const stage = sessionContext?.stage || "friction";

    // FRUSTRATION CHECK - immediate breakthrough
    const isFrustrated = FRUSTRATION_PATTERNS.some(p => p.test(transcript));
    if (isFrustrated) {
      console.log("[SPIRAL-AI] ⚠️ Frustration detected, forcing breakthrough");
    }

    // Determine if breakthrough
    const shouldBreakthrough = 
      body.forceBreakthrough || 
      isFrustrated || 
      ultraFast ||
      questionsAsked >= MAX_QUESTIONS;

    console.log("[SPIRAL-AI] Processing:", {
      stage,
      questionsAsked,
      shouldBreakthrough,
      isFrustrated,
      ultraFast,
      processingMs: Date.now() - startTime,
    });

    // Build context
    let contextInfo = "";
    if (sessionContext?.entities?.length) {
      contextInfo += `\nExisting entities (don't duplicate): ${sessionContext.entities.map(e => e.label).join(", ")}`;
    }
    if (sessionContext?.conversationHistory?.length) {
      contextInfo += `\nConversation:\n${sessionContext.conversationHistory.slice(-4).join("\n")}`;
    }
    if (sessionContext?.detectedPatterns?.length) {
      contextInfo += `\nPatterns (use for insight): ${sessionContext.detectedPatterns.map(p => p.name).join(", ")}`;
    }
    if (stagePrompt && !shouldBreakthrough) {
      contextInfo += `\n\nSTAGE: ${stagePrompt}`;
    }
    if (questionsAsked === MAX_QUESTIONS - 1 && !shouldBreakthrough) {
      contextInfo += `\n\n⚠️ LAST QUESTION - make it count.`;
    }

    const systemPrompt = shouldBreakthrough 
      ? BREAKTHROUGH_PROMPT + contextInfo 
      : ENTITY_EXTRACTION_PROMPT + contextInfo;

    // Call Lovable AI Gateway
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SPIRAL-AI] AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    console.log("[SPIRAL-AI] Raw response preview:", content.slice(0, 150));

    // Parse JSON response
    let parsed: AIResponse;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (e) {
      console.error("[SPIRAL-AI] JSON parse error:", e);
      parsed = {
        entities: [],
        connections: [],
        question: shouldBreakthrough ? "" : "What's grinding right now?",
        response: "I hear you.",
      };
    }

    // HARD CAP entities at 5 (non-negotiable)
    let entities = Array.isArray(parsed.entities) 
      ? parsed.entities.slice(0, HARD_ENTITY_CAP) 
      : [];
    
    if (parsed.entities?.length > HARD_ENTITY_CAP) {
      console.warn(`[SPIRAL-AI] ⚠️ CAPPED entities: ${parsed.entities.length} → ${HARD_ENTITY_CAP}`);
    }

    // Trim long labels
    entities = entities.map(e => ({
      ...e,
      label: e.label?.split(' ').slice(0, 4).join(' ') || e.label,
    }));

    // Filter valid connections
    const validConnections = Array.isArray(parsed.connections)
      ? parsed.connections.filter(conn =>
          conn.from >= 0 &&
          conn.from < entities.length &&
          conn.to >= 0 &&
          conn.to < entities.length &&
          conn.strength > 0.5
        )
      : [];

    const result: AIResponse = {
      entities,
      connections: validConnections,
      question: shouldBreakthrough ? "" : (parsed.question || ""),
      response: parsed.response || "Got it.",
      friction: parsed.friction,
      grease: parsed.grease,
      insight: parsed.insight,
    };

    const processingTime = Date.now() - startTime;
    console.log("[SPIRAL-AI] ✅ Complete:", {
      entityCount: result.entities.length,
      hasQuestion: !!result.question,
      isBreakthrough: shouldBreakthrough,
      hasInsight: !!result.insight,
      processingMs: processingTime,
    });

    return new Response(JSON.stringify(result), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-Processing-Time": `${processingTime}ms`,
      },
    });
  } catch (error) {
    console.error("[SPIRAL-AI] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        entities: [],
        connections: [],
        question: "Something went wrong. Try again?",
        response: "",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
