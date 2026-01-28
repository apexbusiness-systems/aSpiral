import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const LOG_LEVEL = Deno.env.get("LOG_LEVEL") || "info";

const log = (level: string, message: string, data?: any) => {
    const levels = ["error", "warn", "info", "debug"];
    if (levels.indexOf(level) <= levels.indexOf(LOG_LEVEL)) {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        }));
    }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Configuration
const OPENAI_REALTIME_MODEL = Deno.env.get("OPENAI_REALTIME_MODEL") || "gpt-4o-realtime-preview-2024-10-01";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const MAX_CONCURRENT_CONNECTIONS = 50; // Simple in-memory limit per instance

let activeConnections = 0;

serve(async (req) => {
    const upgrade = req.headers.get("upgrade") || "";
    if (upgrade.toLowerCase() !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    // 1. Connection Limiting
    if (activeConnections >= MAX_CONCURRENT_CONNECTIONS) {
        log("warn", "Max connections reached", { active: activeConnections });
        return new Response("Service Busy", { status: 503 });
    }

    // 2. Security: Handshake & Signature Validation
    const url = new URL(req.url);
    const twilioSignature = req.headers.get("x-twilio-signature");

    // Allow bypassing validation in LOCAL DEV ONLY if explicitly configured
    const isLocalDev = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const skipValidation = isLocalDev && !TWILIO_AUTH_TOKEN;

    if (!skipValidation) {
        if (!TWILIO_AUTH_TOKEN) {
            log("error", "Twilio Auth Token not configured");
            return new Response("Server Configuration Error", { status: 500 });
        }

        if (!twilioSignature) {
            log("warn", "Missing Twilio Signature", { ip: req.headers.get("x-forwarded-for") });
            return new Response("Unauthorized", { status: 401 });
        }

        // Note: Full cryptographic validation of X-Twilio-Signature requires reconstructing
        // the full parameter list which is complex in a streaming WebSocket context.
        // For this hardening phase, we enforce presence.
        // In a full production env, we'd validate the signature against the initial HTTP request params.
    }

    try {
        const { socket: twilioSocket, response } = Deno.upgradeWebSocket(req);

        activeConnections++;
        log("info", "New Connection", { active: activeConnections });

        // 3. Connect to OpenAI Realtime API
        const openAIUrl = `wss://api.openai.com/v1/realtime?model=${OPENAI_REALTIME_MODEL}`;
        const openAISocket = new WebSocket(openAIUrl, [
            "realtime",
            `openai-insecure-api-key.${Deno.env.get("OPENAI_API_KEY")}`,
            "openai-beta.realtime-v1",
        ]);

        // 4. Setup cleanup
        const cleanup = () => {
            if (openAISocket.readyState === WebSocket.OPEN) openAISocket.close();
            if (twilioSocket.readyState === WebSocket.OPEN) twilioSocket.close();
            activeConnections = Math.max(0, activeConnections - 1);
            log("info", "Connection Closed", { active: activeConnections });
        };

        // 5. Handle Twilio -> OpenAI Events
        twilioSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.event) {
                    case "media":
                        if (openAISocket.readyState === WebSocket.OPEN) {
                            const audioAppend = {
                                type: "input_audio_buffer.append",
                                audio: data.media.payload,
                            };
                            openAISocket.send(JSON.stringify(audioAppend));
                        }
                        break;
                    case "start":
                        log("info", "Twilio Stream Started", { streamSid: data.streamSid });
                        break;
                    case "stop":
                        log("info", "Twilio Stream Stopped");
                        cleanup();
                        break;
                }
            } catch (e) {
                log("error", "Error parsing Twilio message", { error: String(e) });
            }
        };

        twilioSocket.onclose = () => cleanup();
        twilioSocket.onerror = (e) => log("error", "Twilio Socket Error", { error: String(e) });

        // 6. Handle OpenAI -> Twilio Events
        openAISocket.onopen = () => {
            log("debug", "Connected to OpenAI Realtime API");

            // A. Initialize Session
            const sessionUpdate = {
                type: "session.update",
                session: {
                    modalities: ["text", "audio"],
                    instructions: SYSTEM_PROMPT,
                    voice: "shimmer",
                    input_audio_format: "g711_ulaw",
                    output_audio_format: "g711_ulaw",
                    turn_detection: {
                        type: "server_vad",
                        threshold: 0.5,
                        prefix_padding_ms: 300,
                        silence_duration_ms: 500,
                    },
                },
            };
            openAISocket.send(JSON.stringify(sessionUpdate));

            // B. Initial Greeting
            const initialGreeting = {
                type: "response.create",
                response: {
                    modalities: ["text", "audio"],
                    instructions: "Say 'Hello! calling from APEX Business Systems. How can I help you today?'",
                },
            };
            openAISocket.send(JSON.stringify(initialGreeting));
        };

        openAISocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "response.audio.delta" && data.delta) {
                    const audioDelta = {
                        event: "media",
                        media: { payload: data.delta },
                    };
                    if (twilioSocket.readyState === WebSocket.OPEN) {
                        twilioSocket.send(JSON.stringify(audioDelta));
                    }
                }
            } catch (e) {
                log("error", "Error processing OpenAI message", { error: String(e) });
            }
        };

        openAISocket.onclose = () => {
            log("info", "OpenAI Socket Closed");
            cleanup();
        };

        openAISocket.onerror = (e) => {
            log("error", "OpenAI Socket Error", { error: String(e) });
            cleanup();
        };

        return response;
    } catch (err) {
        activeConnections = Math.max(0, activeConnections - 1);
        log("error", "Upgrade failed", { error: String(err) });
        return new Response("Internal Server Error", { status: 500 });
    }
});
