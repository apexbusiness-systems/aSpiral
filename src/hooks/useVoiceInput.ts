/**
 * useVoiceInput — MediaRecorder + Groq Edge Function STT Hook
 *
 * Architecture:
 *  - Single AudioSessionController: exactly one active STT session at a time
 *  - MediaRecorder captures audio chunks, sends to Supabase edge function on stop
 *  - Silence detection: auto-stops after configurable timeout (clamped 800–10 000 ms)
 *  - Barge-in gate: reverb buffer prevents echo feedback after TTS
 *  - No SpeechRecognition / WebSpeech — no retry loops, no console spam
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
import { getAdaptiveEndpointMs } from "../lib/voice";
import { featureFlags } from "@/lib/featureFlags";
import { toast } from "sonner";
import { audioDebug } from "@/lib/audioLogger";
import { addBreadcrumb } from "@/lib/debugOverlay";
import { supabase } from "@/integrations/supabase/client";
import type { SpiralError } from "@/types/errors";

// ─── Constants ────────────────────────────────────────────────────────────────

const logger = createLogger("useVoiceInput");

const SETTINGS_STORAGE_KEY = "aspiral_settings_v1";

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

export interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (error: Error) => void;
  /** Post-utterance silence before auto-stop. Clamped 800–10 000 ms. Default 5 000. */
  silenceTimeoutMs?: number;
  /** Watchdog polling interval. Kept for API compatibility, unused in MediaRecorder path. */
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
  return () => {
    // Ensure React effect cleanup has void return type (not boolean).
    debugSubscribers.delete(cb);
  };
}
export const getVoiceDebugBuffer = () => debugBuffer;
export function clearVoiceDebugBuffer() {
  debugBuffer = [];
  debugSubscribers.forEach((cb) => cb(debugBuffer));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AudioContextConstructor = new () => AudioContext;
type GlobalVoiceApis = typeof globalThis & {
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
};

function getAudioContextCtor(): AudioContextConstructor | null {
  const g = globalThis as GlobalVoiceApis;
  return g.AudioContext ?? g.webkitAudioContext ?? null;
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

function selectMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

let sttSessionCounter = 0;

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [isSupported, setIsSupported] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceState, setVoiceState] = useState<"Idle" | "Listening" | "Reconnecting" | "Error">("Idle");
  const [transcript, setTranscript] = useState("");
  const [sttError, setSttError] = useState<SpiralError | null>(null);
  const [sttResult, setSttResult] = useState<{ transcript: string | null; error: SpiralError | null }>({ transcript: null, error: null });

  // Derived state — no interim results with MediaRecorder; both point to same value
  const finalTranscript = transcript;
  const interimTranscript = "";

  // ── Refs ───────────────────────────────────────────────────────────────────
  const optionsRef = useRef(options);
  const isPausedRef = useRef(false);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Session tracking
  const sttSessionIdRef = useRef<number | null>(null);

  // Silence auto-stop timer
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Render-time ref sync — no TDZ risk, refs declared above
  optionsRef.current = options;
  isPausedRef.current = isPaused;

  // ── External state ─────────────────────────────────────────────────────────
  const { isRecording, setRecording, setError } = useSessionStore();
  const voiceEnabled = featureFlags.voiceEnabled;
  const assistantIsSpeaking = useAssistantSpeakingStore((s) => s.isSpeaking);
  const assistantIsSpeakingRef = useRef(assistantIsSpeaking);
  assistantIsSpeakingRef.current = assistantIsSpeaking;

  // ── Support detection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!voiceEnabled) { setIsSupported(false); return; }
    const supported =
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof window !== "undefined" &&
      typeof window.MediaRecorder !== "undefined";
    setIsSupported(supported);
    audioDebug.log("mic_permission", { supported, reason: supported ? "mediarecorder_available" : "no_mediarecorder" });
  }, [voiceEnabled]);

  // ── Silence timer helpers ──────────────────────────────────────────────────

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // ── Release STT session ────────────────────────────────────────────────────

  const releaseSttSession = useCallback((reason: string) => {
    if (sttSessionIdRef.current !== null) {
      endSTTSession(sttSessionIdRef.current, reason);
      sttSessionIdRef.current = null;
    }
  }, []);

  // ── Stop tracks ───────────────────────────────────────────────────────────

  const stopMediaTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  // ── stopRecording ──────────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    setVoiceState("Idle");
    emitDebugEvent({ type: "stt.stop", data: { action: "user_stop" } });

    if (
      mediaRecorderRef.current &&
      (mediaRecorderRef.current.state === "recording" ||
        mediaRecorderRef.current.state === "paused")
    ) {
      // onstop will handle blob upload and releaseSttSession
      mediaRecorderRef.current.stop();
    } else {
      // Already stopped or never started — release session directly
      releaseSttSession("user_stop_no_recorder");
    }

    setRecording(false);
    setIsPaused(false);
    playTone(440, 220); // descending = stop
  }, [clearSilenceTimer, setRecording, releaseSttSession]);

  // ── MediaRecorder onstop handler (async upload) ────────────────────────────

  const buildOnStop = useCallback(
    (sessionId: number) => async () => {
      const chunks = chunksRef.current;
      chunksRef.current = [];
      stopMediaTracks();

      if (chunks.length === 0) {
        logger.info("onstop: no chunks — skipping upload");
        endSTTSession(sessionId, "empty_blob");
        if (sttSessionIdRef.current === sessionId) sttSessionIdRef.current = null;
        return;
      }

      const blob = new Blob(chunks, { type: chunks[0]?.type ?? "audio/webm" });

      if (blob.size === 0) {
        logger.info("onstop: empty blob — skipping upload");
        endSTTSession(sessionId, "empty_blob");
        if (sttSessionIdRef.current === sessionId) sttSessionIdRef.current = null;
        return;
      }

      // Build multipart form
      const formData = new FormData();
      formData.append("file", blob);

      try {
        const { data: authData } = await supabase.auth.getSession();
        const accessToken = authData.session?.access_token ?? (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string);
        const url = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/speech-to-text`;

        let response: Response | null = null;
        for (let attempt = 0; attempt <= 2; attempt++) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          try {
            response = await fetch(url, {
              method: "POST",
              headers: {
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
                Authorization: `Bearer ${accessToken}`,
              },
              body: formData,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok && response.status >= 500 && attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
              continue;
            }
            break;
          } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === "AbortError") {
              const timeoutError: SpiralError = { code: "STT_TIMEOUT", message: "Speech request timed out", retryable: true };
              setSttError(timeoutError);
              setSttResult({ transcript: null, error: timeoutError });
              return;
            }
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
              continue;
            }
            throw err;
          }
        }

        if (!response) {
          const fetchError: SpiralError = { code: "STT_FETCH_FAILED", message: "No response from speech service", retryable: true };
          setSttError(fetchError);
          setSttResult({ transcript: null, error: fetchError });
          return;
        }

        if (!response.ok) {
          const errText = await response.text();
          console.error('[useVoiceInput] STT fetch failed:', { status: response.status, url });
          const code: SpiralError['code'] = response.status >= 500 ? "STT_FETCH_FAILED" : "STT_PARSE_ERROR";
          const failureError: SpiralError = { code, message: `STT failed with status ${response.status}: ${errText}`, retryable: response.status >= 500 };
          setSttError(failureError);
          setSttResult({ transcript: null, error: failureError });
          emitDebugEvent({ type: "stt.error", data: { status: response.status, body: errText } });
        } else {
          const json = (await response.json()) as { text?: string };
          const text = (json.text ?? "").trim();
          setSttError(null);
          setSttResult({ transcript: text || null, error: null });
          if (text) {
            setTranscript(text);
            optionsRef.current.onTranscript?.(text);
            emitDebugEvent({ type: "stt.final", data: { text } });
            audioDebug.log("stt_final", { text });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isCorsError = /cors|networkerror|failed to fetch/i.test(message);
        const failureError: SpiralError = {
          code: isCorsError ? "CORS_ERROR" : "STT_FETCH_FAILED",
          message,
          retryable: true,
        };
        logger.error("STT fetch failed", err instanceof Error ? err : new Error(String(err)));
        setSttError(failureError);
        setSttResult({ transcript: null, error: failureError });
        emitDebugEvent({ type: "stt.error", data: { error: String(err) } });
      } finally {
        endSTTSession(sessionId, "onstop_complete");
        if (sttSessionIdRef.current === sessionId) sttSessionIdRef.current = null;
      }
    },
    [stopMediaTracks]
  );

  // ── startRecording ─────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (!voiceEnabled) { setError("Voice disabled"); toast.error("Voice input disabled"); return; }

    if (isGated()) {
      logger.info("startRecording blocked: barge-in gated");
      return;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      // Already recording
      return;
    }

    const sessionId = sttSessionCounter++;
    beginSTTSession(`useVoiceInput.startRecording.${sessionId}`);
    sttSessionIdRef.current = sessionId;

    if (assistantIsSpeakingRef.current) {
      releaseSttSession("assistant_speaking");
      toast.error("Wait for playback to finish");
      return;
    }

    audioDebug.log("session_start", { source: "user" });
    playTone(440, 880); // ascending = start
    triggerHaptic(12);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const mimeType = selectMimeType();
      const recorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = buildOnStop(sessionId);

      recorder.start();

      setVoiceState("Listening");
      setRecording(true);
      setIsPaused(false);
      setTranscript("");
      setSttError(null);
      setSttResult({ transcript: null, error: null });

      emitDebugEvent({ type: "stt.start", data: { mimeType, action: "start" } });
      emitDebugEvent({ type: "listener.attach", data: { action: "start" } });
      audioDebug.log("recognizer_start", { mimeType });

      // Silence auto-stop
      const silenceMs = Math.max(
        800,
        Math.min(10_000, options.silenceTimeoutMs ?? getAdaptiveEndpointMs())
      );
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        logger.info(`Silence timeout after ${silenceMs}ms — auto-stopping`);
        stopRecording();
      }, silenceMs);
    } catch (err) {
      releaseSttSession("start_failed");
      const error = err instanceof Error ? err : new Error(String(err));
      audioDebug.error("session_start", { error: error.message });
      logger.error("Failed to start MediaRecorder", error);
      setError("Failed to start recording");
      emitDebugEvent({ type: "stt.error", data: { error: error.message } });
      toast.error("Failed to start recording — check microphone permissions");
      optionsRef.current.onError?.(error);
    }
  }, [
    voiceEnabled,
    setError,
    setRecording,
    clearSilenceTimer,
    releaseSttSession,
    buildOnStop,
    stopRecording,
    options.silenceTimeoutMs,
  ]);

  // ── Pause / resume ─────────────────────────────────────────────────────────

  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      isPausedRef.current = true;
      triggerHaptic(8);
      audioDebug.log("app_state_change", { state: "paused" });
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (!isPausedRef.current) return;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      isPausedRef.current = false;
      audioDebug.log("app_state_change", { state: "resumed" });
    }
  }, []);

  // ── Toggle helpers ─────────────────────────────────────────────────────────

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
      triggerHaptic(8);
      audioDebug.log("app_state_change", { state: "resumed" });
    }
  }, [isRecording, startRecording, stopRecording]);

  const togglePause = useCallback(() => {
    if (isPaused) resumeRecording();
    else pauseRecording();
  }, [isPaused, resumeRecording, pauseRecording]);

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

  // ── Unmount cleanup ────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      stopMediaTracks();
      releaseSttSession("unmount");
      emitDebugEvent({ type: "listener.detach", data: { reason: "unmount" } });
    };
  }, [clearSilenceTimer, stopMediaTracks, releaseSttSession]);

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    isRecording,
    isSupported,
    isPaused,
    voiceState,
    transcript,
    error: sttError,
    sttResult,
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
