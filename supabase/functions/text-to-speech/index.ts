import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://esm.sh/zod@3.22.4";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "*").split(",");

// ============================================================================
// GROQ TTS API (Primary) with OpenAI TTS fallback
// Groq uses PlayAI/Orpheus voices via OpenAI-compatible endpoint
// ============================================================================
const GROQ_TTS_URL = 'https://api.groq.com/openai/v1/audio/speech';
const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const TTS_TIMEOUT_MS = 12_000;
const TTS_MAX_ATTEMPTS = 2;

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*") ? origin || '*' : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

// Groq voices (Orpheus model)
const GROQ_VOICES = ['Arista-PlayAI', 'Atlas-PlayAI', 'Basil-PlayAI', 'Briggs-PlayAI', 'Calista-PlayAI', 'Celeste-PlayAI', 'Cheyenne-PlayAI', 'Chip-PlayAI', 'Cillian-PlayAI', 'Deedee-PlayAI', 'Emerson-PlayAI', 'Evander-PlayAI', 'Fritz-PlayAI', 'Gail-PlayAI', 'Indira-PlayAI', 'Mamaw-PlayAI', 'Mason-PlayAI', 'Mikail-PlayAI', 'Mitch-PlayAI', 'Nia-PlayAI', 'Quinn-PlayAI', 'Thunder-PlayAI'] as const;
const DEFAULT_GROQ_VOICE = 'Fritz-PlayAI' as const;
const GROQ_MODEL = 'playai-tts';

// OpenAI voices (fallback)
const OPENAI_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'nova'] as const;

// Map legacy OpenAI voice names to Groq equivalents
const VOICE_MAP: Record<string, string> = {
  nova: 'Arista-PlayAI',       // warm, natural female
  sage: 'Celeste-PlayAI',      // calm, measured
  shimmer: 'Calista-PlayAI',   // energetic
  alloy: 'Fritz-PlayAI',       // professional male
  echo: 'Atlas-PlayAI',        // deep male
  ash: 'Basil-PlayAI',
  ballad: 'Cheyenne-PlayAI',
  coral: 'Nia-PlayAI',
  verse: 'Emerson-PlayAI',
};

// Accept both OpenAI and Groq voice names
const ALL_VOICES = [...GROQ_VOICES, ...OPENAI_VOICES] as const;

const RequestSchema = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().optional().default('nova'),
  speed: z.number().min(0.25).max(4).optional().default(1),
});

function resolveGroqVoice(voice: string): string {
  // If it's already a Groq voice, use as-is
  if (GROQ_VOICES.includes(voice as typeof GROQ_VOICES[number])) {
    return voice;
  }
  // Map from OpenAI voice name
  return VOICE_MAP[voice] || DEFAULT_GROQ_VOICE;
}

async function fetchWithTimeoutAndRetry(
  url: string,
  payload: Record<string, unknown>,
  apiKey: string,
  label: string,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= TTS_MAX_ATTEMPTS; attempt += 1) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), TTS_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      const errText = await response.text();
      console.error(`[TTS] ${label} error attempt=${attempt} status=${response.status}`, errText);
      if (response.status >= 500 && attempt < TTS_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        continue;
      }

      throw new Error(`${label} API error: ${response.status}`);
    } catch (error) {
      clearTimeout(timeoutId);
      const normalized = error instanceof Error ? error : new Error('Unknown fetch error');
      lastError = normalized;
      if (attempt < TTS_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error(`${label} TTS request failed after retries`);
}

serve(async (req) => {
  const origin = req.headers.get("origin") || "";

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Valid Supabase JWT required' }),
        { status: 401, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = RequestSchema.safeParse(body);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parseResult.error.format() }),
        { status: 400, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }

    const { text, voice, speed } = parseResult.data;

    // ====================================================================
    // PRIMARY: Groq TTS (fast, reliable)
    // ====================================================================
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (groqApiKey) {
      const groqVoice = resolveGroqVoice(voice);
      console.log(`[TTS] Groq user=${user.id} chars=${text.length} voice=${groqVoice} (mapped from ${voice})`);

      try {
        const groqResponse = await fetchWithTimeoutAndRetry(
          GROQ_TTS_URL,
          {
            model: GROQ_MODEL,
            input: text,
            voice: groqVoice,
            response_format: 'mp3',
          },
          groqApiKey,
          'Groq',
        );

        return new Response(groqResponse.body, {
          headers: {
            ...corsHeaders(origin),
            'Content-Type': 'audio/mpeg',
            'X-TTS-Provider': 'groq',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      } catch (groqError) {
        console.error('[TTS] Groq failed, falling back to OpenAI:', (groqError as Error).message);
        // Fall through to OpenAI fallback
      }
    }

    // ====================================================================
    // FALLBACK: OpenAI TTS
    // ====================================================================
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'TTS service not configured (no GROQ_API_KEY or OPENAI_API_KEY)' }),
        { status: 503, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }

    // Use original OpenAI voice name (or default to nova)
    const openaiVoice = OPENAI_VOICES.includes(voice as typeof OPENAI_VOICES[number]) ? voice : 'nova';
    console.log(`[TTS] OpenAI fallback user=${user.id} chars=${text.length} voice=${openaiVoice} speed=${speed}`);

    const openaiResponse = await fetchWithTimeoutAndRetry(
      OPENAI_TTS_URL,
      {
        model: 'tts-1',
        input: text,
        voice: openaiVoice,
        speed,
      },
      openaiApiKey,
      'OpenAI',
    );

    return new Response(openaiResponse.body, {
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'audio/mpeg',
        'X-TTS-Provider': 'openai',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[TTS] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      }
    );
  }
});
