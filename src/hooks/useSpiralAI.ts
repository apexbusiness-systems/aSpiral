import { useState, useCallback, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { createLogger } from "@/lib/logger";
import { isUserFrustrated, wantsToSkip } from "@/lib/frustrationDetector";
import { validateCoherence, deduplicateEntities, prioritizeEntities } from "@/lib/coherenceValidator";
import { getEntityLimit, type UserTier } from "@/lib/entityLimits";
import { matchEnergy, adjustQuestionEnergy } from "@/lib/energyMatcher";
import { antiRepetition } from "@/lib/antiRepetition";
import { 
  detectPatternsEarly, 
  shouldStopAsking, 
  getStageQuestion, 
  advanceStage,
  createFastTrackState,
  type ConversationStage,
  type Pattern,
  type FastTrackState,
} from "@/lib/fastTrack";
import type { EntityType, EntityMetadata, Entity } from "@/lib/types";

const logger = createLogger("useSpiralAI");

const SPIRAL_AI_URL = "https://eqtwatyodujxofrdznen.supabase.co/functions/v1/spiral-ai";

// Hard cap: 3 questions max
const MAX_QUESTIONS = 3;

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

interface BreakthroughData {
  friction: string;
  grease: string;
  insight: string;
}

interface UseSpiralAIOptions {
  onEntitiesExtracted?: (entities: EntityResult[]) => void;
  onCoherenceCheck?: (result: { valid: boolean; score: number; removed: string[] }) => void;
  onQuestion?: (question: string, stage: ConversationStage) => void;
  onBreakthrough?: (data?: BreakthroughData) => void;
  onPatternDetected?: (patterns: Pattern[]) => void;
  onError?: (error: Error) => void;
  autoSendInterval?: number;
  userTier?: UserTier;
}

export function useSpiralAI(options: UseSpiralAIOptions = {}) {
  const { autoSendInterval = 10000, userTier = "free" } = options;
  const entityLimit = getEntityLimit(userTier);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<"extracting" | "generating" | "breakthrough" | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<ConversationStage>("friction");
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [breakthroughData, setBreakthroughData] = useState<BreakthroughData | null>(null);
  const [showBreakthroughCard, setShowBreakthroughCard] = useState(false);
  const [ultraFastMode, setUltraFastMode] = useState(false);
  const transcriptBufferRef = useRef<string>("");
  const lastSendTimeRef = useRef<number>(0);
  const conversationHistoryRef = useRef<string[]>([]);
  const fastTrackRef = useRef<FastTrackState>(createFastTrackState());
  const patternsRef = useRef<Pattern[]>([]);

  const {
    currentSession,
    addEntity,
    addConnection,
    addMessage,
    triggerBreakthrough,
  } = useSessionStore();

  // Force breakthrough immediately
  const forceBreakthrough = useCallback((data?: BreakthroughData) => {
    logger.info("FORCING BREAKTHROUGH", { 
      reason: data ? "synthesis_complete" : "user_action",
      patterns: patternsRef.current.map(p => p.name),
    });
    
    setCurrentQuestion(null);
    setCurrentStage("breakthrough");
    fastTrackRef.current = createFastTrackState();
    triggerBreakthrough();
    
    if (data) {
      setBreakthroughData(data);
      setShowBreakthroughCard(true);
      options.onBreakthrough?.(data);
      
      // Format breakthrough message
      addMessage({
        role: "assistant",
        content: `✨ **BREAKTHROUGH** ✨

**The Friction:** ${data.friction}

**The Grease:** ${data.grease}

**💡 ${data.insight}**`,
      });
    } else {
      options.onBreakthrough?.();
      addMessage({
        role: "assistant",
        content: "✨ **BREAKTHROUGH** ✨\n\nLet's cut to what matters.",
      });
    }
  }, [triggerBreakthrough, addMessage, options]);

  // Dismiss breakthrough card
  const dismissBreakthroughCard = useCallback(() => {
    setShowBreakthroughCard(false);
  }, []);

  // Toggle ultra-fast mode
  const toggleUltraFastMode = useCallback((enabled: boolean) => {
    setUltraFastMode(enabled);
    if (enabled) {
      // In ultra-fast mode, force breakthrough on first response
      fastTrackRef.current.readyForBreakthrough = true;
    }
  }, []);

  // Process transcript through AI
  const processTranscript = useCallback(
    async (transcript: string): Promise<SpiralAIResponse | null> => {
      if (!transcript.trim() || isProcessing) return null;

      // Track conversation history
      conversationHistoryRef.current.push(transcript);

      // FRUSTRATION CHECK - Stop immediately if user is annoyed
      if (isUserFrustrated(transcript) || wantsToSkip(transcript)) {
        logger.warn("User frustrated or wants to skip - forcing breakthrough");
        forceBreakthrough();
        return null;
      }

      // EARLY PATTERN DETECTION - Don't wait for 5+ messages
      const detectedPatterns = detectPatternsEarly(transcript, conversationHistoryRef.current);
      if (detectedPatterns.length > 0) {
        patternsRef.current = detectedPatterns;
        fastTrackRef.current.detectedPatterns = detectedPatterns;
        options.onPatternDetected?.(detectedPatterns);
        logger.info("Patterns detected", { patterns: detectedPatterns.map(p => `${p.name}:${p.confidence}`) });
      }

      // SMART STOPPING - Check if we should force breakthrough
      const stopCheck = shouldStopAsking(
        transcript, 
        conversationHistoryRef.current, 
        patternsRef.current,
        fastTrackRef.current.questionsAsked
      );
      
      if (stopCheck.stop) {
        logger.info("Stopping questions", { reason: stopCheck.reason });
        fastTrackRef.current.readyForBreakthrough = true;
      }

      logger.info("Processing transcript", { 
        length: transcript.length,
        stage: fastTrackRef.current.stage,
        questionsAsked: fastTrackRef.current.questionsAsked,
        readyForBreakthrough: fastTrackRef.current.readyForBreakthrough,
      });
      setIsProcessing(true);
      setProcessingStage(fastTrackRef.current.readyForBreakthrough ? "breakthrough" : "extracting");

      try {
        // Get stage-specific prompt hints
        const stageConfig = getStageQuestion(fastTrackRef.current.stage);
        
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
              conversationHistory: conversationHistoryRef.current.slice(-5),
              questionsAsked: fastTrackRef.current.questionsAsked,
              stage: fastTrackRef.current.stage,
              detectedPatterns: patternsRef.current,
            } : undefined,
            forceBreakthrough: fastTrackRef.current.readyForBreakthrough,
            stagePrompt: stageConfig.systemPrompt,
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
            stage: fastTrackRef.current.stage,
            diversityScore: antiRepetition.getDiversityScore(),
          });
          
          // Update fast track state
          fastTrackRef.current.questionsAsked++;
          fastTrackRef.current.stage = advanceStage(fastTrackRef.current.stage);
          
          setCurrentQuestion(processedQuestion);
          setCurrentStage(fastTrackRef.current.stage);
          options.onQuestion?.(processedQuestion, fastTrackRef.current.stage);
          
          // Check if this was the last allowed question
          if (fastTrackRef.current.questionsAsked >= MAX_QUESTIONS) {
            logger.info("Max questions reached, next response will be breakthrough");
            fastTrackRef.current.readyForBreakthrough = true;
          }
        } else {
          // No question = breakthrough time
          // Try to parse breakthrough data from response
          try {
            const breakthroughMatch = data.response?.match(/\{[\s\S]*"friction"[\s\S]*"grease"[\s\S]*"insight"[\s\S]*\}/);
            if (breakthroughMatch) {
              const btData = JSON.parse(breakthroughMatch[0]) as BreakthroughData;
              forceBreakthrough(btData);
            } else {
              forceBreakthrough();
            }
          } catch {
            forceBreakthrough();
          }
        }

        // Store response
        if (data.response && data.question) {
          setLastResponse(data.response);
          
          // Add as message in chat
          addMessage({
            role: "assistant",
            content: data.response + `\n\n**${data.question}**`,
          });
        }

        return data;
      } catch (error) {
        logger.error("Failed to process transcript", error as Error);
        options.onError?.(error as Error);
        return null;
      } finally {
        setIsProcessing(false);
        setProcessingStage(null);
      }
    },
    [currentSession, addEntity, addConnection, addMessage, isProcessing, options, forceBreakthrough]
  );

  // Skip to breakthrough button handler
  const skipToBreakthrough = useCallback(() => {
    forceBreakthrough();
  }, [forceBreakthrough]);

  // Reset for new session
  const resetSession = useCallback(() => {
    fastTrackRef.current = createFastTrackState();
    conversationHistoryRef.current = [];
    patternsRef.current = [];
    antiRepetition.reset();
    setCurrentQuestion(null);
    setCurrentStage("friction");
    setLastResponse(null);
    setBreakthroughData(null);
    setShowBreakthroughCard(false);
    setUltraFastMode(false);
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
    processingStage,
    currentQuestion,
    currentStage,
    lastResponse,
    breakthroughData,
    showBreakthroughCard,
    ultraFastMode,
    questionCount: fastTrackRef.current.questionsAsked,
    maxQuestions: MAX_QUESTIONS,
    detectedPatterns: patternsRef.current,
    processTranscript,
    accumulateTranscript,
    sendBuffer,
    clearBuffer,
    dismissQuestion,
    skipToBreakthrough,
    resetSession,
    dismissBreakthroughCard,
    toggleUltraFastMode,
  };
}
