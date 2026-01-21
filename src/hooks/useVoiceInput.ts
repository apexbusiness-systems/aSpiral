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
import {
  registerSTTController,
  updateListeningState,
  isGated,
} from "@/lib/audioSession";
import { featureFlags } from "@/lib/featureFlags";
import { toast } from "sonner";
import { audioDebug } from "@/lib/audioLogger";
import { i18n } from "@/lib/i18n";
import { getSpeechLocale } from "@/lib/i18n/speechLocale";
import { addBreadcrumb } from "@/lib/debugOverlay";

const logger = createLogger("useVoiceInput");
const VOICE_STOP_KEYWORDS = ["stop", "pause", "end session", "shut up", "hold on"];
const DEDUPE_WINDOW_MS = 2000; // Time window to ignore duplicate final commits
const SETTINGS_STORAGE_KEY = "aspiral_settings_v1";
const INTERIM_UPDATE_INTERVAL = 100;

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
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isIOS && isSafari;
}

function checkVoiceSupport(): {
  supported: boolean;
  requiresFallback: boolean;
  reason?: string;
} {
  if (typeof window === "undefined") {
    return { supported: false, requiresFallback: false, reason: "no_window" };
  }
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return { supported: false, requiresFallback: false, reason: "no_speech_api" };
  }
  if (isIOSSafari()) {
    return {
      supported: true,
      requiresFallback: true,
      reason: "ios_safari_continuous_unreliable",
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

  // Diagnostics snapshot at every transition
  if (event.type.startsWith('stt.')) {
    // Note: Hook-scoped variables not available in global function scope
    console.log(`[VOICE_SNAPSHOT] ${JSON.stringify({
      voiceState: fullEvent.type,
      isGated: isGated(),
      // Hook variables would need to be passed to this global function if needed
      audioContextState: 'unknown',
      ttsBackend: 'unknown'
    })}`);
  }
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
  silenceTimeoutMs?: number;
  watchdogIntervalMs?: number;
}

// Global Set of known final transcripts to prevent cross-component duplication if multiple hooks mounted
const globalFinalHistory = new Set<string>();

function getActiveSpeechLocale(): string {
  const lng = i18n.resolvedLanguage ?? i18n.language ?? "en";
  return getSpeechLocale(lng);
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const silenceTimeoutMs = Math.max(800, Math.min(10000, options.silenceTimeoutMs ?? 5000));
  const watchdogIntervalMs = Math.max(15000, Math.min(60000, options.watchdogIntervalMs ?? 25000));

  const [isSupported, setIsSupported] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceState, setVoiceState] = useState<'Idle' | 'Listening' | 'Reconnecting' | 'Error'>('Idle');

  // Two-buffer transcript model: final (append-only) + interim (replace on each update)
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  // Combined display transcript
  const transcript = (finalTranscript + " " + interimTranscript).trim();

  // Refs
  const recognitionRef = useRef<any>(null);
  const isStartedRef = useRef(false);
  const isIntentionalStop = useRef(false);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimer = useRef<NodeJS.Timeout | null>(null);

  // Dedupe tracking
  const lastFinalCommitTime = useRef<number>(0);
  const lastFinalText = useRef<string>("");
  const interimCountRef = useRef<number>(0);
  const finalCountRef = useRef<number>(0);

  // Watchdog and activity tracking
  const lastActivityAtRef = useRef(Date.now());
  const watchdogTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartRequestedRef = useRef(false);
  const restartCount60sRef = useRef(0);
  const lastRestartTimeRef = useRef(0);
  const WATCHDOG_INTERVAL_MS = 90000; // 90s to catch 60-120s stalls
  const MAX_RESTARTS_60S = 3;
  const RESTART_BACKOFF_MS = 250;

  // Silence timeout
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SILENCE_TIMEOUT_MS = 30000; // 30s

  // Ref for stopRecording to avoid circular dependency
  const stopRecordingRef = useRef<() => void>(() => { });

  // Interim update throttling
  const lastInterimEmitRef = useRef<number>(0);
  const interimTranscriptRef = useRef<string>("");

  const { isRecording, setRecording, setError } = useSessionStore();
  const voiceEnabled = featureFlags.voiceEnabled;
  const assistantIsSpeaking = useAssistantSpeakingStore((state) => state.isSpeaking);

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

    audioDebug.log("mic_permission", { supported: check.supported, reason: check.reason });
  }, [voiceEnabled]);

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        audioDebug.log("recognizer_stop", { reason: "cleanup" });
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    isStartedRef.current = false;
    interimTranscriptRef.current = "";
    clearWatchdog();
    clearSilenceTimer();
    emitDebugEvent({ type: 'listener.detach', data: { reason: 'cleanup' } });
  }, []);

  // Watchdog functions
  const clearWatchdog = useCallback(() => {
    if (watchdogTimeoutRef.current) {
      clearTimeout(watchdogTimeoutRef.current);
      watchdogTimeoutRef.current = null;
    }
  }, []);

  const startWatchdog = useCallback(() => {
    clearWatchdog();
    watchdogTimeoutRef.current = setTimeout(() => {
      if (!isStartedRef.current) return;

      const now = Date.now();
      const timeSinceLastRestart = now - lastRestartTimeRef.current;
      if (timeSinceLastRestart < 60000) {
        restartCount60sRef.current++;
        if (restartCount60sRef.current >= MAX_RESTARTS_60S) {
          logger.error("STT watchdog: too many restarts in 60s, entering error state");
          emitDebugEvent({ type: 'stt.error', data: { error: 'stalled', restarts: restartCount60sRef.current } });
          toast.error("Mic stalled—tap to restart");
          setVoiceState('Error');
          stopRecordingRef.current();
          return;
        }
      } else {
        restartCount60sRef.current = 1;
      }

      lastRestartTimeRef.current = now;
      restartRequestedRef.current = true;
      setVoiceState('Reconnecting');
      emitDebugEvent({ type: 'stt.stop', data: { reason: 'watchdog_restart' } });
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    }, WATCHDOG_INTERVAL_MS);
  }, [clearWatchdog, stopRecordingRef]);

  // Silence timeout functions
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimeoutRef.current = setTimeout(() => {
      if (isStartedRef.current && recognitionRef.current) {
        logger.info("Silence timeout reached, stopping recognition");
        recognitionRef.current.stop();
      }
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimer]);

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

  const stopRecording = useCallback(() => {
    setVoiceState('Idle');
    emitDebugEvent({ type: 'stt.stop', data: { action: 'user_stop' } });
    commitInterimAsFinal();
    cleanup();
    setRecording(false);
    setIsPaused(false);
    emitInterimUpdate("", true); // Clear interim on stop
  }, [setRecording, cleanup, commitInterimAsFinal, emitInterimUpdate]);

  // Update stopRecordingRef
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const handleRecognitionResult = useCallback(
    (event: any) => {
      // Update activity timestamp and reset timers on ANY recognition activity
      lastActivityAtRef.current = Date.now();
      startWatchdog();
      clearSilenceTimer();
      startSilenceTimer();

      // 1. Gate: Assistant Speaking
      if (assistantIsSpeakingRef.current) {
        emitDebugEvent({
          type: 'stt.partial',
          data: {
            ignored: true,
            reason: "assistant_speaking",
          }
        });
        return;
      }

      // 2. Gate: Reverb Buffer (AudioSession)
      if (isGated()) {
        emitDebugEvent({
          type: 'stt.partial',
          data: {
            ignored: true,
            reason: "reverb_gated",
          }
        });
        return;
      }

      let newFinalText = "";
      let newInterimText = "";

      // Process results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (VOICE_STOP_KEYWORDS.some((k) => text.toLowerCase().includes(k))) {
          stopRecording();
          return;
        }

        if (result.isFinal) {
          newFinalText += text;
        } else {
          newInterimText += text;
        }
      }

      // Always replace interim (this is the key fix for "rapping")
      interimTranscriptRef.current = newInterimText;
      emitInterimUpdate(newInterimText);

      // Smart Silence Detection (Reset timer if final text received)
      if (newFinalText) {
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        silenceTimer.current = setTimeout(() => {
          logger.info(`Silence detected after ${silenceTimeoutMs}ms. Stopping.`);
          stopRecording();
        }, silenceTimeoutMs);

        // Commit Final with Deduplication
        const normalized = newFinalText.trim().toLowerCase();
        const now = Date.now();

        const isDuplicate =
          (normalized === lastFinalText.current &&
            now - lastFinalCommitTime.current < DEDUPE_WINDOW_MS) ||
          globalFinalHistory.has(normalized + "_" + Math.floor(now / 5000));

        if (isDuplicate) {
          audioDebug.log("stt_dedupe", {
            text: newFinalText,
            reason: "duplicate_detected",
            windowMs: DEDUPE_WINDOW_MS,
          });
        } else {
          lastFinalText.current = normalized;
          lastFinalCommitTime.current = now;
          finalCountRef.current += 1;

          globalFinalHistory.add(normalized + "_" + Math.floor(now / 5000));
          setTimeout(() => globalFinalHistory.clear(), 10000);

          setFinalTranscript((prev) => (prev + " " + newFinalText).trim());
          options.onTranscript?.(newFinalText.trim());
          audioDebug.log("stt_final", {
            text: newFinalText,
            count: finalCountRef.current,
          });
        }
      }
    },
    [assistantIsSpeakingRef, emitInterimUpdate, silenceTimeoutMs, options, stopRecording, startWatchdog, clearSilenceTimer, startSilenceTimer]
  );

  const handleRecognitionError = useCallback(
    (event: any) => {
      // AGGRESSIVE RESTART: For network, aborted, or no-speech errors, restart immediately
      const error = event.error;
      const context = "handler";

      const restartableErrors = ['network', 'aborted', 'no-speech'];

      if (restartableErrors.includes(error)) {
        restartCount60sRef.current++;
        if (restartCount60sRef.current < 5) {
          logger.warn(`Aggressive restart for ${error} (${restartCount60sRef.current}/5)`);
          emitDebugEvent({
            type: 'stt.error', data: {
              error,
              context,
              aggressiveRestart: true,
              restartCount: restartCount60sRef.current
            }
          });

          // DON'T set isRecording to false - keep UI alive
          setTimeout(() => {
            if (recognitionRef.current && isStartedRef.current) {
              try {
                recognitionRef.current.start();
              } catch (restartError) {
                logger.error("Failed to restart recognition", restartError as Error);
              }
            }
          }, 100);
          return;
        } else {
          logger.error(`Too many restarts (${restartCount60sRef.current}), giving up`);
        }
      }

      logger.error(`Recognition error`, new Error(error));
      emitDebugEvent({ type: 'stt.error', data: { error, context } });
      setError(`Voice recognition error: ${error}`);
      setRecording(false);
      setIsPaused(false);
      isStartedRef.current = false;
      options.onError?.(new Error(error));
    },
    [options, setError, setRecording]
  );

  const createRecognition = useCallback((opts: {
    onStart?: () => void;
    onEnd?: () => void;
    onErrorContext: string;
  }) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = !isIOSSafariMode.current;
    recognition.interimResults = true;
    recognition.lang = getActiveSpeechLocale();

    recognition.onstart = () => {
      isStartedRef.current = true;
      setVoiceState('Listening');
      startWatchdog();
      startSilenceTimer();
      opts.onStart?.();
    };

    recognition.onresult = handleRecognitionResult;
    recognition.onerror = handleRecognitionError;

    recognition.onend = () => {
      clearWatchdog();
      clearSilenceTimer();

      if (restartRequestedRef.current && isStartedRef.current) {
        // Watchdog triggered restart
        restartRequestedRef.current = false;
        setTimeout(() => {
          if (recognitionRef.current && isStartedRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              logger.warn("Failed to restart recognition after watchdog", e);
            }
          }
        }, RESTART_BACKOFF_MS);
        return;
      }
      setVoiceState('Idle');
      opts.onEnd?.();
    };

    return recognition;
  }, [handleRecognitionResult, handleRecognitionError, startWatchdog, startSilenceTimer, clearWatchdog, clearSilenceTimer, watchdogIntervalMs]);

  const startRecording = useCallback(async () => {
    if (!voiceEnabled) {
      setError("Voice disabled");
      toast.error("Voice input disabled");
      return;
    }
    if (isStartedRef.current) return;
    if (assistantIsSpeakingRef.current) {
      toast.error("Wait for playback to finish");
      return;
    }

    // Check microphone permission before starting
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permissionStatus.state === 'denied') {
          setError("Microphone permission denied");
          toast.error("Microphone access denied. Please enable in browser settings.");
          return;
        }
      }
    } catch (permError) {
      logger.debug("Permission API not available", permError as Error);
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Not supported");
      toast.error("Speech recognition not supported");
      return;
    }

    interimCountRef.current = 0;
    finalCountRef.current = 0;
    audioDebug.log("session_start", { source: "user" });

    // Start feedback
    try {
      if (shouldPlayFeedback()) {
        const AudioContext =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
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
    } catch {
      // ignore
    }

    try {
      cleanup();
      setFinalTranscript("");
      setInterimTranscript("");
      isIntentionalStop.current = false;
      lastFinalText.current = "";

      const recognition = createRecognition({
        onStart: () => {
          setRecording(true);
          setIsPaused(false);
          audioDebug.log("recognizer_start", {
            mode: isIOSSafariMode.current ? "safari_fallback" : "continuous",
            lang: recognition ? recognition.lang : 'unknown',
          });
        },
        onEnd: () => {
          audioDebug.log("session_end", { intentional: isIntentionalStop.current });
          if (!isIntentionalStop.current && !isPaused && isStartedRef.current) {
            try {
              // Refresh language on restart
              if (recognition) {
                recognition.lang = getActiveSpeechLocale();
                recognition.start();
              }
            } catch {
              // ignore
            }
          } else {
            setRecording(false);
            isStartedRef.current = false;
            // Ensure watchdog is stopped
            clearWatchdog();
          }
        },
        onErrorContext: 'start'
      });

      if (recognition) {
        recognitionRef.current = recognition;
        recognition.start();
      }

    } catch (e) {
      audioDebug.error("session_start", { error: (e as Error).message });
      setError("Failed to start");
      toast.error("Failed to start recording");
    }
  }, [
    voiceEnabled,
    setError,
    cleanup,
    createRecognition,
    setRecording,
    isPaused,
    clearWatchdog,
  ]);

  const pauseRecording = useCallback(() => {
    if (isRecording && !isPaused) {
      isIntentionalStop.current = true;
      recognitionRef.current?.stop();
      setIsPaused(true);
      triggerHaptic(8);
      audioDebug.log("app_state_change", { state: "paused" });
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      isStartedRef.current = false; // Allow restart

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
  }, [isPaused, setRecording, commitInterimAsFinal, createRecognition]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
      triggerHaptic(8);
      audioDebug.log("app_state_change", { state: "resumed" });
    }
  }, [isRecording, isPaused, startRecording, stopRecording]);

  const togglePause = useCallback(() => {
    isPaused ? resumeRecording() : pauseRecording();
  }, [isPaused, resumeRecording, pauseRecording]);

  // Register with AudioSession for TTS coordination
  useEffect(() => {
    registerSTTController({
      stopListening: stopRecording,
      resumeListening: startRecording,
      isListening: () => isRecording && !isPaused,
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
    voiceState,
    transcript,
    finalTranscript,
    interimTranscript,
    startRecording,
    stopRecording,
    toggleRecording,
    pauseRecording,
    resumeRecording,
    togglePause,
  };
}
