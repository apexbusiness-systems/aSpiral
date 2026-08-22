import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { getOptionalUser } from "../_shared/requireUser.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
if (!OPENAI_API_KEY) {
  console.error("[speech-to-text] Missing required env var OPENAI_API_KEY");
}

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

serve(async (req) => {
  const preflight = handleCorsPreFlight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data") && !contentType.startsWith("audio/")) {
      return new Response(JSON.stringify({ error: "Expected multipart/form-data or audio/*" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const optionalUser = await getOptionalUser(req);
    const user = optionalUser ?? { id: "guest" };

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      return new Response(JSON.stringify({ error: "STT service not configured (GROQ_API_KEY missing)" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const model = Deno.env.get("GROQ_STT_MODEL") || "whisper-large-v3-turbo";
    const formData = await req.formData();
    const audioFile = formData.get("file");
    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing or invalid 'file' field" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (audioFile.size === 0) return new Response(JSON.stringify({ error: "Audio file is empty" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (audioFile.size > MAX_AUDIO_BYTES) return new Response(JSON.stringify({ error: "Audio file exceeds 25 MB limit" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const language = formData.get("language");
    const groqForm = new FormData();
    groqForm.append("file", audioFile);
    groqForm.append("model", model);
    groqForm.append("response_format", "json");
    if (language && typeof language === "string") groqForm.append("language", language);

    const groqResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${groqApiKey}` }, body: groqForm });
    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error(`[STT] Groq API error status=${groqResponse.status}`, errText);
      return new Response(JSON.stringify({ error: `Groq API error: ${groqResponse.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const groqData = await groqResponse.json();
    const text = (groqData.text ?? "").trim();
    console.log(`[STT] user=${user.id} model=${model} chars=${text.length}`);
    return new Response(JSON.stringify({ text }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[speech-to-text] Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", code: "SPIRAL_AI_UNHANDLED" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
