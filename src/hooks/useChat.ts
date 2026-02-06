import { useState, useCallback, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { createLogger } from "@/lib/logger";
import { retryWithBackoff } from "@/lib/retry";
import type { Message } from "@/lib/types";

const logger = createLogger("useChat");

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat`;

interface UseChatOptions {
  onError?: (error: Error) => void;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    messages,
    currentSession,
    addMessage,
    updateMessage,
    setProcessing,
    setError,
  } = useSessionStore();

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      logger.info("Sending message", { length: content.length });

      // Add user message
      const userMessage = addMessage({
        role: "user",
        content: content.trim(),
      });

      // Create placeholder for assistant message
      const assistantMessage = addMessage({
        role: "assistant",
        content: "",
        isStreaming: true,
      });

      setProcessing(true);
      setIsStreaming(true);
      options.onStreamStart?.();

      // Prepare messages for API
      const apiMessages = messages
        .concat(userMessage)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      try {
        abortControllerRef.current = new AbortController();

        const response = await retryWithBackoff(
          async () => {
            const res = await fetch(CHAT_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messages: apiMessages,
                stream: true,
                sessionContext: currentSession
                  ? {
                      entities: currentSession.entities,
                      frictionPoints: currentSession.frictionPoints,
                      sessionStatus: currentSession.status,
                    }
                  : undefined,
              }),
              signal: abortControllerRef.current?.signal,
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || `HTTP ${res.status}`);
            }

            return res;
          },
          { maxAttempts: 2 }
        );

        if (!response.body) {
          throw new Error("No response body");
        }

        // Stream the response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;
            if (!trimmed.startsWith("data: ")) continue;

            const jsonStr = trimmed.slice(6);
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                accumulatedContent += delta;
                updateMessage(assistantMessage.id, {
                  content: accumulatedContent,
                });
              }
            } catch {
              // Incomplete JSON, will be handled in next iteration
            }
          }
        }

        // Finalize message
        updateMessage(assistantMessage.id, {
          content: accumulatedContent,
          isStreaming: false,
        });

        logger.info("Message complete", {
          length: accumulatedContent.length,
        });
      } catch (error) {
        logger.error("Chat error", error as Error);

        const errorMessage =
          error instanceof Error ? error.message : "Failed to get response";

        updateMessage(assistantMessage.id, {
          content: "I'm having trouble connecting right now. Please try again.",
          isStreaming: false,
        });

        setError(errorMessage);
        options.onError?.(error as Error);
      } finally {
        setProcessing(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
        options.onStreamEnd?.();
      }
    },
    [messages, currentSession, addMessage, updateMessage, setProcessing, setError, options]
  );

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setProcessing(false);
      logger.info("Stream cancelled");
    }
  }, [setProcessing]);

  return {
    messages,
    sendMessage,
    cancelStream,
    isStreaming,
  };
}
