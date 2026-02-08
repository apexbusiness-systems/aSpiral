import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // 1. Construct the WebSocket URL dynamically based on the current host
  const { hostname } = new URL(req.url);
  
  // 2. Generate TwiML to connect the stream immediately
  // Note: We use wss:// for secure WebSocket connection
  const twiml = `
    <Response>
      <Connect>
        <Stream url="wss://${hostname}/functions/v1/voice-stream" />
      </Connect>
    </Response>
  `;

  // 3. Return XML response with correct content type
  return new Response(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
});
