import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface BreakthroughRequest {
  conversationHistory: string[];
  detectedPatterns?: Array<{ name: string; confidence: number; insight?: string }>;
  userContext?: string;
}

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const body: BreakthroughRequest = await req.json();
    const { conversationHistory, detectedPatterns = [], userContext } = body;

    // Build pattern hints
    const patternHints = detectedPatterns.length > 0
      ? `\n\nDETECTED PATTERNS (use these!):\n${detectedPatterns.map(p => 
          `- ${p.name}${p.insight ? `: ${p.insight}` : ''}`
        ).join("\n")}`
      : "";

    console.log("[GENERATE-BREAKTHROUGH] Starting:", {
      historyLength: conversationHistory.length,
      patterns: detectedPatterns.map(p => p.name),
    });

    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GENERATE-BREAKTHROUGH] AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
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

    // Parse breakthrough
    let breakthrough: { friction: string; grease: string; insight: string };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      breakthrough = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("[GENERATE-BREAKTHROUGH] Parse error, using fallback");
      breakthrough = {
        friction: "Something is pulling you in two directions",
        grease: "Take the smallest possible first step",
        insight: "The answer is already in you. You just needed to hear it out loud.",
      };
    }

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
