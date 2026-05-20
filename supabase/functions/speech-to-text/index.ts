import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "*").split(",");
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin":
    ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*")
      ? origin || "*"
      : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
});

serve(async (req) => {
  const origin = req.headers.get("origin") || "";

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  try {
    // Auth: require valid Supabase user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Valid Supabase JWT required" }),
        {
          status: 401,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: "STT service not configured (GROQ_API_KEY missing)" }),
        {
          status: 503,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    const model =
      Deno.env.get("GROQ_STT_MODEL") || "whisper-large-v3-turbo";

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Expected multipart/form-data" }),
        {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid form data" }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const audioFile = formData.get("file");
    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'file' field" }),
        {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    if (audioFile.size === 0) {
      return new Response(JSON.stringify({ error: "Audio file is empty" }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    if (audioFile.size > MAX_AUDIO_BYTES) {
      return new Response(
        JSON.stringify({ error: "Audio file exceeds 25 MB limit" }),
        {
          status: 413,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    const language = formData.get("language");

    // Forward to Groq Whisper
    const groqForm = new FormData();
    groqForm.append("file", audioFile);
    groqForm.append("model", model);
    groqForm.append("response_format", "json");
    if (language && typeof language === "string") {
      groqForm.append("language", language);
    }

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: groqForm,
      }
    );

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error(
        `[STT] Groq API error status=${groqResponse.status}`,
        errText
      );
      return new Response(
        JSON.stringify({ error: `Groq API error: ${groqResponse.status}` }),
        {
          status: 502,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    const groqData = await groqResponse.json();
    const text = (groqData.text ?? "").trim();

    console.log(
      `[STT] user=${user.id} model=${model} chars=${text.length}`
    );

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("[STT] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});
