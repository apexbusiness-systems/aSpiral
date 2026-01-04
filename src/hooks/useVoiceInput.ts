/**
 * useVoiceInput Hook - Fixed for STT "rapping/repeat" bug
 * 
 * ROOT CAUSE FIX:
 * 1. The original code appended interim transcripts repeatedly instead of replacing
 * 2. Multiple recognition instances could be created without cleanup
 * 3. No idempotent guards prevented duplicate listener attachment
 * 4. resultIndex was not properly tracked across recognition restarts
 * 
 * SOLUTION:
 * - Separate finalTranscript and interimTranscript buffers
 * - Only append to final when isFinal=true, replace interim otherwise
 * - Single recognition instance with proper lifecycle management
 * - Idempotent start/stop with ref guards
 * - Structured debug logging for verification
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useAssistantSpeakingStore } from "@/hooks/useAssistantSpeaking";
import { createLogger } from "@/lib/logger";
import { registerSTTController, updateListeningState, isGated } from "@/lib/audioSession";
import { addBreadcrumb } from "@/lib/debugOverlay";
import { featureFlags } from "@/lib/featureFlags";

const logger = createLogger("useVoiceInput");

// Debug event emitter for optional debug panel
type VoiceDebugEvent = {
  type: 'stt.start' | 'stt.stop' | 'stt.partial' | 'stt.final' | 'stt.error' | 'listener.attach' | 'listener.detach';
  timestamp: number;
  data?: Record<string, unknown>;
};

// Global debug event buffer (circular, max 50 events)
const DEBUG_BUFFER_SIZE = 50;
let debugBuffer: VoiceDebugEvent[] = [];
let debugSubscribers: Set<(events: VoiceDebugEvent[]) => void> = new Set();

function emitDebugEvent(event: Omit<VoiceDebugEvent, 'timestamp'>) {
  const fullEvent: VoiceDebugEvent = { ...event, timestamp: Date.now() };
  debugBuffer = [...debugBuffer.slice(-(DEBUG_BUFFER_SIZE - 1)), fullEvent];
  debugSubscribers.forEach(cb => cb(debugBuffer));

  if (event.type === 'stt.start' || event.type === 'stt.stop' || event.type === 'stt.error') {
    addBreadcrumb({
      type: 'voice',
      message: event.type,
      data: event.data,
    });
  }
  
  // Also log to console for debugging
  logger.debug(`[${event.type}]`, event.data);
}

// Export for debug panel
export function subscribeToVoiceDebug(callback: (events: VoiceDebugEvent[]) => void) {
  debugSubscribers.add(callback);
  callback(debugBuffer); // Send current buffer immediately
  return () => debugSubscribers.delete(callback);
}

export function getVoiceDebugBuffer() {
  return debugBuffer;
}

export function clearVoiceDebugBuffer() {
  debugBuffer = [];
  debugSubscribers.forEach(cb => cb(debugBuffer));
}

interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (error: Error) => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Two-buffer transcript model: final (append-only) + interim (replace on each update)
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  
  // Combined display transcript
  const transcript = (finalTranscript + " " + interimTranscript).trim();

  // Refs for lifecycle management
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isStartedRef = useRef(false); // Idempotent guard
  const interimTranscriptRef = useRef("");
  const lastInterimEmitRef = useRef(0);
  const INTERIM_UPDATE_INTERVAL = 150;

  const { isRecording, setRecording, setError } = useSessionStore();
  const voiceEnabled = featureFlags.voiceEnabled;
  
  // Assistant speaking gate - mute STT when assistant is speaking to prevent feedback loops
  const assistantIsSpeaking = useAssistantSpeakingStore(state => state.isSpeaking);
  const assistantIsSpeakingRef = useRef(assistantIsSpeaking);
  assistantIsSpeakingRef.current = assistantIsSpeaking;

  // Check for browser support
  useEffect(() => {
    if (!voiceEnabled) {
      setIsSupported(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (!SpeechRecognition) {
      logger.warn("Speech recognition not supported");
      emitDebugEvent({ type: 'stt.error', data: { error: 'not_supported' } });
    }
  }, [voiceEnabled]);

  // Cleanup function - ensures all resources are released
  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped, ignore
      }
      recognitionRef.current = null;
    }
    isStartedRef.current = false;
    interimTranscriptRef.current = "";
    emitDebugEvent({ type: 'listener.detach', data: { reason: 'cleanup' } });
  }, []);

  const emitInterimUpdate = useCallback((text: string, force = false) => {
    const now = Date.now();
    if (!force && now - lastInterimEmitRef.current < INTERIM_UPDATE_INTERVAL) {
      return;
    }
    lastInterimEmitRef.current = now;
    setInterimTranscript(text);
  }, []);

  const commitInterimAsFinal = useCallback(() => {
    const interim = interimTranscriptRef.current.trim();
    if (!interim) return;
    setFinalTranscript(prev => (prev + " " + interim).trim());
    options.onTranscript?.(interim);
    interimTranscriptRef.current = "";
    emitInterimUpdate("", true);
  }, [emitInterimUpdate, options]);

  const handleRecognitionResult = useCallback((event: SpeechRecognitionEvent) => {
    // FEEDBACK LOOP PREVENTION: Ignore transcripts while assistant is speaking OR during reverb gate
    // The isGated() check handles the 600ms "reverb buffer" after TTS ends
    if (assistantIsSpeakingRef.current || isGated()) {
      emitDebugEvent({
        type: 'stt.partial',
        data: {
          ignored: true,
          reason: assistantIsSpeakingRef.current ? 'assistant_speaking' : 'reverb_gated'
        },
      });
      return;
    }

    let newFinalText = "";
    let newInterimText = "";

    // Process only new results from resultIndex
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0].transcript;

      if (result.isFinal) {
        newFinalText += text;
        emitDebugEvent({
          type: 'stt.final',
          data: {
            text: text.substring(0, 50),
            length: text.length,
            resultIndex: i,
          },
        });
      } else {
        newInterimText += text;
        emitDebugEvent({
          type: 'stt.partial',
          data: {
            text: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
            length: text.length,
            resultIndex: i,
          },
        });
      }
    }

    // Update transcript buffers correctly:
    // - Final: APPEND new final text
    // - Interim: REPLACE with current interim (not append!)
    if (newFinalText) {
      setFinalTranscript(prev => (prev + " " + newFinalText).trim());
      // Notify parent of final transcript
      options.onTranscript?.(newFinalText.trim());
    }

    // Always replace interim (this is the key fix for "rapping")
    interimTranscriptRef.current = newInterimText;
    emitInterimUpdate(newInterimText);
  }, [emitInterimUpdate, options]);

  const handleRecognitionError = useCallback((event: SpeechRecognitionErrorEvent, context: string) => {
    // "aborted" is not really an error, it's expected on stop
    if (event.error === 'aborted') {
      logger.debug(`Recognition aborted (${context})`);
      return;
    }

    logger.error(`Recognition error (${context})`, new Error(event.error));
    emitDebugEvent({ type: 'stt.error', data: { error: event.error, context } });
    setError(`Voice recognition error: ${event.error}`);
    setRecording(false);
    setIsPaused(false);
    isStartedRef.current = false;
    options.onError?.(new Error(event.error));
  }, [options, setError, setRecording]);

  const createRecognition = useCallback((options: {
    onStart?: () => void;
    onEnd?: () => void;
    onErrorContext: string;
  }) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      isStartedRef.current = true;
      options.onStart?.();
    };

    recognition.onresult = handleRecognitionResult;

    recognition.onerror = (event) => {
      handleRecognitionError(event, options.onErrorContext);
    };

    recognition.onend = () => {
      options.onEnd?.();
    };

    return recognition;
  }, [handleRecognitionError, handleRecognitionResult]);

  const startRecording = useCallback(() => {
    if (!voiceEnabled) {
      setError("Voice input disabled");
      return;
    }

    // Idempotent guard - prevent double-start
    if (isStartedRef.current) {
      logger.warn("startRecording called but already started - ignoring");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const error = new Error("Speech recognition not supported");
      setError(error.message);
      options.onError?.(error);
      return;
    }

    try {
      // Clean up any existing instance first
      cleanup();

      // Reset transcript buffers
      setFinalTranscript("");
      emitInterimUpdate("", true);
      interimTranscriptRef.current = "";
      const recognition = createRecognition({
        onStart: () => {
          setRecording(true);
          setIsPaused(false);
          emitDebugEvent({ type: 'stt.start', data: { lang: 'en-US' } });
        },
        onEnd: () => {
          emitDebugEvent({ type: 'stt.stop', data: { wasPaused: isPaused } });

          // Only update state if we're not paused (paused means intentional stop)
          if (!isPaused) {
            commitInterimAsFinal();
            setRecording(false);
            isStartedRef.current = false;
          }
        },
        onErrorContext: 'start',
      });

      if (!recognition) {
        const error = new Error("Speech recognition not supported");
        setError(error.message);
        options.onError?.(error);
        return;
      }

      recognitionRef.current = recognition;
      emitDebugEvent({ type: 'listener.attach', data: { single: true } });
      
      recognition.start();
    } catch (error) {
      logger.error("Failed to start recording", error as Error);
      emitDebugEvent({ type: 'stt.error', data: { error: (error as Error).message } });
      setError("Failed to start voice recording");
      isStartedRef.current = false;
      options.onError?.(error as Error);
    }
  }, [setRecording, setError, options, cleanup, isPaused, emitInterimUpdate, commitInterimAsFinal, voiceEnabled, createRecognition]);

  const stopRecording = useCallback(() => {
    emitDebugEvent({ type: 'stt.stop', data: { action: 'user_stop' } });
    commitInterimAsFinal();
    cleanup();
    setRecording(false);
    setIsPaused(false);
    emitInterimUpdate("", true); // Clear interim on stop
  }, [setRecording, cleanup, commitInterimAsFinal, emitInterimUpdate]);

  const pauseRecording = useCallback(() => {
    if (recognitionRef.current && isRecording && !isPaused) {
      recognitionRef.current.stop();
      setIsPaused(true);
      emitDebugEvent({ type: 'stt.stop', data: { action: 'pause' } });
      logger.info("Recording paused");
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      isStartedRef.current = false; // Allow restart
      
      // Create new recognition instance for resume
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = createRecognition({
          onStart: () => {
            emitDebugEvent({ type: 'stt.start', data: { action: 'resume' } });
          },
          onEnd: () => {
            if (!isPaused) {
              commitInterimAsFinal();
              setRecording(false);
              isStartedRef.current = false;
            }
          },
          onErrorContext: 'resume',
        });

        if (!recognition) return;

        recognitionRef.current = recognition;
        emitDebugEvent({ type: 'listener.attach', data: { action: 'resume' } });

        recognition.start();
        logger.info("Recording resumed");
      }
    }
  }, [isPaused, setRecording, options, commitInterimAsFinal, createRecognition]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  }, [isPaused, pauseRecording, resumeRecording]);

  // Register STT controller for audio session coordination
  const stopListening = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  const resumeListening = useCallback(() => {
    if (!isRecording && !isPaused) {
      startRecording();
    }
  }, [isRecording, isPaused, startRecording]);

  const isListening = useCallback(() => isRecording && !isPaused, [isRecording, isPaused]);

  useEffect(() => {
    registerSTTController({ stopListening, resumeListening, isListening });
  }, [stopListening, resumeListening, isListening]);

  useEffect(() => {
    updateListeningState(isRecording && !isPaused);
  }, [isRecording, isPaused]);

  useEffect(() => {
    if (!voiceEnabled && isRecording) {
      stopRecording();
    }
  }, [voiceEnabled, isRecording, stopRecording]);

  // Cleanup on unmount - MUST be idempotent
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    isSupported,
    isPaused,
    transcript,
    // Expose individual buffers for debugging
    finalTranscript,
    interimTranscript,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    toggleRecording,
    togglePause,
  };
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}
