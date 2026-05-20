import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireUser } from "../_shared/requireUser.ts";

const GROQ_TTS_URL = "https://api.groq.com/openai/v1/audio/speech";
const TTS_TIMEOUT_MS = 12_000;
const TTS_MAX_ATTEMPTS = 2;

// Legacy voice name → Groq Orpheus voice mapping
const VOICE_MAP: Record<string, string> = {
  nova: "hannah",
  sage: "hannah",
  shimmer: "hannah",
  ballad: "hannah",
  coral: "hannah",
  alloy: "austin",
  ash: "austin",
  echo: "troy",
  verse: "troy",
};

function resolveGroqVoice(voice: string): string {
  return VOICE_MAP[voice] ?? voice;
}

const RequestSchema = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().optional().default("austin"),
  speed: z.number().min(0.25).max(4).optional().default(1),
});

async function fetchWithTimeoutAndRetry(
  payload: Record<string, unknown>,
  apiKey: string
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= TTS_MAX_ATTEMPTS; attempt++) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), TTS_TIMEOUT_MS);

    try {
      const response = await fetch(GROQ_TTS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      const errText = await response.text();
      console.error(`[TTS] Groq error attempt=${attempt} status=${response.status}`, errText);

      if (response.status >= 500 && attempt < TTS_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 250 * attempt));
        continue;
      }

      throw new Error(`Groq API error: ${response.status}`);
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error("Unknown fetch error");
      if (attempt < TTS_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 250 * attempt));
      }
    }
  }

  throw lastError ?? new Error("Groq TTS request failed after retries");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsPreFlight(req);

  const corsHeaders = getCorsHeaders(req);

  try {
    const userOrResp = await requireUser(req, corsHeaders);
    if (userOrResp instanceof Response) return userOrResp;
    const user = userOrResp;

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: "TTS service not configured (GROQ_API_KEY missing)" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = RequestSchema.safeParse(body);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parseResult.error.format() }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { text, voice, speed } = parseResult.data;
    const model = Deno.env.get("GROQ_TTS_MODEL") || "canopylabs/orpheus-v1-english";
    const defaultVoice = Deno.env.get("GROQ_TTS_VOICE") || "austin";
    const resolvedVoice = resolveGroqVoice(voice || defaultVoice);

    console.log(`[TTS] Groq user=${user.id} chars=${text.length} voice=${resolvedVoice} model=${model}`);

    const groqResponse = await fetchWithTimeoutAndRetry(
      {
        model,
        input: text,
        voice: resolvedVoice,
        response_format: "wav",
        speed,
      },
      groqApiKey
    );

    return new Response(groqResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/wav",
        "X-TTS-Provider": "groq",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("[TTS] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
