/**
 * useVoiceInput Hook - Fixed for STT "Rap God" Duplication Bug
 * 
 * CORE FIXES:
 * 1. Single AudioSessionController: Enforces exactly one active listener.
 * 2. Strict Transcript Assembly: Separate interim vs final buffers.
 * 3. Deduplication: Checks normalized text + timestamp to prevent echo.
 * 4. Audio Bridge: Respects native platform audio focus.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useAssistantSpeakingStore } from "@/hooks/useAssistantSpeaking";
import { createLogger } from "@/lib/logger";
import { registerSTTController, updateListeningState, isGated } from "@/lib/audioSession";
import { addBreadcrumb } from "@/lib/debugOverlay";
import { featureFlags } from "@/lib/featureFlags";
import { audioDebug } from "@/lib/audioLogger";

const logger = createLogger("useVoiceInput");

/**
 * Detect iOS Safari for voice input fallback handling
 * iOS Safari has quirks with continuous speech recognition
 */
function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isIOS && isSafari;
}

/**
 * Check if device supports Web Speech API reliably
 * Returns { supported: boolean, requiresFallback: boolean, reason?: string }
 */
function checkVoiceSupport(): { supported: boolean; requiresFallback: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { supported: false, requiresFallback: false, reason: 'no_window' };
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return { supported: false, requiresFallback: false, reason: 'no_speech_api' };
  }

  // iOS Safari requires special handling - continuous mode is unreliable
  if (isIOSSafari()) {
    return {
      supported: true,
      requiresFallback: true,
      reason: 'ios_safari_continuous_unreliable'
    };
  }

  return { supported: true, requiresFallback: false };
}

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

function checkVoiceSupport(): { supported: boolean; requiresFallback: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { supported: false, requiresFallback: false, reason: 'no_window' };
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return { supported: false, requiresFallback: false, reason: 'no_speech_api' };
  }
  if (isIOSSafari()) {
    return { supported: true, requiresFallback: true, reason: 'ios_safari_continuous_unreliable' };
  }
  return { supported: true, requiresFallback: false };
}

interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (error: Error) => void;
}

// Global Set of known final transcripts to prevent cross-component duplication if multiple hooks mounted
const globalFinalHistory = new Set<string>();

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Buffers
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  
  // Display
  const transcript = (finalTranscript + " " + interimTranscript).trim();

  // Refs
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isStartedRef = useRef(false);
  const isIntentionalStop = useRef(false);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);

  // Dedupe tracking
  const lastFinalCommitTime = useRef<number>(0);
  const lastFinalText = useRef<string>("");

  const { isRecording, setRecording, setError } = useSessionStore();
  const voiceEnabled = featureFlags.voiceEnabled;
  const assistantIsSpeaking = useAssistantSpeakingStore(state => state.isSpeaking);

  // Use ref to access current value in callbacks without dependency cycles
  const assistantIsSpeakingRef = useRef(assistantIsSpeaking);
  assistantIsSpeakingRef.current = assistantIsSpeaking;

  // Track iOS Safari mode for special handling
  const isIOSSafariMode = useRef(false);

  // Check for browser support with iOS Safari detection
  useEffect(() => {
    if (!voiceEnabled) {
      setIsSupported(false);
      return;
    }
    const check = checkVoiceSupport();
    setIsSupported(check.supported);
    isIOSSafariMode.current = check.requiresFallback;

    const voiceCheck = checkVoiceSupport();
    setIsSupported(voiceCheck.supported);
    isIOSSafariMode.current = voiceCheck.requiresFallback;

    if (!voiceCheck.supported) {
      logger.warn("Speech recognition not supported", { reason: voiceCheck.reason });
      emitDebugEvent({ type: 'stt.error', data: { error: 'not_supported', reason: voiceCheck.reason } });
    } else if (voiceCheck.requiresFallback) {
      logger.info("iOS Safari detected - using non-continuous mode for reliability");
      emitDebugEvent({ type: 'stt.start', data: { ios_safari_mode: true } });
    }
  }, [voiceEnabled]);

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        audioDebug.log('recognizer_stop', { reason: 'cleanup' });
      } catch (e) { /* ignore */ }
      recognitionRef.current = null;
    }
    isStartedRef.current = false;
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
  }, []);

  const handleRecognitionResult = useCallback((event: SpeechRecognitionEvent) => {
    // 1. Gate: Assistant Speaking
    if (assistantIsSpeakingRef.current) {
      audioDebug.log('stt_interim', { ignored: true, reason: 'assistant_speaking' });
      return;
    }

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

    // Process results
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0].transcript;

      if (VOICE_STOP_KEYWORDS.some(k => text.toLowerCase().includes(k))) {
        stopRecording();
        return;
      }

      if (result.isFinal) {
        newFinalText += text;
      } else {
        newInterimText += text;
      }
    }

    // Smart Silence Detection (Reset timer if final text received)
    if (newFinalText) {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => {
        logger.info("Silence detected. Stopping.");
        stopRecording();
      }, 2500);
    }

    // UPDATE TRANSCRIPTS
    // Always REPLACE interim
    setInterimTranscript(newInterimText);
    if (newInterimText) {
      audioDebug.log('stt_interim', { text: newInterimText });
    }

    // Commit Final with Deduplication
    if (newFinalText) {
      const normalized = newFinalText.trim().toLowerCase();
      const now = Date.now();

      // Dedupe check:
      // 1. Same text as last final commit?
      // 2. Within short window?
      const isDuplicate =
        (normalized === lastFinalText.current && (now - lastFinalCommitTime.current < DEDUPE_WINDOW_MS)) ||
        globalFinalHistory.has(normalized + "_" + Math.floor(now / 5000)); // Rough 5s window check using global set

      if (isDuplicate) {
        audioDebug.log('stt_dedupe', { text: newFinalText, reason: 'duplicate_detected' });
      } else {
        lastFinalText.current = normalized;
        lastFinalCommitTime.current = now;

        // Add to global set with rough timestamp to prevent cross-hook dupes
        globalFinalHistory.add(normalized + "_" + Math.floor(now / 5000));
        setTimeout(() => globalFinalHistory.clear(), 10000); // Cleanup global history

        setFinalTranscript(prev => (prev + " " + newFinalText).trim());
        options.onTranscript?.(newFinalText.trim());
        audioDebug.log('stt_final', { text: newFinalText });
      }
    }
  }, [options, setInterimTranscript, setFinalTranscript]);

  const handleRecognitionError = useCallback((event: SpeechRecognitionErrorEvent) => {
    if (event.error === 'aborted') return; // Normal stop

    audioDebug.error('recognizer_error', event.error);
    setError(`Voice error: ${event.error}`);

    // Hard stop on error
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
    // iOS Safari: use non-continuous mode for reliability (auto-restarts on silence)
    // Other browsers: use continuous mode for seamless recording
    recognition.continuous = !isIOSSafariMode.current;
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
    if (!voiceEnabled) return setError("Voice disabled");
    if (isStartedRef.current) return; // Idempotent

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return setError("Not supported");

    // Sound Effect: Start Recording (Subtle 'pop' or 'ding')
    // We use a simple oscillator here to avoid external assets, but in a real app this would be an audio file.
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      // Ignore audio feedback errors
    }

    try {
      cleanup();

      // Reset buffers
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
          emitDebugEvent({ type: 'stt.stop', data: { wasPaused: isPaused, iosSafari: isIOSSafariMode.current } });

          // Only update state if we're not paused (paused means intentional stop)
          if (!isPaused) {
            commitInterimAsFinal();

            // iOS Safari auto-restart: if in non-continuous mode and still recording, restart
            if (isIOSSafariMode.current && isStartedRef.current) {
              logger.debug("iOS Safari: auto-restarting recognition");
              setTimeout(() => {
                if (recognitionRef.current && isStartedRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (e) {
                    // Already started or other issue, ignore
                  }
                }
              }, 100);
              return; // Don't set recording to false
            }

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
      recognition.start();

    } catch (e) {
      audioDebug.error('session_start', e);
      setError("Failed to start");
    }
  }, [voiceEnabled, setError, cleanup, handleRecognitionResult, handleRecognitionError, setRecording]);

  const stopRecording = useCallback(() => {
    // Sound Effect: Stop Recording (Subtle 'dunk')
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      // Ignore
    }

    isIntentionalStop.current = true;
    cleanup();
    setRecording(false);
    setIsPaused(false);
    setInterimTranscript(""); // Clear residual interim
    audioDebug.log('session_end', { reason: 'user_stop' });
  }, [cleanup, setRecording]);

  const toggleRecording = useCallback(() => {
    isRecording ? stopRecording() : startRecording();
  }, [isRecording, stopRecording, startRecording]);

  // Pause/Resume Logic
  const pauseRecording = useCallback(() => {
    if (isRecording && !isPaused) {
      isIntentionalStop.current = true; // Treat pause as intentional stop of recognizer
      recognitionRef.current?.stop();
      setIsPaused(true);
      audioDebug.log('app_state_change', { state: 'paused' });
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      startRecording(); // Re-start recognizer
      audioDebug.log('app_state_change', { state: 'resumed' });
    }
  }, [isPaused, startRecording]);

  const togglePause = useCallback(() => {
    isPaused ? resumeRecording() : pauseRecording();
  }, [isPaused, resumeRecording, pauseRecording]);

  // Register with AudioSession for TTS coordination
  useEffect(() => {
    registerSTTController({
      stopListening: stopRecording,
      resumeListening: startRecording,
      isListening: () => isRecording && !isPaused
    });
  }, [stopRecording, startRecording, isRecording, isPaused]);

  // Sync Global State
  useEffect(() => {
    updateListeningState(isRecording && !isPaused);
  }, [isRecording, isPaused]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    isRecording,
    isSupported,
    isPaused,
    transcript,
    finalTranscript,
    interimTranscript,
    startRecording,
    stopRecording,
    toggleRecording,
    pauseRecording,
    resumeRecording,
    togglePause
  };
}

// Types
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
