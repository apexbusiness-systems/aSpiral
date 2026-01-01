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
import { createLogger } from "@/lib/logger";

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
  const listenerAttachedRef = useRef(false); // Prevent duplicate listeners
  const resultIndexRef = useRef(0); // Track processed results

  const { isRecording, setRecording, setError } = useSessionStore();

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (!SpeechRecognition) {
      logger.warn("Speech recognition not supported");
      emitDebugEvent({ type: 'stt.error', data: { error: 'not_supported' } });
    }
  }, []);

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
    listenerAttachedRef.current = false;
    resultIndexRef.current = 0;
    emitDebugEvent({ type: 'listener.detach', data: { reason: 'cleanup' } });
  }, []);

  const startRecording = useCallback(() => {
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

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      // Reset transcript buffers
      setFinalTranscript("");
      setInterimTranscript("");
      resultIndexRef.current = 0;

      recognition.onstart = () => {
        isStartedRef.current = true;
        setRecording(true);
        setIsPaused(false);
        emitDebugEvent({ type: 'stt.start', data: { lang: 'en-US' } });
      };

      recognition.onresult = (event) => {
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
                resultIndex: i 
              } 
            });
          } else {
            newInterimText += text;
            emitDebugEvent({ 
              type: 'stt.partial', 
              data: { 
                text: text.substring(0, 30) + (text.length > 30 ? '...' : ''), 
                length: text.length,
                resultIndex: i 
              } 
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
        setInterimTranscript(newInterimText);
      };

      recognition.onerror = (event) => {
        // "aborted" is not really an error, it's expected on stop
        if (event.error === 'aborted') {
          logger.debug("Recognition aborted (expected on stop)");
          return;
        }
        
        logger.error("Recognition error", new Error(event.error));
        emitDebugEvent({ type: 'stt.error', data: { error: event.error } });
        setError(`Voice recognition error: ${event.error}`);
        setRecording(false);
        setIsPaused(false);
        isStartedRef.current = false;
        options.onError?.(new Error(event.error));
      };

      recognition.onend = () => {
        emitDebugEvent({ type: 'stt.stop', data: { wasPaused: isPaused } });
        
        // Only update state if we're not paused (paused means intentional stop)
        if (!isPaused) {
          setRecording(false);
          isStartedRef.current = false;
        }
      };

      recognitionRef.current = recognition;
      listenerAttachedRef.current = true;
      emitDebugEvent({ type: 'listener.attach', data: { single: true } });
      
      recognition.start();
    } catch (error) {
      logger.error("Failed to start recording", error as Error);
      emitDebugEvent({ type: 'stt.error', data: { error: (error as Error).message } });
      setError("Failed to start voice recording");
      isStartedRef.current = false;
      options.onError?.(error as Error);
    }
  }, [setRecording, setError, options, cleanup, isPaused]);

  const stopRecording = useCallback(() => {
    emitDebugEvent({ type: 'stt.stop', data: { action: 'user_stop' } });
    cleanup();
    setRecording(false);
    setIsPaused(false);
    setInterimTranscript(""); // Clear interim on stop
  }, [setRecording, cleanup]);

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
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          isStartedRef.current = true;
          emitDebugEvent({ type: 'stt.start', data: { action: 'resume' } });
        };

        recognition.onresult = (event) => {
          let newFinalText = "";
          let newInterimText = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result[0].transcript;

            if (result.isFinal) {
              newFinalText += text;
              emitDebugEvent({ type: 'stt.final', data: { length: text.length } });
            } else {
              newInterimText += text;
              emitDebugEvent({ type: 'stt.partial', data: { length: text.length } });
            }
          }

          if (newFinalText) {
            setFinalTranscript(prev => (prev + " " + newFinalText).trim());
            options.onTranscript?.(newFinalText.trim());
          }
          setInterimTranscript(newInterimText);
        };

        recognition.onerror = (event) => {
          if (event.error === 'aborted') return;
          
          logger.error("Recognition error (resume)", new Error(event.error));
          emitDebugEvent({ type: 'stt.error', data: { error: event.error } });
          setError(`Voice recognition error: ${event.error}`);
          setRecording(false);
          setIsPaused(false);
          isStartedRef.current = false;
          options.onError?.(new Error(event.error));
        };

        recognition.onend = () => {
          if (!isPaused) {
            setRecording(false);
            isStartedRef.current = false;
          }
        };

        recognitionRef.current = recognition;
        listenerAttachedRef.current = true;
        emitDebugEvent({ type: 'listener.attach', data: { action: 'resume' } });
        
        recognition.start();
        logger.info("Recording resumed");
      }
    }
  }, [isPaused, setRecording, setError, options]);

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
