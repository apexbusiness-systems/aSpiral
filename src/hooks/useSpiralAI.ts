import { useState, useCallback, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { createLogger } from "@/lib/logger";
import { isUserFrustrated, wantsToSkip } from "@/lib/frustrationDetector";
import { validateCoherence, deduplicateEntities, prioritizeEntities } from "@/lib/coherenceValidator";
import { getEntityLimit, type UserTier } from "@/lib/entityLimits";
import { matchEnergy, adjustQuestionEnergy } from "@/lib/energyMatcher";
import { antiRepetition } from "@/lib/antiRepetition";
import type { EntityType, EntityMetadata, Entity } from "@/lib/types";

const logger = createLogger("useSpiralAI");

const SPIRAL_AI_URL = "https://eqtwatyodujxofrdznen.supabase.co/functions/v1/spiral-ai";

// LIMITS
const MAX_QUESTIONS = 2;

interface EntityResult {
  type: EntityType;
  label: string;
  role?: string;
  emotionalValence?: number;
  importance?: number;
  positionHint?: string;
}

interface ConnectionResult {
  from: number;
  to: number;
  type: "causes" | "blocks" | "enables" | "resolves" | "opposes";
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
  onCoherenceCheck?: (result: { valid: boolean; score: number; removed: string[] }) => void;
  onQuestion?: (question: string) => void;
  onBreakthrough?: () => void;
  onError?: (error: Error) => void;
  autoSendInterval?: number;
  userTier?: UserTier;
}

export function useSpiralAI(options: UseSpiralAIOptions = {}) {
  const { autoSendInterval = 10000, userTier = "free" } = options;
  const entityLimit = getEntityLimit(userTier);
  
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

        // Process entities with coherence validation
        let processedEntities = data.entities;
        
        // 1. Hard cap by tier limit
        processedEntities = processedEntities.slice(0, entityLimit);
        if (data.entities.length > entityLimit) {
          logger.warn(`Capped entities from ${data.entities.length} to ${entityLimit}`);
        }
        
        // 2. Convert to Entity format for validation
        const tempEntities: Entity[] = processedEntities.map((e, i) => ({
          id: `temp-${i}`,
          type: e.type,
          label: e.label,
          metadata: {
            role: e.role as EntityMetadata["role"],
            valence: e.emotionalValence,
            importance: e.importance,
            positionHint: e.positionHint,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        
        // 3. Deduplicate similar entities
        const dedupedEntities = deduplicateEntities(tempEntities);
        
        // 4. Validate coherence with transcript
        const coherenceResult = validateCoherence(dedupedEntities, transcript);
        
        logger.info("Coherence validation", {
          score: coherenceResult.coherenceScore,
          valid: coherenceResult.valid,
          kept: coherenceResult.kept.length,
          removed: coherenceResult.removed,
        });
        
        options.onCoherenceCheck?.({
          valid: coherenceResult.valid,
          score: coherenceResult.coherenceScore,
          removed: coherenceResult.removed,
        });
        
        // 5. Use refined entities if coherence was low
        const validatedEntities = coherenceResult.refinedEntities;
        
        // 6. Prioritize by importance
        const finalEntities = prioritizeEntities(validatedEntities, entityLimit);
        
        // Add entities to session with full metadata
        const createdEntityIds: string[] = [];
        if (finalEntities.length > 0) {
          finalEntities.forEach((entity) => {
            const created = addEntity({
              type: entity.type,
              label: entity.label,
              metadata: entity.metadata,
            });
            createdEntityIds.push(created.id);
          });

          // Map back to EntityResult format for callback
          const resultEntities: EntityResult[] = finalEntities.map(e => ({
            type: e.type,
            label: e.label,
            role: e.metadata?.role,
            emotionalValence: e.metadata?.valence,
            importance: e.metadata?.importance,
            positionHint: e.metadata?.positionHint,
          }));
          
          options.onEntitiesExtracted?.(resultEntities);
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

        // Track question and count with anti-repetition + energy matching
        if (data.question) {
          let processedQuestion = data.question;
          
          // Check for repetition
          if (antiRepetition.isTooSimilar(processedQuestion)) {
            logger.warn("Question too similar, keeping original for now", { question: processedQuestion });
            // In future: could request regeneration from AI
          }
          
          // Match user's energy
          const energy = matchEnergy(transcript);
          processedQuestion = adjustQuestionEnergy(processedQuestion, energy);
          
          // Record for tracking
          antiRepetition.record(processedQuestion, "generated");
          
          logger.info("Question processed", { 
            original: data.question, 
            processed: processedQuestion,
            energy,
            diversityScore: antiRepetition.getDiversityScore(),
          });
          
          questionCountRef.current++;
          recentQuestionsRef.current.push(processedQuestion);
          if (recentQuestionsRef.current.length > 5) {
            recentQuestionsRef.current.shift();
          }
          setCurrentQuestion(processedQuestion);
          options.onQuestion?.(processedQuestion);
          
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
    antiRepetition.reset();
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
