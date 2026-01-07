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
import { beginSTTSession, endSTTSession, registerSTTController, updateListeningState, isGated } from "@/lib/audioSession";
import { featureFlags } from "@/lib/featureFlags";
import { audioDebug } from "@/lib/audioLogger";
import { toast } from "sonner";

const logger = createLogger("useVoiceInput");
const VOICE_STOP_KEYWORDS = ['stop', 'pause', 'end session', 'shut up', 'hold on'];
const DEDUPE_WINDOW_MS = 2000; // Time window to ignore duplicate final commits
const SETTINGS_STORAGE_KEY = "aspiral_settings_v1";

type StoredSettings = {
  soundEffects?: boolean;
  reducedMotion?: boolean;
};

const parseStoredSettings = (value: string | null): StoredSettings | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as StoredSettings;
  } catch {
    return null;
  }
};

const shouldPlayFeedback = (): boolean => {
  if (typeof window === "undefined") return false;
  const stored = parseStoredSettings(localStorage.getItem(SETTINGS_STORAGE_KEY));
  if (stored?.soundEffects === false) return false;
  if (stored?.reducedMotion === true) return false;
  return true;
};

const triggerHaptic = (pattern: number | number[]): void => {
  if (!shouldPlayFeedback()) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isIOS && isSafari;
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isStartedRef = useRef(false);
  const isIntentionalStop = useRef(false);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const sttSessionIdRef = useRef<number | null>(null);

  // Dedupe tracking
  const lastFinalCommitTime = useRef<number>(0);
  const lastFinalText = useRef<string>("");
  const interimCountRef = useRef<number>(0);
  const finalCountRef = useRef<number>(0);

  const { isRecording, setRecording, setError } = useSessionStore();
  const voiceEnabled = featureFlags.voiceEnabled;
  const assistantIsSpeaking = useAssistantSpeakingStore(state => state.isSpeaking);

  // Use ref to access current value in callbacks without dependency cycles
  const assistantIsSpeakingRef = useRef(assistantIsSpeaking);
  assistantIsSpeakingRef.current = assistantIsSpeaking;

  const isIOSSafariMode = useRef(false);

  useEffect(() => {
    if (!voiceEnabled) {
      setIsSupported(false);
      return;
    }
    const check = checkVoiceSupport();
    setIsSupported(check.supported);
    isIOSSafariMode.current = check.requiresFallback;

    audioDebug.log('mic_permission', { supported: check.supported, reason: check.reason });
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
      audioDebug.log('stt_interim', { ignored: true, reason: 'assistant_speaking', sessionId: sttSessionIdRef.current });
      return;
    }

    // 2. Gate: Reverb Buffer (AudioSession)
    if (isGated()) {
      audioDebug.log('stt_interim', { ignored: true, reason: 'reverb_gated', sessionId: sttSessionIdRef.current });
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
      interimCountRef.current += 1;
      audioDebug.log('stt_interim', {
        text: newInterimText,
        count: interimCountRef.current,
        sessionId: sttSessionIdRef.current,
      });
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
        audioDebug.log('stt_dedupe', {
          text: newFinalText,
          reason: 'duplicate_detected',
          windowMs: DEDUPE_WINDOW_MS,
          sessionId: sttSessionIdRef.current,
        });
      } else {
        lastFinalText.current = normalized;
        lastFinalCommitTime.current = now;
        finalCountRef.current += 1;

        // Add to global set with rough timestamp to prevent cross-hook dupes
        globalFinalHistory.add(normalized + "_" + Math.floor(now / 5000));
        setTimeout(() => globalFinalHistory.clear(), 10000); // Cleanup global history

        setFinalTranscript(prev => (prev + " " + newFinalText).trim());
        options.onTranscript?.(newFinalText.trim());
        audioDebug.log('stt_final', {
          text: newFinalText,
          count: finalCountRef.current,
          sessionId: sttSessionIdRef.current,
        });
        audioDebug.log('stt_dedupe', {
          text: newFinalText,
          reason: 'accepted',
          sessionId: sttSessionIdRef.current,
        });
      }
    }
  }, [options, setInterimTranscript, setFinalTranscript]);

  const handleRecognitionError = useCallback((event: SpeechRecognitionErrorEvent) => {
    if (event.error === 'aborted') return; // Normal stop

    audioDebug.error('recognizer_error', { error: event.error, sessionId: sttSessionIdRef.current });
    setError(`Voice error: ${event.error}`);
    toast.error("Voice recognition error", { description: event.error });

    // Hard stop on error
    setRecording(false);
    setIsPaused(false);
    isStartedRef.current = false;
    if (sttSessionIdRef.current) {
      endSTTSession(sttSessionIdRef.current, "recognizer_error");
      sttSessionIdRef.current = null;
    }
    options.onError?.(new Error(event.error));
  }, [options, setError, setRecording]);

  const startRecording = useCallback(() => {
    if (!voiceEnabled) {
      setError("Voice disabled");
      toast.error("Voice input disabled");
      return;
    }
    if (isStartedRef.current) return; // Idempotent
    if (assistantIsSpeakingRef.current) {
      toast.error("Wait for playback to finish");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Not supported");
      toast.error("Speech recognition not supported");
      return;
    }

    const sessionId = beginSTTSession("voice_input");
    if (!sessionId) {
      setError("Microphone already active");
      toast.error("Microphone already in use");
      return;
    }
    sttSessionIdRef.current = sessionId;
    interimCountRef.current = 0;
    finalCountRef.current = 0;
    audioDebug.log('session_start', { sessionId, source: 'user' });

    // Sound Effect: Start Recording (Subtle 'pop' or 'ding')
    // We use a simple oscillator here to avoid external assets, but in a real app this would be an audio file.
    try {
      if (shouldPlayFeedback()) {
        const AudioContext =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }
        triggerHaptic(12);
      }
    } catch (e) {
      // Ignore audio feedback errors
    }

    try {
      cleanup();

      // Reset buffers
      setFinalTranscript("");
      setInterimTranscript("");
      isIntentionalStop.current = false;
      lastFinalText.current = "";

      const recognition = new SpeechRecognition();
      recognition.continuous = !isIOSSafariMode.current;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        isStartedRef.current = true;
        setRecording(true);
        setIsPaused(false);
        audioDebug.log('recognizer_start', {
          mode: isIOSSafariMode.current ? 'safari_fallback' : 'continuous',
          sessionId,
        });
      };

      recognition.onresult = handleRecognitionResult;
      recognition.onerror = handleRecognitionError;

      recognition.onend = () => {
        audioDebug.log('session_end', { intentional: isIntentionalStop.current, sessionId });

        // Auto-restart if not intentional (and not paused)
        if (!isIntentionalStop.current && !isPaused && isStartedRef.current) {
          try {
            recognition.start();
          } catch (e) { /* ignore */ }
        } else {
          setRecording(false);
          isStartedRef.current = false;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (e) {
      audioDebug.error('session_start', { error: e, sessionId });
      setError("Failed to start");
      toast.error("Failed to start recording");
      if (sttSessionIdRef.current) {
        endSTTSession(sttSessionIdRef.current, "start_failed");
        sttSessionIdRef.current = null;
      }
    }
  }, [voiceEnabled, setError, cleanup, handleRecognitionResult, handleRecognitionError, setRecording]);

  const stopRecording = useCallback(() => {
    // Sound Effect: Stop Recording (Subtle 'dunk')
    try {
      if (shouldPlayFeedback()) {
        const AudioContext =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }
        triggerHaptic([8, 20, 8]);
      }
    } catch (e) {
      // Ignore
    }

    isIntentionalStop.current = true;
    cleanup();
    setRecording(false);
    setIsPaused(false);
    setInterimTranscript(""); // Clear residual interim
    if (sttSessionIdRef.current) {
      endSTTSession(sttSessionIdRef.current, "user_stop");
      sttSessionIdRef.current = null;
    }
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
      triggerHaptic(8);
      audioDebug.log('app_state_change', { state: 'paused' });
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      startRecording(); // Re-start recognizer
      triggerHaptic(8);
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

  useEffect(() => {
    return () => {
      if (sttSessionIdRef.current) {
        endSTTSession(sttSessionIdRef.current, "unmount");
        sttSessionIdRef.current = null;
      }
    };
  }, []);

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
