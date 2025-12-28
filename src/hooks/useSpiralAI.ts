import { useState, useCallback, useRef, useEffect } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { createLogger } from "@/lib/logger";
import type { EntityType } from "@/lib/types";

const logger = createLogger("useSpiralAI");

const SPIRAL_AI_URL = "https://eqtwatyodujxofrdznen.supabase.co/functions/v1/spiral-ai";

interface EntityResult {
  type: EntityType;
  label: string;
}

interface ConnectionResult {
  from: number;
  to: number;
  type: "causes" | "blocks" | "enables" | "resolves";
  strength: number;
}

interface SpiralAIResponse {
  entities: EntityResult[];
  connections: ConnectionResult[];
  question: string;
  response: string;
}

interface UseSpiralAIOptions {
  onEntitiesExtracted?: (entities: EntityResult[]) => void;
  onQuestion?: (question: string) => void;
  onError?: (error: Error) => void;
  autoSendInterval?: number; // ms between auto-sends
}

export function useSpiralAI(options: UseSpiralAIOptions = {}) {
  const { autoSendInterval = 10000 } = options;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const transcriptBufferRef = useRef<string>("");
  const lastSendTimeRef = useRef<number>(0);
  const recentQuestionsRef = useRef<string[]>([]);

  const {
    currentSession,
    addEntity,
    addConnection,
    addMessage,
  } = useSessionStore();

  // Process transcript through AI
  const processTranscript = useCallback(
    async (transcript: string): Promise<SpiralAIResponse | null> => {
      if (!transcript.trim() || isProcessing) return null;

      logger.info("Processing transcript", { length: transcript.length });
      setIsProcessing(true);

      try {
        const response = await fetch(SPIRAL_AI_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcript,
            sessionContext: currentSession ? {
              entities: currentSession.entities.map(e => ({
                type: e.type,
                label: e.label,
              })),
              recentQuestions: recentQuestionsRef.current.slice(-3),
            } : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: SpiralAIResponse = await response.json();

        logger.info("AI response received", {
          entityCount: data.entities.length,
          hasQuestion: !!data.question,
        });

        // Add entities to session
        const createdEntityIds: string[] = [];
        if (data.entities.length > 0) {
          data.entities.forEach((entity) => {
            const created = addEntity({
              type: entity.type,
              label: entity.label,
            });
            createdEntityIds.push(created.id);
          });

          options.onEntitiesExtracted?.(data.entities);
        }

        // Add connections (after entities are created)
        if (data.connections.length > 0 && createdEntityIds.length >= 2) {
          setTimeout(() => {
            data.connections.forEach((conn) => {
              if (createdEntityIds[conn.from] && createdEntityIds[conn.to]) {
                addConnection({
                  fromEntityId: createdEntityIds[conn.from],
                  toEntityId: createdEntityIds[conn.to],
                  type: conn.type,
                  strength: conn.strength,
                });
              }
            });
          }, 50);
        }

        // Track question
        if (data.question) {
          recentQuestionsRef.current.push(data.question);
          if (recentQuestionsRef.current.length > 5) {
            recentQuestionsRef.current.shift();
          }
          setCurrentQuestion(data.question);
          options.onQuestion?.(data.question);
        }

        // Store response
        if (data.response) {
          setLastResponse(data.response);
          
          // Add as message in chat
          addMessage({
            role: "assistant",
            content: data.response + (data.question ? `\n\n**${data.question}**` : ""),
          });
        }

        return data;
      } catch (error) {
        logger.error("Failed to process transcript", error as Error);
        options.onError?.(error as Error);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [currentSession, addEntity, addConnection, addMessage, isProcessing, options]
  );

  // Accumulate transcript and auto-send periodically
  const accumulateTranscript = useCallback((text: string) => {
    transcriptBufferRef.current += (transcriptBufferRef.current ? " " : "") + text;
    
    const now = Date.now();
    const timeSinceLastSend = now - lastSendTimeRef.current;

    // Auto-send if buffer is substantial and enough time has passed
    if (
      transcriptBufferRef.current.length > 50 &&
      timeSinceLastSend > autoSendInterval &&
      !isProcessing
    ) {
      const buffer = transcriptBufferRef.current;
      transcriptBufferRef.current = "";
      lastSendTimeRef.current = now;
      
      // Add user message
      addMessage({
        role: "user",
        content: buffer,
      });
      
      processTranscript(buffer);
    }
  }, [autoSendInterval, isProcessing, processTranscript, addMessage]);

  // Send current buffer immediately
  const sendBuffer = useCallback(() => {
    if (transcriptBufferRef.current.trim() && !isProcessing) {
      const buffer = transcriptBufferRef.current;
      transcriptBufferRef.current = "";
      lastSendTimeRef.current = Date.now();
      
      // Add user message
      addMessage({
        role: "user",
        content: buffer,
      });
      
      processTranscript(buffer);
    }
  }, [isProcessing, processTranscript, addMessage]);

  // Clear buffer
  const clearBuffer = useCallback(() => {
    transcriptBufferRef.current = "";
  }, []);

  // Clear current question
  const dismissQuestion = useCallback(() => {
    setCurrentQuestion(null);
  }, []);

  return {
    isProcessing,
    currentQuestion,
    lastResponse,
    processTranscript,
    accumulateTranscript,
    sendBuffer,
    clearBuffer,
    dismissQuestion,
  };
}
