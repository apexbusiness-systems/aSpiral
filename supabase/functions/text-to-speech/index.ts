import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://esm.sh/zod@3.22.4";

// Configuration
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "*").split(",");

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*") ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

// Available voices
const VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'] as const;
const DEFAULT_VOICE = 'nova';
const DEFAULT_MODEL = 'tts-1';

// Key Validation Schema
const RequestSchema = z.object({
  text: z.string().min(1).max(4000),
  voice: z.enum(VOICES).optional().default(DEFAULT_VOICE),
  speed: z.number().min(0.25).max(4).optional().default(1),
});

serve(async (req) => {
  const origin = req.headers.get("origin") || "";

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    // 1. Auth Guard (Supabase JWT)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Unauthorized access attempt");
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Valid Supabase JWT required' }),
        { status: 401, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'TTS service not configured' }),
        { status: 503, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }

    // 2. Input Validation (Zod)
    const body = await req.json().catch(() => ({}));
    const parseResult = RequestSchema.safeParse(body);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parseResult.error.format() }),
        { status: 400, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }

    const { text, voice, speed } = parseResult.data;

    console.log(`[TTS] Generating speech for user ${user.id} (${text.length} chars), voice: ${voice}`);

    // 3. Rate Limiting (Optimistic)
    // In a real production scenario, use Redis/Upstash here. 
    // For now, logging usage is a minimal guardrail.

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        input: text,
        voice: voice,
        response_format: 'mp3',
        speed: speed,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[TTS] OpenAI API error: ${response.status}`, errText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // Return audio as binary
    return new Response(response.body, {
      headers: {
        ...corsHeaders(origin),
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('[TTS] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      }
    );
  }
});
