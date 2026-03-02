import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://esm.sh/zod@3.22.4";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "*").split(",");
const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const OPENAI_TIMEOUT_MS = 12_000;
const OPENAI_MAX_ATTEMPTS = 2;

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*") ? origin || '*' : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

const VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'nova'] as const;
const DEFAULT_VOICE = 'nova' as const;
const DEFAULT_MODEL = 'tts-1';

const RequestSchema = z.object({
  text: z.string().min(1).max(4000),
  voice: z.enum(VOICES).optional().default(DEFAULT_VOICE),
  speed: z.number().min(0.25).max(4).optional().default(1),
});

async function fetchWithTimeoutAndRetry(payload: { model: string; input: string; voice: string; speed: number }, apiKey: string): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= OPENAI_MAX_ATTEMPTS; attempt += 1) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), OPENAI_TIMEOUT_MS);

    try {
      const response = await fetch(OPENAI_TTS_URL, {
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
      console.error(`[TTS] OpenAI API error attempt=${attempt} status=${response.status}`, errText);
      if (response.status >= 500 && attempt < OPENAI_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        continue;
      }

      throw new Error(`OpenAI API error: ${response.status}`);
    } catch (error) {
      clearTimeout(timeoutId);
      const normalized = error instanceof Error ? error : new Error('Unknown fetch error');
      lastError = normalized;
      if (attempt < OPENAI_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error('TTS request failed after retries');
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

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'TTS service not configured' }),
        { status: 503, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
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
    console.log(`[TTS] user=${user.id} chars=${text.length} voice=${voice} speed=${speed}`);

    const openaiResponse = await fetchWithTimeoutAndRetry(
      {
        model: DEFAULT_MODEL,
        input: text,
        voice,
        speed,
      },
      openaiApiKey,
    );

    return new Response(openaiResponse.body, {
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'audio/mpeg',
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
