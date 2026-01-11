import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SYSTEM_PROMPT = `You are a helpful AI receptionist for APEX Business Systems.
Your goal is to handle incoming calls, answer questions about business automation, and assist with scheduling.
You should be polite, professional, and concise.
Always speak immediately when the call connects.`;

serve(async (req) => {
    // 1. Handle Websocket Upgrade
    if (req.headers.get("upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const { socket: twilioSocket, response } = Deno.upgradeWebSocket(req);

    // 2. Connect to OpenAI Realtime API
    const openAIUrl = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
    const openAISocket = new WebSocket(openAIUrl, [
        "realtime",
        `openai-insecure-api-key.${Deno.env.get("OPENAI_API_KEY")}`,
        "openai-beta.realtime-v1",
    ]);

    // 3. Setup cleanup
    const cleanup = () => {
        if (openAISocket.readyState === WebSocket.OPEN) openAISocket.close();
        if (twilioSocket.readyState === WebSocket.OPEN) twilioSocket.close();
    };

    // 4. Handle Twilio -> OpenAI Events
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
                    console.log("Twilio Stream Started:", data.streamSid);
                    break;
                case "stop":
                    console.log("Twilio Stream Stopped");
                    cleanup();
                    break;
            }
        } catch (e) {
            console.error("Error parsing Twilio message:", e);
        }
    };

    // 5. Handle OpenAI -> Twilio Events
    openAISocket.onopen = () => {
        console.log("Connected to OpenAI Realtime API");

        // A. Initialize Session
        const sessionUpdate = {
            type: "session.update",
            session: {
                modalities: ["text", "audio"],
                instructions: SYSTEM_PROMPT,
                voice: "shimmer", // Options: alloy, echo, shimmer
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

        // B. [CRITICAL FIX] Trigger Initial Greeting Immediately
        // This forces the model to generate audio right now.
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
                // Stream audio back to Twilio
                const audioDelta = {
                    event: "media",
                    media: {
                        payload: data.delta,
                    },
                };
                if (twilioSocket.readyState === WebSocket.OPEN) {
                    twilioSocket.send(JSON.stringify(audioDelta));
                }
            }
        } catch (e) {
            console.error("Error processing OpenAI message:", e);
        }
    };

    openAISocket.onclose = () => {
        console.log("OpenAI Socket Closed");
        cleanup();
    };

    return response;
});
