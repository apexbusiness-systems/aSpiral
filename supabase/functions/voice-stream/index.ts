import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsPreFlight(req);

  const corsHeaders = getCorsHeaders(req);

  return new Response(
    JSON.stringify({
      error:
        "Realtime phone voice streaming is disabled in Groq-only mode. Use speech-to-text + text-to-speech edge functions instead.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
