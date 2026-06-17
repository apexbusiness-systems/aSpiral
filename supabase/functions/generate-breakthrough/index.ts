import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_CHAT_MODEL = Deno.env.get("GROQ_CHAT_MODEL") || "llama-3.3-70b-versatile";
const GROQ_AI_URL = "https://api.groq.com/openai/v1/chat/completions";

interface BreakthroughRequest {
  conversationHistory: string[];
  detectedPatterns?: Array<{ name: string; confidence: number; insight?: string }>;
  userContext?: string;
}

interface Breakthrough {
  friction: string;
  grease: string;
  insight: string;
}

function buildPatternHints(detectedPatterns: Array<{ name: string; confidence: number; insight?: string }>): string {
  if (detectedPatterns.length === 0) return "";
  return `\n\nDETECTED PATTERNS (use these!):\n${detectedPatterns.map(p =>
    `- ${p.name}${p.insight ? `: ${p.insight}` : ''}`
  ).join("\n")}`;
}

function parseBreakthrough(content: string): Breakthrough {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
  } catch {
    console.error("[GENERATE-BREAKTHROUGH] Parse error, using fallback");
    return {
      friction: "Something is pulling you in two directions",
      grease: "Take the smallest possible first step",
      insight: "The answer is already in you. You just needed to hear it out loud.",
    };
  }
}

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") return handleCorsPreFlight(req);

  // AUTH GATE — added by audit/fix-all-issues
  const { requireUser } = await import('../_shared/requireUser.ts');
  const userOrResp = await requireUser(req, corsHeaders);
  if (userOrResp instanceof Response) return userOrResp;
  const user = userOrResp;

  const corsHeaders = getCorsHeaders(req);

  function createErrorResponse(status: number, message: string): Response {
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not configured");
    }

    const body: BreakthroughRequest = await req.json();
    const { conversationHistory, detectedPatterns = [], userContext } = body;

    const patternHints = buildPatternHints(detectedPatterns);

    console.log("[GENERATE-BREAKTHROUGH] Starting:", {
      historyLength: conversationHistory.length,
      patterns: detectedPatterns.map(p => p.name),
    });

    const response = await fetch(GROQ_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_CHAT_MODEL,
        messages: [
          {
            role: "system",
            content: `Generate a breakthrough from this ASPIRAL conversation.
${patternHints}

OUTPUT JSON:
{
  "friction": "The gears grinding (concise, <15 words, specific to their situation)",
  "grease": "The solution (actionable, <15 words, not generic advice)",
  "insight": "The memorable one-liner (<25 words, quotable, they'll remember this)"
}

RULES:
1. Be SPECIFIC to their situation - reference their actual words
2. Make the insight MEMORABLE - something they'll think about later
3. Grease must be ACTIONABLE - they can do this TODAY
4. Don't be generic - "be yourself" or "trust the process" is useless

GREAT EXAMPLES:
Traffic frustration → {
  "friction": "Your need for control vs the chaos you can't control",
  "grease": "Accept the chaos. Control your reaction instead.",
  "insight": "You can't change the drivers. You can change how much space they take in your head."
}

Job decision → {
  "friction": "Security pulling one way, fulfillment pulling the other",
  "grease": "Start the side project tonight. Keep the job.",
  "insight": "You don't need to burn the boats. Just dip a toe in the water."
}

Relationship conflict → {
  "friction": "Wanting to be right vs wanting to be close",
  "grease": "Ask 'what do you need?' before defending yourself.",
  "insight": "You can win the argument and lose the person."
}

Be SPECIFIC. Be ACTIONABLE. Be MEMORABLE.`,
          },
          ...conversationHistory.map((msg, i) => ({
            role: i % 2 === 0 ? "user" as const : "assistant" as const,
            content: msg,
          })),
          ...(userContext ? [{ role: "user" as const, content: `Additional context: ${userContext}` }] : []),
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GENERATE-BREAKTHROUGH] Groq API error:", response.status, errorText);

      if (response.status === 429) {
        return createErrorResponse(429, "Rate limit exceeded. Try again shortly.");
      }
      if (response.status === 402) {
        return createErrorResponse(402, "AI credits exhausted.");
      }

      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    const breakthrough = parseBreakthrough(content);

    const processingTime = Date.now() - startTime;
    console.log("[GENERATE-BREAKTHROUGH] ✅ Complete:", {
      friction: breakthrough.friction?.slice(0, 30),
      insight: breakthrough.insight?.slice(0, 40),
      processingMs: processingTime,
    });

    return new Response(
      JSON.stringify({
        ...breakthrough,
        processingTime,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Processing-Time": `${processingTime}ms`,
        },
      }
    );

  } catch (error) {
    console.error("[GENERATE-BREAKTHROUGH] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        friction: "Something needs to shift",
        grease: "Start with one small step",
        insight: "The answer was in you all along.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
