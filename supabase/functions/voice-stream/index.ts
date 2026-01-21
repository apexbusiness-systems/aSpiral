/**
 * Voice Stream WebSocket Function - OpenAI Realtime API Relay
 *
 * FUTURE-PROOFING: WebSocket endpoint for real-time voice AI
 * This function relays OpenAI Realtime API events when client connects.
 *
 * NOT CONNECTED YET: Backend "Ferrari" ready in garage for future WebRTC integration
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade',
      }
    });
  }

  // WebSocket upgrade check
  if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    return new Response(JSON.stringify({
      error: 'WebSocket connection required',
      message: 'Use WebSocket protocol for real-time voice streaming'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Validate OpenAI API key
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('[VOICE-STREAM] OPENAI_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Voice streaming service not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[VOICE-STREAM] WebSocket upgrade request accepted');

    // Create WebSocket pair for Supabase Edge Function
    const { socket: clientSocket, response: upgradeResponse } = Deno.upgradeWebSocket(req);

    // Connect to OpenAI Realtime API
    const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    let isConnected = false;

    // Handle OpenAI WebSocket connection
    openaiWs.onopen = () => {
      console.log('[VOICE-STREAM] Connected to OpenAI Realtime API');
      isConnected = true;

      // Send initial session configuration
      openaiWs.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `You are a helpful AI assistant in a real-time voice conversation.
          Keep responses concise and natural. Respond to user queries helpfully.`,
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          },
          tools: [],
          tool_choice: 'auto',
          temperature: 0.8,
          max_response_output_tokens: 4096
        }
      }));
    };

    openaiWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`[VOICE-STREAM] OpenAI → Client: ${message.type}`);

        // Relay message to client
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify(message));
        }
      } catch (error) {
        console.error('[VOICE-STREAM] Error parsing OpenAI message:', error);
      }
    };

    openaiWs.onerror = (error) => {
      console.error('[VOICE-STREAM] OpenAI WebSocket error:', error);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify({
          type: 'error',
          error: { message: 'OpenAI connection failed' }
        }));
      }
    };

    openaiWs.onclose = (event) => {
      console.log(`[VOICE-STREAM] OpenAI connection closed: ${event.code} ${event.reason}`);
      isConnected = false;
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(1000, 'OpenAI connection closed');
      }
    };

    // Handle client WebSocket messages
    clientSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`[VOICE-STREAM] Client → OpenAI: ${message.type}`);

        // Relay client messages to OpenAI (except our internal messages)
        if (openaiWs.readyState === WebSocket.OPEN && message.type !== 'ping') {
          openaiWs.send(JSON.stringify(message));
        }

        // Handle ping/pong for connection health
        if (message.type === 'ping') {
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        }
      } catch (error) {
        console.error('[VOICE-STREAM] Error parsing client message:', error);
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({
            type: 'error',
            error: { message: 'Invalid message format' }
          }));
        }
      }
    };

    clientSocket.onclose = (event) => {
      console.log(`[VOICE-STREAM] Client connection closed: ${event.code} ${event.reason}`);
      // Close OpenAI connection when client disconnects
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.close(1000, 'Client disconnected');
      }
    };

    clientSocket.onerror = (error) => {
      console.error('[VOICE-STREAM] Client WebSocket error:', error);
      // Close OpenAI connection on client error
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.close(1000, 'Client error');
      }
    };

    // Return the upgrade response to establish WebSocket connection
    return upgradeResponse;

  } catch (error) {
    console.error('[VOICE-STREAM] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
