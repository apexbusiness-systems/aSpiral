import { useState, useCallback, useRef, useEffect } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useAssistantSpeakingStore } from "@/hooks/useAssistantSpeaking";
import { createLogger } from "@/lib/logger";
import { registerSTTController, updateListeningState, isGated } from "@/lib/audioSession";
import { addBreadcrumb } from "@/lib/debugOverlay";
import { featureFlags } from "@/lib/featureFlags";

const logger = createLogger("useVoiceInput");

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
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
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
  type: "stt.start" | "stt.stop" | "stt.partial" | "stt.final" | "stt.error" | "listener.attach" | "listener.detach";
  timestamp: number;
  data?: Record<string, unknown>;
};

const DEBUG_BUFFER_SIZE = 50;
const debugBuffer: VoiceDebugEvent[] = [];
const debugSubscribers: Set<(events: VoiceDebugEvent[]) => void> = new Set();

function emitDebugEvent(event: Omit<VoiceDebugEvent, "timestamp">) {
  const fullEvent: VoiceDebugEvent = { ...event, timestamp: Date.now() };
  const newDebugBuffer = [...debugBuffer.slice(-(DEBUG_BUFFER_SIZE - 1)), fullEvent];
  debugSubscribers.forEach((cb) => cb(newDebugBuffer));

  if (event.type === "stt.start" || event.type === "stt.stop" || event.type === "stt.error") {
    addBreadcrumb({
      type: "voice",
      message: event.type,
      data: event.data,
    });
  }

  logger.debug(`[${event.type}]`, event.data);
}

export function subscribeToVoiceDebug(callback: (events: VoiceDebugEvent[]) => void) {
  debugSubscribers.add(callback);
  callback(debugBuffer);
  return () => debugSubscribers.delete(callback);
}

export function getVoiceDebugBuffer() {
  return debugBuffer;
}

interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (error: Error) => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceState, setVoiceState] = useState<"Idle" | "Listening" | "Reconnecting" | "Error">("Idle");

  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const transcript = (finalTranscript + " " + interimTranscript).trim();

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isStartedRef = useRef(false);
  const lastInterimEmitRef = useRef(0);
  const INTERIM_UPDATE_INTERVAL = 150;

  // Watchdog and activity tracking
  const lastActivityAtRef = useRef(Date.now());
  const watchdogTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartRequestedRef = useRef(false);
  const restartCount60sRef = useRef(0);
  const lastRestartTimeRef = useRef(0);
  const WATCHDOG_INTERVAL_MS = 90000;
  const MAX_RESTARTS_60S = 3;
  const RESTART_BACKOFF_MS = 250;

  // Silence timeout
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SILENCE_TIMEOUT_MS = 30000;

  // Ref for stopRecording to avoid circular dependency
  const stopRecordingRef = useRef<() => void>(() => {});

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
  }, [voiceEnabled]);

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
    emitDebugEvent({ type: "listener.detach", data: { reason: "cleanup" } });
  }, []);

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
          emitDebugEvent({ type: "stt.error", data: { error: "stalled", restarts: restartCount60sRef.current } });
          setVoiceState("Error");
          stopRecordingRef.current();
          return;
        }
      } else {
        restartCount60sRef.current = 1;
      }

      lastRestartTimeRef.current = now;
      restartRequestedRef.current = true;
      setVoiceState("Reconnecting");
      emitDebugEvent({ type: "stt.stop", data: { reason: "watchdog_restart" } });
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    }, WATCHDOG_INTERVAL_MS);
  }, [clearWatchdog, stopRecordingRef]);

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
    const interim = interimTranscript.trim();
    if (!interim) return;
    setFinalTranscript((prev) => (prev + " " + interim).trim());
    options.onTranscript?.(interim);
    setInterimTranscript("");
    emitInterimUpdate("", true);
  }, [emitInterimUpdate, options, interimTranscript]);

  const handleRecognitionResult = useCallback(
    (event: SpeechRecognitionEvent) => {
      lastActivityAtRef.current = Date.now();
      startWatchdog();
      clearSilenceTimer();
      startSilenceTimer();

      if (assistantIsSpeakingRef.current || isGated()) {
        emitDebugEvent({
          type: "stt.partial",
          data: {
            ignored: true,
            reason: assistantIsSpeakingRef.current ? "assistant_speaking" : "reverb_gated",
          },
        });
        return;
      }

      let newFinalText = "";
      let newInterimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          newFinalText += text;
          emitDebugEvent({
            type: "stt.final",
            data: {
              text: text.substring(0, 50),
              length: text.length,
              resultIndex: i,
            },
          });
        } else {
          newInterimText += text;
          emitDebugEvent({
            type: "stt.partial",
            data: {
              text: text.substring(0, 30) + (text.length > 30 ? "..." : ""),
              length: text.length,
              resultIndex: i,
            },
          });
        }
      }

      if (newFinalText) {
        setFinalTranscript((prev) => (prev + " " + newFinalText).trim());
        options.onTranscript?.(newFinalText.trim());
      }

      setInterimTranscript(newInterimText);
      emitInterimUpdate(newInterimText);
    },
    [emitInterimUpdate, options, startWatchdog, clearSilenceTimer, startSilenceTimer]
  );

  const handleRecognitionError = useCallback(
    (event: SpeechRecognitionErrorEvent, context: string) => {
      if (event.error === "aborted") {
        logger.debug(`Recognition aborted (${context})`);
        return;
      }

      // Enterprise-grade error classification and recovery
      const errorType = classifySTTError(event.error);
      logger.error(`STT Error [${errorType}]: ${event.error} (${context})`);

      // Enhanced error handling with exponential backoff
      const restartableErrors = ["network", "aborted", "no-speech", "audio-capture"];
      if (restartableErrors.includes(event.error)) {
        restartCount60sRef.current++;
        const timeSinceLastRestart = Date.now() - lastRestartTimeRef.current;

        // Exponential backoff strategy
        let restartDelay = 100;
        if (restartCount60sRef.current > 1) {
          restartDelay = Math.min(1000, 100 * Math.pow(2, restartCount60sRef.current - 1));
        }

        if (restartCount60sRef.current < 5 && timeSinceLastRestart > 1000) {
          logger.warn(`Enterprise restart strategy for ${event.error} (${restartCount60sRef.current}/5, delay: ${restartDelay}ms)`);
          emitDebugEvent({
            type: "stt.error",
            data: {
              error: event.error,
              context,
              recoveryStrategy: "exponential_backoff",
              restartCount: restartCount60sRef.current,
              restartDelay,
            },
          });

          lastRestartTimeRef.current = Date.now();
          restartRequestedRef.current = true;
          setVoiceState("Reconnecting");

          setTimeout(() => {
            if (recognitionRef.current && isStartedRef.current) {
              try {
                recognitionRef.current.start();
                emitDebugEvent({ type: "stt.start", data: { recovery: true } });
              } catch (restartError) {
                logger.error("Enterprise restart failed", restartError as Error);
                emitDebugEvent({ type: "stt.error", data: { error: "restart_failed", originalError: event.error } });
              }
            }
          }, restartDelay);
          return;
        } else {
          logger.error(`Max retries reached (${restartCount60sRef.current}), entering error state`);
          emitDebugEvent({ type: "stt.error", data: { error: "max_retries", originalError: event.error } });
        }
      }

      // Fatal errors - clean up and notify
      const fatalError = new Error(`Voice recognition fatal error: ${event.error}`);
      logger.error(`Fatal STT error (${context})`, fatalError);
      emitDebugEvent({ type: "stt.error", data: { error: event.error, context, fatal: true } });
      setError(fatalError.message);
      setRecording(false);
      setIsPaused(false);
      isStartedRef.current = false;
      options.onError?.(fatalError);
    }, [options, setError, setRecording]
  );

  // Enterprise-grade error classification
  function classifySTTError(error: string): "network" | "permission" | "hardware" | "browser" | "unknown" {
    const networkErrors = ["network", "service-not-allowed"];
    const permissionErrors = ["not-allowed", "denied", "blocked"];
    const hardwareErrors = ["audio-capture", "no-speech", "aborted"];
    const browserErrors = ["language-not-supported", "invalid-grammar"];

    if (networkErrors.includes(error)) return "network";
    if (permissionErrors.includes(error)) return "permission";
    if (hardwareErrors.includes(error)) return "hardware";
    if (browserErrors.includes(error)) return "browser";
    return "unknown";
  }

  const createRecognition = useCallback(
    (options: {
      onStart?: () => void;
      onEnd?: () => void;
      onErrorContext: string;
    }) => {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) return null;

      const recognition = new SpeechRecognition();
      recognition.continuous = !isIOSSafariMode.current;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      // Enterprise-grade configuration for reliability
      if (!isIOSSafariMode.current) {
        recognition.maxAlternatives = 1; // Reduce alternatives for performance
      }

      recognition.onstart = () => {
        isStartedRef.current = true;
        setVoiceState("Listening");
        startWatchdog();
        startSilenceTimer();
        options.onStart?.();
      };

      recognition.onresult = handleRecognitionResult;
      recognition.onerror = (event) => {
        handleRecognitionError(event, options.onErrorContext);
      };

      recognition.onend = () => {
        clearWatchdog();
        clearSilenceTimer();

        if (restartRequestedRef.current && isStartedRef.current) {
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

        setVoiceState("Idle");
        options.onEnd?.();
      };

      return recognition;
    }, [handleRecognitionError, handleRecognitionResult]
  );

  const startRecording = useCallback(() => {
    if (!voiceEnabled) {
      setError("Voice input disabled");
      return;
    }

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
      cleanup();

      setFinalTranscript("");
      emitInterimUpdate("", true);

      const recognition = createRecognition({
        onStart: () => {
          setRecording(true);
          setIsPaused(false);
          emitDebugEvent({ type: "stt.start", data: { lang: "en-US" } });
        },
        onEnd: () => {
          emitDebugEvent({
            type: "stt.stop",
            data: { wasPaused: isPaused, iosSafari: isIOSSafariMode.current },
          });

          if (!isPaused) {
            commitInterimAsFinal();
            setRecording(false);
            isStartedRef.current = false;
          }
        },
        onErrorContext: "start",
      });

      if (!recognition) {
        const error = new Error("Speech recognition not supported");
        setError(error.message);
        options.onError?.(error);
        return;
      }

      recognitionRef.current = recognition;
      emitDebugEvent({ type: "listener.attach", data: { single: true } });

      recognition.start();
    } catch (error) {
      logger.error("Failed to start recording", error as Error);
      emitDebugEvent({ type: "stt.error", data: { error: (error as Error).message } });
      setError("Failed to start voice recording");
      isStartedRef.current = false;
      options.onError?.(error as Error);
    }
  }, [setRecording, setError, options, cleanup, isPaused, emitInterimUpdate, commitInterimAsFinal, voiceEnabled, createRecognition]);

  const stopRecording = useCallback(() => {
    setVoiceState("Idle");
    emitDebugEvent({ type: "stt.stop", data: { action: "user_stop" } });
    commitInterimAsFinal();
    cleanup();
    setRecording(false);
    setIsPaused(false);
    emitInterimUpdate("", true);
  }, [setRecording, cleanup, commitInterimAsFinal, emitInterimUpdate]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const pauseRecording = useCallback(() => {
    if (recognitionRef.current && isRecording && !isPaused) {
      recognitionRef.current.stop();
      setIsPaused(true);
      emitDebugEvent({ type: "stt.stop", data: { action: "pause" } });
      logger.info("Recording paused");
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      isStartedRef.current = false;

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = createRecognition({
          onStart: () => {
            emitDebugEvent({ type: "stt.start", data: { action: "resume" } });
          },
          onEnd: () => {
            if (!isPaused) {
              commitInterimAsFinal();
              setRecording(false);
              isStartedRef.current = false;
            }
          },
          onErrorContext: "resume",
        });

        if (!recognition) return;

        recognitionRef.current = recognition;
        emitDebugEvent({ type: "listener.attach", data: { action: "resume" } });

        recognition.start();
        logger.info("Recording resumed");
      }
    }
  }, [isPaused, setRecording, commitInterimAsFinal, createRecognition]);

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

  useEffect(() => {
    registerSTTController({
      stopListening: stopRecording,
      resumeListening: startRecording,
      isListening: () => isRecording && !isPaused,
    });
  }, [stopRecording, startRecording, isRecording, isPaused]);

  useEffect(() => {
    updateListeningState(isRecording && !isPaused);
  }, [isRecording, isPaused]);

  useEffect(() => {
    if (!voiceEnabled && isRecording) {
      stopRecording();
    }
  }, [voiceEnabled, isRecording, stopRecording]);

  useEffect(() => {
    return () => {
      cleanup();
    };
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
  maxAlternatives?: number;
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