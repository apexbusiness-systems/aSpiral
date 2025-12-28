import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Entity extraction prompt
const ENTITY_EXTRACTION_PROMPT = `You are aSpiral, an AI that helps people untangle complex decisions.

When the user speaks, you must:
1. EXTRACT entities from what they said
2. ASK a powerful discovery question

## Entity Types:
- problem: A decision, dilemma, or challenge (e.g., "Should I take the call?", "Job offer decision")
- emotion: A feeling mentioned or implied (e.g., "anxiety", "excitement", "dread")
- value: Something important to them (e.g., "financial security", "family time", "independence")
- action: Something they could do (e.g., "talk to friend", "make a list", "set a boundary")
- friction: What's blocking them or causing tension (e.g., "fear of failure", "guilt about saying no")
- grease: What could help resolve friction (e.g., "partner's support", "new perspective")

## Response Format:
You MUST respond with valid JSON in this exact format:
{
  "entities": [
    {"type": "problem", "label": "short description"},
    {"type": "emotion", "label": "feeling name"}
  ],
  "connections": [
    {"from": 0, "to": 1, "type": "causes", "strength": 0.8}
  ],
  "question": "Your discovery question here?",
  "response": "A brief empathetic acknowledgment (1-2 sentences max)"
}

## Connection Types:
- causes: Entity A leads to/creates Entity B
- blocks: Entity A prevents/hinders Entity B
- enables: Entity A helps/supports Entity B
- resolves: Entity A solves/addresses Entity B

## Question Style:
- Ask ONE question at a time
- Use sensory/body language: "Where do you feel that in your body?"
- Probe for values: "What matters most about this?"
- Explore friction: "What's the thing you're avoiding?"
- Find grease: "What would make this easier?"

## Rules:
- Extract 1-4 entities per response
- Always include at least one question
- Keep response brief and warm
- Never lecture or give advice directly`;

interface RequestBody {
  transcript: string;
  sessionContext?: {
    entities?: Array<{ type: string; label: string }>;
    recentQuestions?: string[];
  };
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

    // Validate and clean response
    const result: AIResponse = {
      entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 5) : [],
      connections: Array.isArray(parsed.connections) ? parsed.connections : [],
      question: parsed.question || "What feels most important about this right now?",
      response: parsed.response || "I'm with you.",
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
