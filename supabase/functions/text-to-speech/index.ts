/**
 * Text-to-Speech Edge Function
 * 
 * Converts text to speech using OpenAI's TTS API.
 * Returns MP3 audio as binary response.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Available voices: alloy, ash, ballad, coral, echo, sage, shimmer, verse
const DEFAULT_VOICE = 'nova';
const DEFAULT_MODEL = 'tts-1'; // or 'tts-1-hd' for higher quality

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'TTS service not configured' }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { text, voice, speed } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Limit text length to prevent abuse
    const maxLength = 4000;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;

    console.log(`[TTS] Generating speech for ${truncatedText.length} chars, voice: ${voice || DEFAULT_VOICE}`);

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        input: truncatedText,
        voice: voice || DEFAULT_VOICE,
        response_format: 'mp3',
        speed: speed || 1.0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TTS] OpenAI API error: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate speech' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return audio as binary
    const audioBuffer = await response.arrayBuffer();
    
    console.log(`[TTS] Generated ${audioBuffer.byteLength} bytes of audio`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('[TTS] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
