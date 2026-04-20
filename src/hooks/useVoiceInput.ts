/**
 * useVoiceInput — Enterprise-Grade STT Hook
 *
 * Architecture:
 *  - Single AudioSessionController: exactly one active STT session at a time
 *  - Two-buffer model: separate interim / final transcript buffers
 *  - Deduplication: normalized text + 2s timestamp window + global 5s bucket
 *  - Dual silence timers:
 *      postUtteranceSilenceTimer — fires silenceTimeoutMs after a final result
 *      inactivityTimer           — fires SILENCE_INACTIVITY_MS after any recognition event
 *  - Watchdog (watchdogIntervalMs): detects fully stalled recognition, max 3 restarts/60s
 *  - Error restart: always recreates SpeechRecognition instance (never .start() on errored instance)
 *  - Exponential backoff on error restarts: 250ms, 500ms, 1s, 2s, 4s cap
 *  - iOS Safari: continuous=false mode
 *  - Barge-in gate: reverb buffer prevents echo feedback after TTS
 *
 * Ref ordering contract (all refs declared before any render-time assignment):
 *   isPausedRef          — mirror of isPaused state, prevents stale closure in callbacks
 *   createRecognitionRef — set during render after createRecognition is defined; breaks circular dep
 *   stopRecordingRef     — set during render after stopRecording is defined; breaks watchdog dep cycle
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useAssistantSpeakingStore } from "@/hooks/useAssistantSpeaking";
import { createLogger } from "@/lib/logger";
import {
  registerSTTController,
  updateListeningState,
  isGated,
  beginSTTSession,
  endSTTSession,
} from "@/lib/audioSession";
import { featureFlags } from "@/lib/featureFlags";
import { toast } from "sonner";
import { audioDebug } from "@/lib/audioLogger";
import { i18n } from "@/lib/i18n";
import { getSpeechLocale } from "@/lib/i18n/speechLocale";
import { addBreadcrumb } from "@/lib/debugOverlay";

// ─── Constants ────────────────────────────────────────────────────────────────

const logger = createLogger("useVoiceInput");

const VOICE_STOP_KEYWORDS = ["stop", "pause", "end session", "shut up", "hold on"];
const DEDUPE_WINDOW_MS = 2_000;
const SETTINGS_STORAGE_KEY = "aspiral_settings_v1";
const INTERIM_UPDATE_INTERVAL_MS = 100;
/** Total inactivity guard — restart if no audio events for this long */
const SILENCE_INACTIVITY_MS = 120_000; // 2 minutes — was 30s, too aggressive for natural pauses
/** Default watchdog polling interval */
const WATCHDOG_DEFAULT_MS = 120_000; // 2 minutes
/** Max restarts within a 60s window before entering Error state */
const MAX_RESTARTS_60S = 6; // was 3, too strict — allow more recovery attempts
/** Base delay for exponential backoff on error restarts */
const RESTART_BACKOFF_BASE_MS = 250;

// ─── Types ────────────────────────────────────────────────────────────────────

type StoredSettings = { soundEffects?: boolean; reducedMotion?: boolean };

type VoiceDebugEvent = {
  type:
    | "stt.start"
    | "stt.stop"
    | "stt.partial"
    | "stt.final"
    | "stt.error"
    | "listener.attach"
    | "listener.detach";
  timestamp: number;
  data?: Record<string, unknown>;
};

interface SpeechRecognitionErrorEvent extends Event { error: string; message?: string }
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative { transcript: string; confidence: number }

export type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
type AudioContextConstructor = new () => AudioContext;

type GlobalVoiceApis = typeof globalThis & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
};

type CreateRecognitionOpts = {
  onStart?: () => void;
  onEnd?: () => void;
  onErrorContext: string;
};

export interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (error: Error) => void;
  /** Post-utterance silence before auto-stop. Clamped 800–10 000 ms. Default 5 000. */
  silenceTimeoutMs?: number;
  /** Watchdog polling interval. Clamped 15 000–120 000 ms. Default 90 000. */
  watchdogIntervalMs?: number;
}

// ─── Module-level debug state ─────────────────────────────────────────────────

const DEBUG_BUFFER_SIZE = 50;
let debugBuffer: VoiceDebugEvent[] = [];
const debugSubscribers = new Set<(events: VoiceDebugEvent[]) => void>();

function emitDebugEvent(event: Omit<VoiceDebugEvent, "timestamp">) {
  const full: VoiceDebugEvent = { ...event, timestamp: Date.now() };
  debugBuffer = [...debugBuffer.slice(-(DEBUG_BUFFER_SIZE - 1)), full];
  debugSubscribers.forEach((cb) => cb(debugBuffer));
  if (event.type === "stt.start" || event.type === "stt.stop" || event.type === "stt.error") {
    const analyticsMap: Record<string, import('@/lib/analytics').FeatureType | string> = {
      "stt.start": "voice_input",
      "stt.stop": "voice_input_stop",
      "stt.error": "voice_input_error"
    };
    addBreadcrumb({ type: "voice", message: analyticsMap[event.type] || event.type, data: event.data });
  }
  logger.debug(`[${event.type}]`, event.data);
}

export function subscribeToVoiceDebug(cb: (events: VoiceDebugEvent[]) => void) {
  debugSubscribers.add(cb);
  cb(debugBuffer);
  return () => debugSubscribers.delete(cb);
}
export const getVoiceDebugBuffer = () => debugBuffer;
export function clearVoiceDebugBuffer() {
  debugBuffer = [];
  debugSubscribers.forEach((cb) => cb(debugBuffer));
}

/** Global dedup bucket: prevents cross-component echo if multiple hooks are mounted */
const globalFinalHistory = new Set<string>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  const g = globalThis as GlobalVoiceApis;
  return g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null;
}

function getAudioContextCtor(): AudioContextConstructor | null {
  const g = globalThis as GlobalVoiceApis;
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

function getActiveSpeechLocale(): string {
  return getSpeechLocale(i18n.resolvedLanguage ?? i18n.language ?? "en");
}

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isIOS && /^((?!chrome|android).)*safari/i.test(ua);
}

function checkVoiceSupport(): { supported: boolean; requiresFallback: boolean; reason?: string } {
  if (typeof globalThis === "undefined")
    return { supported: false, requiresFallback: false, reason: "no_window" };
  if (!getSpeechRecognitionCtor())
    return { supported: false, requiresFallback: false, reason: "no_speech_api" };
  if (isIOSSafari())
    return { supported: true, requiresFallback: true, reason: "ios_safari_continuous_unreliable" };
  return { supported: true, requiresFallback: false };
}

function parseStoredSettings(value: string | null): StoredSettings | null {
  if (!value) return null;
  try {
    const p: unknown = JSON.parse(value);
    return p && typeof p === "object" ? (p as StoredSettings) : null;
  } catch { return null; }
}

function shouldPlayFeedback(): boolean {
  if (typeof globalThis === "undefined") return false;
  const s = parseStoredSettings(localStorage.getItem(SETTINGS_STORAGE_KEY));
  return !(s?.soundEffects === false || s?.reducedMotion === true);
}

function triggerHaptic(pattern: number | number[]): void {
  if (!shouldPlayFeedback()) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

function playTone(startHz: number, endHz: number): void {
  try {
    if (!shouldPlayFeedback()) return;
    const AudioCtx = getAudioContextCtor();
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(startHz, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endHz, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch { /* non-fatal */ }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const dynamicSilenceMs = getAdaptiveEndpointMs();
  const watchdogIntervalMs = Math.max(15_000, Math.min(180_000, options.watchdogIntervalMs ?? WATCHDOG_DEFAULT_MS));

  // ── State ──────────────────────────────────────────────────────────────────
  const [isSupported, setIsSupported] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceState, setVoiceState] = useState<"Idle" | "Listening" | "Reconnecting" | "Error">("Idle");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const transcript = (finalTranscript + " " + interimTranscript).trim();

  // ── Refs — ALL declared before any render-time use ─────────────────────────
  //
  // optionsRef: always contains the latest provided options to avoid stale closures.
  const optionsRef = useRef(options);

  // isPausedRef: mirror of isPaused state. Set during render (after declaration).
  // Prevents stale-closure bugs in onEnd / resumeRecording callbacks.
  const isPausedRef = useRef(false);

  // createRecognitionRef: late-bound after createRecognition is defined below.
  // handleRecognitionError uses this to break the forward-reference circular dep.
  const createRecognitionRef = useRef<((opts: CreateRecognitionOpts) => SpeechRecognitionInstance | null) | null>(null);

  // stopRecordingRef: late-bound after stopRecording is defined below.
  // Allows watchdog timeout callback to call stopRecording without a dep cycle.
  const stopRecordingRef = useRef<() => void>(() => {});

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isStartedRef = useRef(false);
  const isIntentionalStop = useRef(false);
  const isIOSSafariMode = useRef(false);
  const sttSessionIdRef = useRef<number | null>(null);

  // Dedupe tracking
  const lastFinalCommitTime = useRef(0);
  const lastFinalText = useRef("");
  const finalCountRef = useRef(0);

  // Watchdog / restart rate-limiting
  const restartRequestedRef = useRef(false);
  const restartCount60sRef = useRef(0);
  const lastRestartTimeRef = useRef(0);

  // Timers — three separate concerns, three separate refs
  const postUtteranceSilenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Interim throttle
  const lastInterimEmitRef = useRef(0);
  const interimTranscriptRef = useRef("");

  // ── Render-time ref sync ───────────────────────────────────────────────────
  // Both refs are declared above — no TDZ risk.
  optionsRef.current = options;
  isPausedRef.current = isPaused;

  // ── External state ─────────────────────────────────────────────────────────
  const { isRecording, setRecording, setError } = useSessionStore();
  const voiceEnabled = featureFlags.voiceEnabled;
  const assistantIsSpeaking = useAssistantSpeakingStore((s) => s.isSpeaking);
  const assistantIsSpeakingRef = useRef(assistantIsSpeaking);
  assistantIsSpeakingRef.current = assistantIsSpeaking;

  // ── Voice support detection ────────────────────────────────────────────────
  useEffect(() => {
    if (!voiceEnabled) { setIsSupported(false); return; }
    const check = checkVoiceSupport();
    setIsSupported(check.supported);
    isIOSSafariMode.current = check.requiresFallback;
    audioDebug.log("mic_permission", { supported: check.supported, reason: check.reason });
  }, [voiceEnabled]);

  // ── Timer helpers ──────────────────────────────────────────────────────────

  const clearWatchdog = useCallback(() => {
    if (watchdogTimer.current) { clearTimeout(watchdogTimer.current); watchdogTimer.current = null; }
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) { clearTimeout(inactivityTimer.current); inactivityTimer.current = null; }
  }, []);

  const clearPostUtteranceSilenceTimer = useCallback(() => {
    if (postUtteranceSilenceTimer.current) { clearTimeout(postUtteranceSilenceTimer.current); postUtteranceSilenceTimer.current = null; }
  }, []);

  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimer.current = setTimeout(() => {
      if (isStartedRef.current && recognitionRef.current) {
        logger.info("Inactivity timeout — stopping recognition");
        recognitionRef.current.stop();
      }
    }, SILENCE_INACTIVITY_MS);
  }, [clearInactivityTimer]);

  const startWatchdog = useCallback(() => {
    clearWatchdog();
    watchdogTimer.current = setTimeout(() => {
      if (!isStartedRef.current) return;
      const now = Date.now();
      if (now - lastRestartTimeRef.current < 60_000) {
        restartCount60sRef.current++;
        if (restartCount60sRef.current >= MAX_RESTARTS_60S) {
          // Instead of permanent Error state, do a clean restart after a cooldown
          logger.warn("STT watchdog: max restarts in 60s — cooling down 5s then retrying");
          emitDebugEvent({ type: "stt.error", data: { error: "stalled_cooldown", restarts: restartCount60sRef.current } });
          setVoiceState("Reconnecting");
          // Cool down for 5 seconds, then reset counter and try again
          setTimeout(() => {
            restartCount60sRef.current = 0;
            lastRestartTimeRef.current = Date.now();
            restartRequestedRef.current = true;
            try { recognitionRef.current?.stop(); } catch { /* ignore */ }
          }, 5_000);
          return;
        }
      } else {
        restartCount60sRef.current = 1; // New 60s window
      }
      lastRestartTimeRef.current = now;
      restartRequestedRef.current = true;
      setVoiceState("Reconnecting");
      emitDebugEvent({ type: "stt.stop", data: { reason: "watchdog_restart" } });
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    }, watchdogIntervalMs);
  }, [clearWatchdog, watchdogIntervalMs]);

  // ── Cleanup ────────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    isStartedRef.current = false;
    interimTranscriptRef.current = "";
    clearWatchdog();
    clearInactivityTimer();
    clearPostUtteranceSilenceTimer();
    emitDebugEvent({ type: "listener.detach", data: { reason: "cleanup" } });
  }, [clearWatchdog, clearInactivityTimer, clearPostUtteranceSilenceTimer]);

  // ── STT session management ─────────────────────────────────────────────────

  const releaseSttSession = useCallback((reason: string) => {
    if (sttSessionIdRef.current !== null) {
      endSTTSession(sttSessionIdRef.current, reason);
      sttSessionIdRef.current = null;
    }
  }, []);

  // ── Interim transcript ─────────────────────────────────────────────────────

  const emitInterimUpdate = useCallback((text: string, force = false) => {
    const now = Date.now();
    if (!force && now - lastInterimEmitRef.current < INTERIM_UPDATE_INTERVAL_MS) return;
    lastInterimEmitRef.current = now;
    setInterimTranscript(text);
  }, []);

  const commitInterimAsFinal = useCallback(() => {
    const interim = interimTranscriptRef.current.trim();
    if (!interim) return;

    // Deduplication: prevent re-sending text already committed as final
    const normalized = interim.toLowerCase();
    const now = Date.now();
    if (normalized === lastFinalText.current && now - lastFinalCommitTime.current < DEDUPE_WINDOW_MS) {
      audioDebug.log("stt_dedupe", { text: interim, reason: "commit_interim_duplicate" });
      interimTranscriptRef.current = "";
      emitInterimUpdate("", true);
      return;
    }

    lastFinalText.current = normalized;
    lastFinalCommitTime.current = now;

    setFinalTranscript((prev) => (prev + " " + interim).trim());
    optionsRef.current.onTranscript?.(interim);
    interimTranscriptRef.current = "";
    emitInterimUpdate("", true);
  }, [emitInterimUpdate]);

  // ── Stop recording ─────────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    releaseSttSession("user_stop");
    setVoiceState("Idle");
    emitDebugEvent({ type: "stt.stop", data: { action: "user_stop" } });
    commitInterimAsFinal();
    cleanup();
    setRecording(false);
    setIsPaused(false);
    emitInterimUpdate("", true);
    playTone(440, 220); // descending = stop
  }, [setRecording, cleanup, commitInterimAsFinal, emitInterimUpdate, releaseSttSession]);

  // ── Recognition result handler ─────────────────────────────────────────────

  const handleRecognitionResult = useCallback(
    (event: Event) => {
      const e = event as SpeechRecognitionEvent;

      // Reset all activity timers on any audio event
      startWatchdog();
      clearInactivityTimer();
      startInactivityTimer();

      // Gate 1: assistant speaking — discard to prevent echo
      if (assistantIsSpeakingRef.current) {
        emitDebugEvent({ type: "stt.partial", data: { ignored: true, reason: "assistant_speaking" } });
        return;
      }

      // Gate 2: reverb buffer active after TTS ends
      if (isGated()) {
        emitDebugEvent({ type: "stt.partial", data: { ignored: true, reason: "reverb_gated" } });
        return;
      }

      let newFinalText = "";
      let newInterimText = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0].transcript;

        // ⚡ Bolt Optimization: Cache lowercase text outside the loop to avoid redundant string transformations
        const textLower = text.toLowerCase();

        if (VOICE_STOP_KEYWORDS.some((k) => textLower.includes(k))) {
          stopRecording();
          return;
        }

        if (result.isFinal) newFinalText += text;
        else newInterimText += text;
      }

      // Replace (not append) interim — key fix for "Rap God" duplication
      interimTranscriptRef.current = newInterimText;
      emitInterimUpdate(newInterimText);

      if (newFinalText) {
        // Reset post-utterance silence countdown on every final result
        clearPostUtteranceSilenceTimer();
        postUtteranceSilenceTimer.current = setTimeout(() => {
          logger.info(`Post-utterance silence after ${silenceTimeoutMs}ms — stopping`);
          stopRecording();
        }, dynamicSilenceMs);

        // Deduplicate: normalized text + 2s window + global 5s bucket
        const normalized = newFinalText.trim().toLowerCase();
        const now = Date.now();
        const bucketKey = normalized + "_" + Math.floor(now / 5_000);

        const isDuplicate =
          (normalized === lastFinalText.current && now - lastFinalCommitTime.current < DEDUPE_WINDOW_MS) ||
          globalFinalHistory.has(bucketKey);

        if (isDuplicate) {
          audioDebug.log("stt_dedupe", { text: newFinalText, reason: "duplicate_detected" });
          return;
        }

        lastFinalText.current = normalized;
        lastFinalCommitTime.current = now;
        finalCountRef.current++;

        globalFinalHistory.add(bucketKey);
        setTimeout(() => globalFinalHistory.delete(bucketKey), 10_000);

        setFinalTranscript((prev) => (prev + " " + newFinalText).trim());
        optionsRef.current.onTranscript?.(newFinalText.trim());
        emitDebugEvent({ type: "stt.final", data: { text: newFinalText, count: finalCountRef.current } });
        audioDebug.log("stt_final", { text: newFinalText, count: finalCountRef.current });
      }
    },
    [
      assistantIsSpeakingRef,
      emitInterimUpdate,
      dynamicSilenceMs,
      stopRecording,
      startWatchdog,
      clearInactivityTimer,
      startInactivityTimer,
      clearPostUtteranceSilenceTimer,
    ]
  );

  // ── Error handler ──────────────────────────────────────────────────────────

  const handleRecognitionError = useCallback(
    (event: Event) => {
      const { error } = event as SpeechRecognitionErrorEvent;
      const restartable = ["network", "aborted", "no-speech", "audio-capture"];

      if (restartable.includes(error)) {
        restartCount60sRef.current++;
        if (restartCount60sRef.current < 8) {
          logger.warn(`Recoverable STT error '${error}' (attempt ${restartCount60sRef.current}/8)`);
          emitDebugEvent({ type: "stt.error", data: { error, aggressiveRestart: true, attempt: restartCount60sRef.current } });

          // ALWAYS recreate — an errored SpeechRecognition throws InvalidStateError on .start()
          const backoffMs = Math.min(RESTART_BACKOFF_BASE_MS * Math.pow(2, restartCount60sRef.current - 1), 4_000);
          setTimeout(() => {
            if (!isStartedRef.current) return;
            const newR = createRecognitionRef.current?.({ onErrorContext: "error_restart" });
            if (newR) {
              recognitionRef.current = newR;
              try { newR.start(); } catch (e) { logger.error("Failed to start recreated recognition", e as Error); }
            }
          }, backoffMs);
          return;
        }
        logger.error(`STT '${error}': retry limit exceeded (${restartCount60sRef.current})`);
      }

      // Fatal / unrecoverable error
      logger.error("Recognition error", new Error(error));
      emitDebugEvent({ type: "stt.error", data: { error, fatal: true } });
      setError(`Voice recognition error: ${error}`);
      releaseSttSession(`error_${error}`);
      setRecording(false);
      setIsPaused(false);
      isStartedRef.current = false;
      optionsRef.current.onError?.(new Error(error));
    },
    [setError, setRecording, releaseSttSession]
  );

  // ── Recognition factory ────────────────────────────────────────────────────

  const createRecognition = useCallback(
    (opts: CreateRecognitionOpts): SpeechRecognitionInstance | null => {
      const SR = getSpeechRecognitionCtor();
      if (!SR) return null;

      const r = new SR();
      r.continuous = !isIOSSafariMode.current;
      r.interimResults = true;
      r.lang = getActiveSpeechLocale();

      r.onstart = () => {
        isStartedRef.current = true;
        setVoiceState("Listening");
        startWatchdog();
        startInactivityTimer();
        emitDebugEvent({ type: "stt.start", data: { action: "start" } });
        opts.onStart?.();
      };

      r.onresult = handleRecognitionResult;
      r.onerror = handleRecognitionError;

      r.onend = () => {
        clearWatchdog();
        clearInactivityTimer();

        if (restartRequestedRef.current && isStartedRef.current) {
          // Watchdog restart: always recreate the instance
          restartRequestedRef.current = false;
          const newR = createRecognitionRef.current?.({
            onStart: opts.onStart,
            onEnd: opts.onEnd,
            onErrorContext: "watchdog_restart",
          });
          if (newR) {
            recognitionRef.current = newR;
            setTimeout(() => {
              try { newR.start(); } catch (e) { logger.warn("Watchdog restart failed", { error: e }); }
            }, RESTART_BACKOFF_BASE_MS);
          }
          return;
        }

        // ⚡ Bolt: Robust auto-restart logic for iOS Safari and accidental drops
        if (!isIntentionalStop.current && !isPausedRef.current && isStartedRef.current) {
          audioDebug.log("stt.auto_restart", { reason: "ios_safari_or_drop" });
          const newR = createRecognitionRef.current?.({
            onStart: opts.onStart,
            onEnd: opts.onEnd,
            onErrorContext: opts.onErrorContext,
          });
          if (newR) {
            recognitionRef.current = newR;
            setTimeout(() => {
              try { newR.start(); } catch (e) { logger.warn("Auto-restart failed", { error: e }); }
            }, RESTART_BACKOFF_BASE_MS);
          }
          return;
        }

        setVoiceState("Idle");
        opts.onEnd?.();
      };

      return r;
    },
    [
      handleRecognitionResult,
      handleRecognitionError,
      startWatchdog,
      startInactivityTimer,
      clearWatchdog,
      clearInactivityTimer,
    ]
  );

  // Bind createRecognitionRef during render (after createRecognition is defined).
  // Setting refs during render is valid React — no stale value risk.
  createRecognitionRef.current = createRecognition;

  // ── Permission check ───────────────────────────────────────────────────────

  const ensureMicrophonePermission = useCallback(
    async (sttSessionId: number): Promise<boolean> => {
      try {
        if (navigator.permissions?.query) {
          const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
          if (status.state === "denied") {
            setError("Microphone permission denied");
            endSTTSession(sttSessionId, "permission_denied");
            sttSessionIdRef.current = null;
            toast.error("Microphone access denied. Please enable in browser settings.");
            return false;
          }
        }
      } catch (e) { logger.debug("Permissions API not available", { error: e }); }
      return true;
    },
    [setError]
  );

  // ── Start recording ────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (!voiceEnabled) { setError("Voice disabled"); toast.error("Voice input disabled"); return; }
    if (isStartedRef.current) return;

    const sttSessionId = beginSTTSession("useVoiceInput.startRecording");
    if (sttSessionId === null) { setError("Microphone busy"); toast.error("Another voice session is active"); return; }
    sttSessionIdRef.current = sttSessionId;

    if (assistantIsSpeakingRef.current) {
      releaseSttSession("assistant_speaking");
      toast.error("Wait for playback to finish");
      return;
    }

    if (!getSpeechRecognitionCtor()) {
      setError("Not supported");
      releaseSttSession("not_supported");
      toast.error("Speech recognition not supported on this browser");
      return;
    }

    const hasMic = await ensureMicrophonePermission(sttSessionId);
    if (!hasMic) return;

    // Reset restart counter on every explicit user-initiated start
    restartCount60sRef.current = 0;
    finalCountRef.current = 0;
    audioDebug.log("session_start", { source: "user" });
    playTone(440, 880); // ascending = start
    triggerHaptic(12);

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
            lang: recognition?.lang ?? "unknown",
          });
        },
        onEnd: () => {
          audioDebug.log("session_end", { intentional: isIntentionalStop.current });
          // If we reached here without an auto-restart triggered in createRecognition's onend,
          // then it's time to actually stop or it's just a pause.
          if (!isPausedRef.current) {
            setRecording(false);
            isStartedRef.current = false;
            releaseSttSession("recognition_end");
            clearWatchdog();
          }
        },
        onErrorContext: "start",
      });

      if (recognition) {
        recognitionRef.current = recognition;
        recognition.start();
      }
    } catch (e) {
      releaseSttSession("start_failed");
      audioDebug.error("session_start", { error: (e as Error).message });
      setError("Failed to start recording");
      toast.error("Failed to start recording");
    }
  }, [
    voiceEnabled,
    setError,
    cleanup,
    createRecognition,
    setRecording,
    clearWatchdog,
    releaseSttSession,
    ensureMicrophonePermission,
  ]);

  // ── Pause / resume ─────────────────────────────────────────────────────────

  const pauseRecording = useCallback(() => {
    if (isRecording && !isPaused) {
      isPausedRef.current = true;
      isIntentionalStop.current = true;
      recognitionRef.current?.stop();
      setIsPaused(true);
      triggerHaptic(8);
      audioDebug.log("app_state_change", { state: "paused" });
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (!isPausedRef.current) return;
    isPausedRef.current = false;
    isIntentionalStop.current = false;
    setIsPaused(false);
    isStartedRef.current = false;

    const recognition = createRecognition({
      onStart: () => {
        emitDebugEvent({ type: "stt.start", data: { action: "start" } });
        audioDebug.log("recognizer_start", { mode: "resume", lang: recognition?.lang ?? "unknown" });
      },
      onEnd: () => {
        audioDebug.log("session_end", { source: "resume", intentional: isIntentionalStop.current });
        if (!isPausedRef.current) {
          commitInterimAsFinal();
          setRecording(false);
          isStartedRef.current = false;
          releaseSttSession("resume_end");
          clearWatchdog();
        }
      },
      onErrorContext: "resume",
    });

    if (!recognition) return;
    recognitionRef.current = recognition;
    emitDebugEvent({ type: "listener.attach", data: { action: "resume" } });
    recognition.start();
    logger.info("Recording resumed");
  }, [setRecording, commitInterimAsFinal, createRecognition, clearWatchdog, releaseSttSession]);

  // ── Toggle helpers ─────────────────────────────────────────────────────────

  const toggleRecording = useCallback(() => {
    if (isRecording) { stopRecording(); }
    else { void startRecording(); triggerHaptic(8); audioDebug.log("app_state_change", { state: "resumed" }); }
  }, [isRecording, startRecording, stopRecording]);

  const togglePause = useCallback(() => {
    if (isPaused) resumeRecording(); else pauseRecording();
  }, [isPaused, resumeRecording, pauseRecording]);

  // ── Render-time ref bindings (after definitions) ───────────────────────────
  stopRecordingRef.current = stopRecording;

  // ── AudioSession integration ───────────────────────────────────────────────

  useEffect(() => {
    registerSTTController({
      stopListening: stopRecording,
      resumeListening: () => void startRecording(),
      isListening: () => isRecording && !isPausedRef.current,
    });
  }, [stopRecording, startRecording, isRecording]);

  useEffect(() => {
    updateListeningState(isRecording && !isPaused);
  }, [isRecording, isPaused]);

  // ── Visibility change: re-start recognition when app returns from background ──

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isRecording && !isPausedRef.current) {
        // App came back from background while recording — recognition likely died
        // Recreate it silently
        logger.info("App foregrounded — restarting recognition");
        restartCount60sRef.current = 0; // Reset restart counter
        const newR = createRecognitionRef.current?.({ onErrorContext: "visibility_restart" });
        if (newR) {
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* ignore */ }
          }
          recognitionRef.current = newR;
          setTimeout(() => {
            try { newR.start(); } catch (e) { logger.warn("Visibility restart failed", { error: e }); }
          }, 300);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isRecording]);

  // ── Unmount cleanup ────────────────────────────────────────────────────────

  useEffect(() => {
    return () => { releaseSttSession("unmount"); cleanup(); };
  }, [cleanup, releaseSttSession]);

  // ── Public API ─────────────────────────────────────────────────────────────

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
