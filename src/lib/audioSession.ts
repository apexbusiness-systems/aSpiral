 
import { createLogger } from '@/lib/logger';
import { addBreadcrumb } from '@/lib/debugOverlay';
import { useAssistantSpeakingStore } from '@/hooks/useAssistantSpeaking';
import { featureFlags } from '@/lib/featureFlags';
import { supabase } from '@/integrations/supabase/client';
import { audioDebug } from '@/lib/audioLogger';
import {
  markAudioPlaybackStart,
  getSyncStats,
  waitForSyncDelay,
  markSpeakRequestStart
} from '@/lib/adaptiveVoiceSync';
import { i18n } from '@/lib/i18n';
import { getSpeechLocale } from '@/lib/i18n/speechLocale';
import { toast } from 'sonner';


const logger = createLogger('AudioSession');

export type AudioBackend = 'none' | 'openai' | 'webSpeech';

export interface AudioSessionStatus {
  isSpeaking: boolean;
  isLoading: boolean;
  backend: AudioBackend;
  requestId: number;
  lastCancelReason: string | null;
  isListening: boolean;
}

export interface SpeakOptions {
  /** The text to speak */
  text: string;
  /** The voice to use */
  voice: string;
  /** Speech speed multiplier */
  speed: number;
  /** Volume level (0-1) */
  volume?: number;
  /** Force use of Web Speech API only */
  forceWebSpeech?: boolean;
  /** Whether to fallback to Web Speech if OpenAI fails. Defaults to true. */
  fallbackToWebSpeech: boolean;
  /** Supabase URL for OpenAI TTS */
  supabaseUrl?: string;
  /** Supabase key for OpenAI TTS */
  supabaseKey?: string;
  /** Callback when speech starts */
  onStart?: () => void;
  /** Callback when speech ends */
  onEnd?: () => void;
  /** Callback when speech errors */
  onError?: (error: Error) => void;
}

export interface STTController {
  stopListening: () => void;
  resumeListening: () => void;
  isListening: () => boolean;
}

const listeners = new Set<(status: AudioSessionStatus) => void>();
const ttsQueue: Array<{
  id: number;
  options: SpeakOptions;
  resolve: () => void;
  reject: (error: Error) => void;
}> = [];

let status: AudioSessionStatus = {
  isSpeaking: false,
  isLoading: false,
  backend: 'none',
  requestId: 0,
  lastCancelReason: null,
  isListening: false,
};

let audioElement: HTMLAudioElement | null = null;
let speechUtterance: SpeechSynthesisUtterance | null = null;
let abortController: AbortController | null = null;
let audioContext: AudioContext | null = null;
let sttController: STTController | null = null;
let resumeListeningRequestId: number | null = null;
let ttsRequestCounter = 0;
let isProcessingQueue = false;
let activeSTTSessionId: number | null = null;
let sttSessionCounter = 0;
let cachedAccessToken: string | null = null;

// ============================================================================
// AUTH CACHE: Keeps a local copy of the access token to avoid getSession() overhead
// ============================================================================
if (typeof globalThis.window !== 'undefined') {
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    cachedAccessToken = session?.access_token ?? null;
  }).catch(() => {
    // Fail silently, fetchOpenAiAudio will fallback to getSession
  });

  // Subscribe to auth changes to keep the token fresh
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedAccessToken = session?.access_token ?? null;
  });
}

// ============================================================================
// REVERB BUFFER: Prevents echo/feedback loops by gating STT input after TTS ends
// The AI needs 600ms of silence to prevent picking up its own voice echo
// ============================================================================
let isGatedFlag = false;
let gateTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Check if STT input should be ignored (gated) due to recent TTS playback.
 * Use this to prevent the AI from "hearing" itself speak.
 */
export function isGated(): boolean {
  return isGatedFlag;
}

function setGate(): void {
  isGatedFlag = true;
  if (gateTimeoutId) {
    clearTimeout(gateTimeoutId);
  }
  audioDebug.log('audio_route_change', { status: 'gated_for_reverb', duration: getReverbTailMs(getDeviceType()) });
}

function clearGateAfterDelay(): void {
  const reverbTailMs = getReverbTailMs(getDeviceType());
  gateTimeoutId = setTimeout(() => {
    isGatedFlag = false;
    gateTimeoutId = null;
    audioDebug.log('audio_route_change', { status: 'gate_cleared' });
  }, reverbTailMs);
}

const notify = () => {
  listeners.forEach((listener) => listener(status));
};

const updateStatus = (next: Partial<AudioSessionStatus>) => {
  status = { ...status, ...next };
  notify();
};

export function subscribeAudioSession(listener: (status: AudioSessionStatus) => void) {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

export function getAudioSessionStatus(): AudioSessionStatus {
  return status;
}

export function registerSTTController(controller: STTController) {
  sttController = controller;
  updateStatus({ isListening: controller.isListening() });
}

export function updateListeningState(isListening: boolean) {
  updateStatus({ isListening });
}

export function beginSTTSession(source: string): number | null {
  if (activeSTTSessionId !== null) {
    audioDebug.log('app_state_change', {
      status: 'stt_session_rejected',
      activeSessionId: activeSTTSessionId,
      source,
    });
    return null;
  }
  sttSessionCounter += 1;
  activeSTTSessionId = sttSessionCounter;
  audioDebug.log('app_state_change', {
    status: 'stt_session_started',
    sessionId: activeSTTSessionId,
    source,
  });
  return activeSTTSessionId;
}

export function endSTTSession(sessionId: number, reason: string) {
  if (activeSTTSessionId !== sessionId) {
    audioDebug.log('app_state_change', {
      status: 'stt_session_end_ignored',
      sessionId,
      activeSessionId: activeSTTSessionId,
      reason,
    });
    return;
  }
  activeSTTSessionId = null;
  audioDebug.log('app_state_change', {
    status: 'stt_session_ended',
    sessionId,
    reason,
  });
}

export async function unlockAudioFromGesture(): Promise<void> {
  if (typeof globalThis === 'undefined') return;
  await ensureAudioContext();

  // Pre-warm Web Speech API voices (async on some browsers)
  if (typeof globalThis !== 'undefined') {
    const synth = (globalThis as unknown as Window).speechSynthesis;
    if (synth) {
      synth.getVoices();
      // Some browsers load voices asynchronously - listen for the event
      if (synth.getVoices().length === 0) {
        synth.addEventListener('voiceschanged', () => synth.getVoices(), { once: true });
      }
    }
  }

  // Play a silent audio buffer to fully unlock audio on iOS/PWA
  try {
    if (audioContext?.state === 'running') {
      const silentBuffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(audioContext.destination);
      source.start(0);
    }
  } catch { /* non-fatal */ }

  audioDebug.log('audio_route_change', { status: 'audio_unlocked' });
}

/**
 * Ensures AudioContext is ready and resumed.
 * CRITICAL for iOS: Must be called inside a user gesture handler initially.
 * Re-creates the context if it was closed (e.g. after backgrounding on PWA).
 */
async function ensureAudioContext(): Promise<void> {
  // Re-create if closed (can happen after PWA background/foreground cycle)
  if (audioContext?.state === 'closed') {
    audioContext = null;
  }

  if (!audioContext) {
    const AudioContextClass = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }

  if (audioContext?.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch (error) {
      logger.warn('AudioContext resume failed', { error: (error as Error).message });
    }
  }
}

function clearAudioElement() {
  if (!audioElement) return;
  audioElement.onplay = null;
  audioElement.onended = null;
  audioElement.onerror = null;
  audioElement.pause();
  audioElement.src = '';
  audioElement = null;
}

function clearSpeechUtterance() {
  if (speechUtterance) {
    globalThis.window.speechSynthesis?.cancel();
    speechUtterance = null;
  }
}

function clearQueue() {
  ttsQueue.splice(0, ttsQueue.length);
  audioDebug.log('tts_enqueue', { queueLength: 0, cleared: true });
}

// ============================================================================
// TTS SENTENCE CHUNKING: Improves iOS Safari reliability by breaking long text
// iOS Safari has issues with long utterances - they can cut off or fail silently
// ============================================================================

/**
 * Split text into sentences for chunked TTS playback.
 * Handles common sentence endings while preserving meaning.
 */
function splitIntoSentences(text: string): string[] {
  // Match sentence endings: period, exclamation, question mark followed by space or end
  // Also handles ellipsis and keeps punctuation with the sentence
  // Fixed for security: avoid catastrophic backtracking with atomic groups
  const sentences = text.match(/(?:[^.!?]+[.!?]+(?:\s|$))|(?:[^.!?]+$)/g);

  if (!sentences) return [text];

  // Filter empty strings and trim
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Check if current browser is iOS Safari (needs sentence chunking)
 */
function needsSentenceChunking(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isIOS && isSafari;
}

function cancelActive(reason: string, resumeListening: boolean) {
  updateStatus({
    isSpeaking: false,
    isLoading: false,
    backend: 'none',
    lastCancelReason: reason,
  });

  if (abortController) {
    abortController.abort();
    abortController = null;
  }

  clearAudioElement();
  clearSpeechUtterance();

  useAssistantSpeakingStore.getState().stopSpeaking();

  if (resumeListening && resumeListeningRequestId === status.requestId) {
    resumeListeningIfNeeded(status.requestId);
  }

  audioDebug.log('tts_end', { reason });
}

async function fetchOpenAiAudio(options: SpeakOptions): Promise<Response> {
  const { supabaseUrl, supabaseKey, text, voice, speed } = options;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }

  // Use cached access token if available, fallback to getSession() if not
  // This avoids the async overhead of getSession() for every TTS request
  let accessToken = cachedAccessToken;
  if (!accessToken) {
    const { data: { session } } = await supabase.auth.getSession();
    accessToken = session?.access_token ?? null;
    cachedAccessToken = accessToken;
  }

  abortController = new AbortController();
  const response = await fetch(`${supabaseUrl}/functions/v1/text-to-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': accessToken ? `Bearer ${accessToken}` : `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ text, voice, speed }),
    signal: abortController.signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({} as { error?: string }));
    throw new Error(errorData.error || `TTS request failed: ${response.status}`);
  }

  return response;
}

function pauseListeningForRequest(requestId: number) {
  if (!sttController) return;
  const wasListening = sttController.isListening();

  // Set the reverb gate immediately when TTS starts
  setGate();

  if (wasListening) {
    sttController.stopListening();
    resumeListeningRequestId = requestId;
    updateStatus({ isListening: sttController.isListening() });
    audioDebug.log('app_state_change', { status: 'stt_paused_for_tts' });
  }
}

function resumeListeningIfNeeded(requestId: number) {
  if (!sttController) return;
  if (resumeListeningRequestId !== requestId) return;

  // CRITICAL: Start the gate clear timer - this gives 600ms of silence before STT resumes
  clearGateAfterDelay();

  // Delay the actual STT resume by reverb tail to prevent echo
  setTimeout(() => {
    if (!sttController) return;
    if (resumeListeningRequestId !== requestId) return; // Request may have been superseded

    sttController.resumeListening();
    updateStatus({ isListening: sttController.isListening() });
    resumeListeningRequestId = null;
    audioDebug.log('app_state_change', { status: 'stt_resumed_after_tts_delay' });
  }, REVERB_BUFFER_MS);
}

function setupAudioHandlers(
  audio: HTMLAudioElement,
  requestId: number,
  options: SpeakOptions,
  resolve: () => void,
  reject: (error: Error) => void,
  context: { backend: AudioBackend; streaming?: boolean; fallbackUrl?: string; skipAutoPlay?: boolean }
) {
  audio.onended = () => {
    if (requestId !== status.requestId) return;
    updateStatus({ isSpeaking: false, backend: context.backend });
    useAssistantSpeakingStore.getState().stopSpeaking();
    if (context.fallbackUrl) URL.revokeObjectURL(context.fallbackUrl);
    else if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);

    clearGateAfterDelay();
    resumeListeningIfNeeded(requestId);
    addBreadcrumb({
      type: 'audio',
      message: 'tts_play_end',
      data: { backend: context.backend, streaming: context.streaming, fallback: !!context.fallbackUrl }
    });
    options.onEnd?.();
    resolve();
  };

  audio.onerror = () => {
    if (requestId !== status.requestId) return;
    const error = new Error('Audio playback failed');
    updateStatus({ isSpeaking: false, isLoading: false, backend: context.backend });
    useAssistantSpeakingStore.getState().stopSpeaking();
    if (context.fallbackUrl) URL.revokeObjectURL(context.fallbackUrl);
    else if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);

    clearGateAfterDelay();
    resumeListeningIfNeeded(requestId);
    addBreadcrumb({
      type: 'audio',
      message: 'tts_error',
      data: { backend: context.backend, streaming: context.streaming, fallback: !!context.fallbackUrl }
    });
    options.onError?.(error);
    reject(error);
  };

  // Skip auto-play for streaming path — play() is called from sourceopen handler
  // after the first chunk is appended, preventing premature play on empty MediaSource
  if (!context.skipAutoPlay) {
    audio.play().catch((error) => {
      if (requestId !== status.requestId) return;
      const playError = new Error(`Audio play blocked: ${(error as Error).message}`);
      updateStatus({ isSpeaking: false, isLoading: false, backend: context.backend });
      useAssistantSpeakingStore.getState().stopSpeaking();
      if (context.fallbackUrl) URL.revokeObjectURL(context.fallbackUrl);
      else if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);

      clearGateAfterDelay();
      resumeListeningIfNeeded(requestId);
      addBreadcrumb({
        type: 'audio',
        message: 'tts_play_rejected',
        data: { error: playError.message, backend: context.backend }
      });
      console.warn('[TTS] Audio blocked—tap once to enable sound');
      options.onError?.(playError);
      reject(playError);
    });
  }
}

async function playOpenAiAudio(response: Response, requestId: number, options: SpeakOptions): Promise<void> {
  // Check if MediaSource is supported
  if (!globalThis.window.MediaSource || !MediaSource.isTypeSupported('audio/mpeg')) {
    // Fallback to old blob method
    logger.warn('MediaSource not supported, falling back to blob method');
    const blob = await response.blob();
    return playOpenAiAudioFallback(blob, requestId, options);
  }

  const mediaSource = new MediaSource();
  const audio = new Audio();
  audio.src = URL.createObjectURL(mediaSource);
  audioElement = audio;

  let sourceBuffer: SourceBuffer | null = null;
  let isFirstChunk = true;
  const bufferQueue: Uint8Array[] = [];
  let isAppending = false;
  let streamComplete = false;

  return new Promise<void>((resolve, reject) => {
    mediaSource.addEventListener('sourceopen', async () => {
      if (requestId !== status.requestId) return;

      try {
        sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        sourceBuffer.addEventListener('updateend', () => {
          if (requestId !== status.requestId) return;

          isAppending = false;

          // Try to append next chunk from queue
          if (bufferQueue.length > 0 && !sourceBuffer!.updating) {
            const nextChunk = bufferQueue.shift()!;
            isAppending = true;
            sourceBuffer!.appendBuffer(nextChunk as unknown as BufferSource);
          } else if (streamComplete && bufferQueue.length === 0 && mediaSource.readyState === 'open') {
            // All chunks appended and stream is done — finalize
            mediaSource.endOfStream();
          }
        });

        // Start streaming the response
        const reader = response.body!.getReader();
        let done = false;

        while (!done) {
          if (requestId !== status.requestId) break;

          const { value, done: readerDone } = await reader.read();
          done = readerDone;

          if (value) {
            if (isFirstChunk) {
              // Start playback immediately after first chunk
              await audio.play();
              isFirstChunk = false;
              updateStatus({ isSpeaking: true, isLoading: false, backend: 'openai' });
              useAssistantSpeakingStore.getState().startSpeaking();
              addBreadcrumb({ type: 'audio', message: 'tts_play_start', data: { backend: 'openai', streaming: true } });
              options.onStart?.();
            }

            // Queue the buffer for appending
            if (!sourceBuffer!.updating && !isAppending) {
              isAppending = true;
              sourceBuffer!.appendBuffer(value as unknown as BufferSource);
            } else {
              bufferQueue.push(value);
            }
          }
        }

        // Mark stream as complete — endOfStream will be called here if idle,
        // or from the updateend handler after the last buffer is flushed
        streamComplete = true;
        if (sourceBuffer && !sourceBuffer.updating && bufferQueue.length === 0 && mediaSource.readyState === 'open') {
          mediaSource.endOfStream();
        }

      } catch (error) {
        reject(error);
      }
    });

    setupAudioHandlers(audio, requestId, options, resolve, reject, { backend: 'openai', streaming: true, skipAutoPlay: true });
  });
}

// Fallback method for browsers without MediaSource support
async function playOpenAiAudioFallback(blob: Blob, requestId: number, options: SpeakOptions): Promise<void> {
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  audio.volume = options.volume ?? 1;
  audioElement = audio;

  return new Promise<void>((resolve, reject) => {
    audio.onplay = () => {
      if (requestId !== status.requestId) return;
      // Mark playback start for adaptive sync latency measurement
      markAudioPlaybackStart();
      updateStatus({ isSpeaking: true, isLoading: false, backend: 'openai' });
      useAssistantSpeakingStore.getState().startSpeaking();
      addBreadcrumb({ type: 'audio', message: 'tts_play_start', data: { backend: 'openai', fallback: true } });
      options.onStart?.();
    };

    setupAudioHandlers(audio, requestId, options, resolve, reject, { backend: 'openai', fallbackUrl: audioUrl });
  });
}

/**
 * Selects the best available voice for the desired language.
 * Prioritizes: Default -> Google -> Samantha/Daniel -> First available
 * Extracted for complexity reduction per SonarQube guidelines.
 */
function selectBestVoice(voices: SpeechSynthesisVoice[], desiredLang: string): SpeechSynthesisVoice | undefined {
  const desiredBase = desiredLang.split("-")[0]?.toLowerCase() ?? "en";

  const matchingVoices = voices.filter((v) => {
    const vLang = (v.lang ?? "").toLowerCase();
    return vLang === desiredLang.toLowerCase() || vLang.startsWith(`${desiredBase}-`) || vLang === desiredBase;
  });

  const pickFrom = matchingVoices.length > 0 ? matchingVoices : voices;

  return (
    pickFrom.find((v) => v.default) ||
    pickFrom.find((v) => v.name.includes("Google")) ||
    pickFrom.find((v) => v.name.includes("Samantha")) ||
    pickFrom.find((v) => v.name.includes("Daniel")) ||
    pickFrom[0]
  );
}

async function speakWithWebSpeech(requestId: number, options: SpeakOptions): Promise<void> {
  if (!globalThis.window.speechSynthesis) {
    throw new Error('Web Speech API not supported');
  }

  // Ensure AudioContext is alive before speaking (critical for PWA after background)
  await ensureAudioContext();

  globalThis.window.speechSynthesis.cancel();

  // Use VoiceConductor for chunking and pacing
  const plan = planUtterance(options.text);
  const chunks = plan.chunks;

  if (chunks.length > 1) {
    audioDebug.log('tts_enqueue', { chunking: true, chunkCount: chunks.length });
  }

  // Wait for voices to load if empty (async on some browsers/PWAs)
  let voices = globalThis.speechSynthesis.getVoices();
  if (voices.length === 0) {
    voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
      const timeout = setTimeout(() => resolve([]), 1000);
      globalThis.speechSynthesis.addEventListener('voiceschanged', () => {
        clearTimeout(timeout);
        resolve(globalThis.speechSynthesis.getVoices());
      }, { once: true });
    });
  }
  // Use the active i18n language instead of document fallback for more accurate language selection
  const activeLang = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const desiredLang = getSpeechLocale(activeLang);

  const preferredVoice = selectBestVoice(voices, desiredLang);

  let isFirstChunk = true;
  let hasErrored = false;

  // Speak each sentence sequentially
  for (let i = 0; i < chunks.length; i++) {
    if (requestId !== status.requestId || hasErrored) break;

    const chunk = chunks[i];
    const isLastChunk = i === chunks.length - 1;

    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      utterance.rate = options.speed;
      utterance.pitch = 1.0;
      utterance.volume = options.volume ?? 1;

      // ✅ Bind TTS language to active document/app language
      utterance.lang = preferredVoice?.lang ?? desiredLang;

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        if (requestId !== status.requestId) return;
        if (isFirstChunk) {
          // Mark playback start for adaptive sync latency measurement
          markAudioPlaybackStart();
          updateStatus({ isSpeaking: true, isLoading: false, backend: 'webSpeech' });
          useAssistantSpeakingStore.getState().startSpeaking();
          audioDebug.log('tts_start', { backend: 'webSpeech', chunked: useChunking, syncStats: getSyncStats() });
          options.onStart?.();
          isFirstChunk = false;
        }
      };

      utterance.onend = () => {
        if (requestId !== status.requestId) return;
        if (isLastChunk) {
          updateStatus({ isSpeaking: false, backend: 'webSpeech' });
          useAssistantSpeakingStore.getState().stopSpeaking();
          resumeListeningIfNeeded(requestId);
          audioDebug.log('tts_end', { backend: 'webSpeech' });
          options.onEnd?.();
        }
        resolve();
      };

      utterance.onerror = (event) => {
        if (requestId !== status.requestId) return;
        // On iOS, 'interrupted' errors are common during chunking - ignore them
        if (event.error === 'interrupted' && useChunking && !isLastChunk) {
          resolve();
          return;
        }
        hasErrored = true;
        const error = new Error(`Speech synthesis error: ${event.error}`);
        updateStatus({ isSpeaking: false, isLoading: false, backend: 'webSpeech' });
        useAssistantSpeakingStore.getState().stopSpeaking();
        audioDebug.error('tts_error', { backend: 'webSpeech', error: event.error });
        resumeListeningIfNeeded(requestId);
        options.onError?.(error);
        toast.error("TTS Error", { description: error.message });
        reject(error);
      };

      speechUtterance = utterance;
      globalThis.window.speechSynthesis.speak(utterance);
    });

    // Adaptive pause based on utterance plan
    if (!isLastChunk && requestId === status.requestId && chunk.trailingPauseMs > 0) {
      await new Promise(r => setTimeout(r, chunk.trailingPauseMs));
    }
  }
}

// Safety valve: prevent a single stuck playback from permanently blocking the queue
const TTS_PLAY_TIMEOUT_MS = 15_000;

async function processQueue() {
  if (isProcessingQueue || ttsQueue.length === 0) return;
  isProcessingQueue = true;
  markQueueProcessingStart();

  try {
    while (ttsQueue.length > 0) {
      const entry = ttsQueue.shift();
      if (!entry) continue;

      const requestId = entry.id;
      updateStatus({ requestId });
      cancelActive('superseded', false);

      // Apply adaptive sync delay before starting TTS (max 1.5s)
      // This makes agent responses feel more natural and conversational
      const textLength = entry.options.text.length;
      await waitForSyncDelay(textLength);

      updateStatus({ isLoading: true, backend: 'none' });
      pauseListeningForRequest(requestId);

      // Mark request start for latency measurement
      markSpeakRequestStart();

      audioDebug.log('tts_enqueue', { queueLength: ttsQueue.length, requestId, textLength });

      try {
        const withTimeout = <T>(promise: Promise<T>): Promise<T> =>
          Promise.race([
            promise,
            new Promise<never>((_, rej) =>
              setTimeout(() => rej(new Error('TTS playback timeout')), TTS_PLAY_TIMEOUT_MS)
            ),
          ]);

        if (entry.options.forceWebSpeech) {
          await withTimeout(speakWithWebSpeech(requestId, entry.options));
          entry.resolve();
        } else {
          const preferences = getBackendPreference();
          let success = false;
          let lastError = null;

          for (const backend of preferences) {
            if (backend === 'openai') {
              try {
                const start = Date.now();
                const blob = await withTimeout(fetchOpenAiAudio(entry.options));
                if (requestId !== status.requestId) {
                  entry.resolve();
                  success = true;
                  break;
                }
                await withTimeout(playOpenAiAudio(blob, requestId, entry.options));
                recordBackendSuccess('openai', Date.now() - start);
                success = true;
                break;
              } catch (e) {
                lastError = e;
                recordBackendFailure('openai');
              }
            } else if (backend === 'groq') {
                // Not implemented yet
            }
          }

          if (success) {
            entry.resolve();
          } else {
            throw lastError || new Error('All primary TTS backends failed');
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          entry.reject(error as Error);
          continue;
        }

        logger.error('TTS failed, trying fallback', error as Error);
        audioDebug.error('tts_error', { backend: entry.options.forceWebSpeech ? 'webSpeech' : 'openai', fallback: true });

        if (!entry.options.forceWebSpeech && entry.options.fallbackToWebSpeech) {
          try {
            await speakWithWebSpeech(requestId, entry.options);
            entry.resolve();
          } catch (fallbackError) {
            const finalError = new Error(`TTS failed: ${(fallbackError as Error).message}`);
            updateStatus({ isSpeaking: false, isLoading: false });
            resumeListeningIfNeeded(requestId);
            entry.options.onError?.(finalError);
            entry.reject(finalError);
          }
        } else {
          const finalError = error as Error;
          updateStatus({ isSpeaking: false, isLoading: false });
          resumeListeningIfNeeded(requestId);
          entry.options.onError?.(finalError);
          entry.reject(finalError);
        }
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

// ============================================================================
// SELF-HEALING: Detect and recover from stuck queue state
// If isProcessingQueue stays true for too long, forcefully reset it.
// This prevents a single failure from permanently silencing TTS.
// ============================================================================
const STUCK_QUEUE_THRESHOLD_MS = 20_000;
let queueProcessingStartedAt = 0;

function markQueueProcessingStart() {
  queueProcessingStartedAt = Date.now();
}

function isQueueStuck(): boolean {
  if (!isProcessingQueue) return false;
  return Date.now() - queueProcessingStartedAt > STUCK_QUEUE_THRESHOLD_MS;
}

function forceResetStuckQueue() {
  logger.warn('TTS queue stuck — forcefully resetting for self-healing');
  audioDebug.error('tts_error', { status: 'stuck_queue_force_reset', stuckDuration: Date.now() - queueProcessingStartedAt });
  addBreadcrumb({ type: 'audio', message: 'tts_stuck_queue_reset', data: { duration: Date.now() - queueProcessingStartedAt } });

  isProcessingQueue = false;
  clearQueue();
  cancelActive('stuck_reset', true);
}

export async function speak(options: SpeakOptions): Promise<void> {
  if (!featureFlags.voiceEnabled) {
    logger.warn('Voice disabled via VITE_VOICE_ENABLED');
    return;
  }

  const trimmed = options.text.trim();
  if (!trimmed) {
    logger.warn('speak called with empty text');
    return;
  }

  // Self-heal: if the queue is stuck, force-reset before enqueuing
  if (isQueueStuck()) {
    forceResetStuckQueue();
  }

  // Ensure AudioContext is active first
  await ensureAudioContext();

  return new Promise<void>((resolve, reject) => {
    ttsRequestCounter += 1;
    const { fallbackToWebSpeech = true, ...rest } = options;
    const entry = {
      id: ttsRequestCounter,
      options: { ...rest, fallbackToWebSpeech, text: trimmed },
      resolve,
      reject,
    };
    ttsQueue.push(entry);
    audioDebug.log('tts_enqueue', { textLength: trimmed.length, queueLength: ttsQueue.length });
    void processQueue();
  });
}

export function stop(reason = 'stopped') {
  clearQueue();
  cancelActive(reason, true);
}

export function disposeAudioSession() {
  // Clear any pending gate timeout to prevent memory leaks
  if (gateTimeoutId) {
    clearTimeout(gateTimeoutId);
    gateTimeoutId = null;
    isGatedFlag = false;
  }

  clearQueue();
  cancelActive('disposed', true);
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    audioDebug.log('audio_route_change', { status: document.visibilityState });

    // Re-resume AudioContext when app comes back to foreground (critical for PWA)
    if (document.visibilityState === 'visible') {
      ensureAudioContext().catch(() => { /* best effort */ });
    }
  });
}
