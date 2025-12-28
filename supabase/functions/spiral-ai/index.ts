import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// EMERGENCY SYSTEM PROMPT - Direct, no therapy-speak
const ENTITY_EXTRACTION_PROMPT = `You are the AI for ASPIRAL - a visual breakthrough tool.

CRITICAL RULES:
1. Extract MAX 5 entities (NEVER more, or user gets overwhelmed)
2. Ask MAX 2 questions total (then force breakthrough)
3. If user says "annoying", "stop", or similar → STOP immediately, give breakthrough
4. Questions under 15 words, direct, no fluff

ABSOLUTELY FORBIDDEN PHRASES (will break the product):
❌ "I hear your..."
❌ "It sounds like you're feeling..."
❌ "I'm here to help you..."
❌ "Let's explore..."
❌ "Can you tell me more about..."
❌ "What I'm hearing is..."
❌ "It seems like..."
❌ "I understand that..."
❌ "That must be..."

If you use ANY forbidden phrase, the user will get frustrated and leave.

ALLOWED STYLES:
✅ Direct: "So it's X. What's grinding there?"
✅ Blunt: "What's stopping you?"
✅ Minimal: "And?"

## Entity Types (pick 3-5 max):
- problem: A decision, dilemma, or challenge
- emotion: A feeling mentioned or implied
- value: Something important to them
- friction: What's blocking them or causing tension
- grease: What could help resolve friction
- action: Something they could do

## Response Format:
You MUST respond with valid JSON:
{
  "entities": [
    {"type": "problem", "label": "short 3-word max"},
    {"type": "emotion", "label": "one word"}
  ],
  "connections": [
    {"from": 0, "to": 1, "type": "causes", "strength": 0.8}
  ],
  "question": "Under 15 words. Direct. No fluff.",
  "response": "Max 10 words. Acknowledge, don't mirror."
}

## Connection Types:
- causes: A leads to B
- blocks: A prevents B
- enables: A helps B
- resolves: A solves B

## Question Style (CRITICAL):
- Q1: Identify friction ("What's grinding?")
- Q2: Identify desire ("What do you want instead?")
- Then STOP asking questions

WORKFLOW:
- Extract 3-5 entities MAX
- Ask ONE question under 15 words
- Be direct, be blunt, be helpful

You have ONE JOB: Get them to clarity FAST.`;

const ABSOLUTE_MAX_ENTITIES = 5; // HARD CAP - NO EXCEPTIONS
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
}

interface ConnectionOutput {
  from: number;
  to: number;
  type: "causes" | "blocks" | "enables" | "resolves";
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

    // Build context
    let contextInfo = "";
    if (sessionContext?.entities?.length) {
      contextInfo += `\nExisting entities: ${JSON.stringify(sessionContext.entities)}`;
    }
    if (sessionContext?.recentQuestions?.length) {
      contextInfo += `\nRecent questions asked (avoid repeating): ${sessionContext.recentQuestions.join(", ")}`;
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
    let entities = Array.isArray(parsed.entities) ? parsed.entities.slice(0, ABSOLUTE_MAX_ENTITIES) : [];
    
    if (parsed.entities?.length > ABSOLUTE_MAX_ENTITIES) {
      console.warn(`[SPIRAL-AI] ⚠️ AI tried to extract ${parsed.entities.length} entities. Capped at ${ABSOLUTE_MAX_ENTITIES}.`);
    }

    // Check if we should stop asking questions
    const questionCount = sessionContext?.questionCount || 0;
    const shouldStopQuestions = questionCount >= MAX_QUESTIONS || body.forceBreakthrough;
    
    // Validate and clean response
    const result: AIResponse = {
      entities,
      connections: Array.isArray(parsed.connections) ? parsed.connections : [],
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
