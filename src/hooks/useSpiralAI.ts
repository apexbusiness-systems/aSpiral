import { useState, useCallback, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { createLogger } from "@/lib/logger";
import { isUserFrustrated, wantsToSkip } from "@/lib/frustrationDetector";
import type { EntityType } from "@/lib/types";

const logger = createLogger("useSpiralAI");

const SPIRAL_AI_URL = "https://eqtwatyodujxofrdznen.supabase.co/functions/v1/spiral-ai";

// EMERGENCY LIMITS
const MAX_QUESTIONS = 2;
const ABSOLUTE_MAX_ENTITIES = 5;

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
  onBreakthrough?: () => void;
  onError?: (error: Error) => void;
  autoSendInterval?: number;
}

export function useSpiralAI(options: UseSpiralAIOptions = {}) {
  const { autoSendInterval = 10000 } = options;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const transcriptBufferRef = useRef<string>("");
  const lastSendTimeRef = useRef<number>(0);
  const recentQuestionsRef = useRef<string[]>([]);
  const questionCountRef = useRef<number>(0);

  const {
    currentSession,
    addEntity,
    addConnection,
    addMessage,
    triggerBreakthrough,
  } = useSessionStore();

  // Force breakthrough immediately
  const forceBreakthrough = useCallback(() => {
    logger.info("FORCING BREAKTHROUGH - user frustrated or limit reached");
    setCurrentQuestion(null);
    questionCountRef.current = 0;
    triggerBreakthrough();
    options.onBreakthrough?.();
    
    addMessage({
      role: "assistant",
      content: "✨ **BREAKTHROUGH** ✨\n\nLet's cut to what matters.",
    });
  }, [triggerBreakthrough, addMessage, options]);

  // Process transcript through AI
  const processTranscript = useCallback(
    async (transcript: string): Promise<SpiralAIResponse | null> => {
      if (!transcript.trim() || isProcessing) return null;

      // FRUSTRATION CHECK - Stop immediately if user is annoyed
      if (isUserFrustrated(transcript) || wantsToSkip(transcript)) {
        logger.warn("User frustrated or wants to skip - forcing breakthrough");
        forceBreakthrough();
        return null;
      }

      // QUESTION LIMIT CHECK
      if (questionCountRef.current >= MAX_QUESTIONS) {
        logger.info("Question limit reached - forcing breakthrough");
        forceBreakthrough();
        return null;
      }

      logger.info("Processing transcript", { 
        length: transcript.length,
        questionCount: questionCountRef.current,
      });
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
              questionCount: questionCountRef.current,
            } : undefined,
            forceBreakthrough: questionCountRef.current >= MAX_QUESTIONS - 1,
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

        // HARD CAP entities at 5 on client side too
        const cappedEntities = data.entities.slice(0, ABSOLUTE_MAX_ENTITIES);
        if (data.entities.length > ABSOLUTE_MAX_ENTITIES) {
          logger.warn(`Capped entities from ${data.entities.length} to ${ABSOLUTE_MAX_ENTITIES}`);
        }

        // Add entities to session
        const createdEntityIds: string[] = [];
        if (cappedEntities.length > 0) {
          cappedEntities.forEach((entity) => {
            const created = addEntity({
              type: entity.type,
              label: entity.label,
            });
            createdEntityIds.push(created.id);
          });

          options.onEntitiesExtracted?.(cappedEntities);
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

        // Track question and count
        if (data.question) {
          questionCountRef.current++;
          recentQuestionsRef.current.push(data.question);
          if (recentQuestionsRef.current.length > 5) {
            recentQuestionsRef.current.shift();
          }
          setCurrentQuestion(data.question);
          options.onQuestion?.(data.question);
          
          // Check if this was the last allowed question
          if (questionCountRef.current >= MAX_QUESTIONS) {
            logger.info("Max questions reached, next response will be breakthrough");
          }
        } else {
          // No question = breakthrough time
          forceBreakthrough();
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
    [currentSession, addEntity, addConnection, addMessage, isProcessing, options, forceBreakthrough]
  );

  // Skip to breakthrough button handler
  const skipToBreakthrough = useCallback(() => {
    forceBreakthrough();
  }, [forceBreakthrough]);

  // Reset question count for new session
  const resetSession = useCallback(() => {
    questionCountRef.current = 0;
    recentQuestionsRef.current = [];
    setCurrentQuestion(null);
    setLastResponse(null);
  }, []);

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
    questionCount: questionCountRef.current,
    maxQuestions: MAX_QUESTIONS,
    processTranscript,
    accumulateTranscript,
    sendBuffer,
    clearBuffer,
    dismissQuestion,
    skipToBreakthrough,
    resetSession,
  };
}
