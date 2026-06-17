import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Validate Twilio signature to ensure request is genuinely from Twilio
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (twilioAuthToken) {
    const twilioSig = req.headers.get("X-Twilio-Signature") ?? "";
    const url = req.url;
    // For POST requests use form params; GET/others skip body
    const formBody = req.method === "POST" ? await req.text() : "";
    // Reconstruct the signature: HMAC-SHA1(authToken, url + sorted_params)
    const params = new URLSearchParams(formBody);
    const sortedKeys = [...params.keys()].sort();
    let sigString = url;
    for (const k of sortedKeys) {
      sigString += k + (params.get(k) ?? "");
    }
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(twilioAuthToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(sigString));
    const computedSig = btoa(String.fromCharCode(...new Uint8Array(sig)));
    if (twilioSig !== computedSig) {
      return new Response("Forbidden", { status: 403 });
    }
  }

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
