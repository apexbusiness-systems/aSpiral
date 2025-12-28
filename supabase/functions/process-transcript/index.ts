import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const HARD_ENTITY_CAP = 5;
const MAX_QUESTIONS = 3;

// Frustration detection patterns
const FRUSTRATION_PATTERNS = [
  /annoying/i, /stop/i, /enough/i, /just tell me/i, /wtf/i, /ffs/i,
  /come on/i, /seriously/i, /waste.*time/i, /dragging/i, /taking forever/i,
  /get to the point/i, /skip/i, /cut to/i, /what's the answer/i,
];

// Behavioral patterns for early detection
const BEHAVIORAL_PATTERNS: Record<string, { keywords: string[], insight: string }> = {
  "control-vs-chaos": {
    keywords: ["control", "can't control", "chaos", "unpredictable", "helpless"],
    insight: "You're fighting to control what can't be controlled",
  },
  "people-pleasing": {
    keywords: ["they want", "disappoint", "let down", "approval", "what they think"],
    insight: "You're prioritizing others' needs over your own",
  },
  "avoidance": {
    keywords: ["scared", "afraid", "avoid", "can't face", "putting off"],
    insight: "You're running from something that needs to be faced",
  },
  "perfectionism": {
    keywords: ["perfect", "not good enough", "failure", "mistake"],
    insight: "Perfect is the enemy of done",
  },
  "all-or-nothing": {
    keywords: ["either", "or", "only way", "have to", "must", "no choice"],
    insight: "There's a middle path you're not seeing",
  },
};

interface ProcessRequest {
  transcript: string;
  conversationHistory?: string[];
  questionsAsked?: number;
  ultraFast?: boolean;
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

    const body: ProcessRequest = await req.json();
    const { transcript, conversationHistory = [], questionsAsked = 0, ultraFast = false } = body;

    // Check frustration
    const isFrustrated = FRUSTRATION_PATTERNS.some(p => p.test(transcript));

    // Detect patterns early
    const allText = [...conversationHistory, transcript].join(" ").toLowerCase();
    const detectedPatterns: Array<{ name: string; confidence: number; insight: string }> = [];
    
    for (const [name, config] of Object.entries(BEHAVIORAL_PATTERNS)) {
      const matches = config.keywords.filter(kw => allText.includes(kw.toLowerCase()));
      if (matches.length > 0) {
        detectedPatterns.push({
          name,
          confidence: Math.min(0.4 + matches.length * 0.15, 0.95),
          insight: config.insight,
        });
      }
    }
    detectedPatterns.sort((a, b) => b.confidence - a.confidence);

    // Determine breakthrough trigger
    const highConfidencePattern = detectedPatterns.find(p => p.confidence > 0.8);
    const shouldBreakthrough = 
      isFrustrated || 
      ultraFast ||
      questionsAsked >= MAX_QUESTIONS || 
      !!highConfidencePattern;

    console.log("[PROCESS-TRANSCRIPT]", {
      isFrustrated,
      questionsAsked,
      shouldBreakthrough,
      topPattern: detectedPatterns[0]?.name,
      processingMs: Date.now() - startTime,
    });

    if (shouldBreakthrough) {
      return new Response(
        JSON.stringify({
          action: "breakthrough",
          triggerBreakthrough: true,
          reason: isFrustrated ? "frustration" : ultraFast ? "ultra_fast" : highConfidencePattern ? "pattern_detected" : "max_questions",
          detectedPatterns: detectedPatterns.slice(0, 2),
          processingTime: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parallel processing: entities + next question
    const questionType = questionsAsked === 0 ? "friction" : questionsAsked === 1 ? "desire" : "blocker";
    
    const [entitiesResult, questionResult] = await Promise.all([
      extractEntities(transcript, conversationHistory),
      generateNextQuestion(transcript, conversationHistory, questionType),
    ]);

    // HARD CAP entities
    const cappedEntities = entitiesResult.slice(0, HARD_ENTITY_CAP);
    if (entitiesResult.length > HARD_ENTITY_CAP) {
      console.warn(`[PROCESS-TRANSCRIPT] ⚠️ Capped: ${entitiesResult.length} → ${HARD_ENTITY_CAP}`);
    }

    const processingTime = Date.now() - startTime;
    console.log("[PROCESS-TRANSCRIPT] ✅ Complete:", {
      entityCount: cappedEntities.length,
      question: questionResult.question?.slice(0, 50),
      processingMs: processingTime,
    });

    return new Response(
      JSON.stringify({
        action: "continue",
        entities: cappedEntities,
        question: questionResult.question,
        response: questionResult.response,
        questionCount: questionsAsked + 1,
        detectedPatterns: detectedPatterns.slice(0, 2),
        processingTime,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-Processing-Time": `${processingTime}ms`,
        } 
      }
    );

  } catch (error) {
    console.error("[PROCESS-TRANSCRIPT] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractEntities(transcript: string, history: string[]): Promise<Array<{
  type: string;
  label: string;
  role?: string;
  emotionalValence?: number;
  importance?: number;
}>> {
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
          content: `Extract MAXIMUM 5 entities. This is a HARD REQUIREMENT.

RULES:
1. Extract 3-5 entities ONLY (never more)
2. Combine similar concepts
3. Only extract what's ESSENTIAL

OUTPUT JSON:
{
  "entities": [
    {"label": "traffic frustration", "type": "problem", "importance": 0.9, "emotionalValence": -0.8}
  ]
}

NEVER return more than 5 entities.`,
        },
        ...history.slice(-3).map(h => ({ role: "user" as const, content: h })),
        { role: "user", content: transcript },
      ],
    }),
  });

  if (!response.ok) {
    console.error("[EXTRACT-ENTITIES] Error:", response.status);
    return [];
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  try {
    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    return (parsed.entities || []).slice(0, HARD_ENTITY_CAP);
  } catch {
    return [];
  }
}

async function generateNextQuestion(
  transcript: string, 
  history: string[], 
  questionType: string
): Promise<{ question: string; response: string }> {
  const prompts: Record<string, string> = {
    friction: `Ask ONE direct question to identify what's grinding.
EXAMPLES: "So it's X. What's the real grind there?" / "Stuck on that. What's making it hard?"`,
    desire: `Ask ONE question to identify what they actually want.
EXAMPLES: "What do you want instead?" / "If this wasn't grinding, what would you have?"`,
    blocker: `Ask ONE question to identify what's blocking them.
EXAMPLES: "So what's stopping you?" / "What's in the way?"`,
  };

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
          content: `${prompts[questionType] || prompts.friction}

FORBIDDEN: "I hear your..." / "It sounds like..." / "Let's explore..."
Be DIRECT. Under 15 words. Reference their words.

OUTPUT JSON: {"question": "...", "response": "brief acknowledgment"}`,
        },
        ...history.slice(-3).map(h => ({ role: "user" as const, content: h })),
        { role: "user", content: transcript },
      ],
    }),
  });

  if (!response.ok) {
    return { question: "What's grinding right now?", response: "I hear you." };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  try {
    const jsonMatch = content?.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    return { 
      question: parsed.question || "What's grinding?", 
      response: parsed.response || "Got it." 
    };
  } catch {
    return { question: "What's grinding right now?", response: "Got it." };
  }
}
