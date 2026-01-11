import { createLogger } from '@/lib/logger';
import { addBreadcrumb } from '@/lib/debugOverlay';
import { useAssistantSpeakingStore } from '@/hooks/useAssistantSpeaking';
import { featureFlags } from '@/lib/featureFlags';
import { audioDebug } from '@/lib/audioLogger';
import { getDocumentLangFallback, getSpeechLocale } from '@/lib/i18n/speechLocale';
import { i18n } from '@/lib/i18n';

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
  text: string;
  voice: string;
  speed: number;
  volume?: number;
  forceWebSpeech?: boolean;
  fallbackToWebSpeech: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
  onStart?: () => void;
  onEnd?: () => void;
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

// ============================================================================
// REVERB BUFFER: Prevents echo/feedback loops by gating STT input after TTS ends
// The AI needs 600ms of silence to prevent picking up its own voice echo
// ============================================================================
const REVERB_BUFFER_MS = 600;
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
  audioDebug.log('audio_route_change', { status: 'gated_for_reverb', duration: REVERB_BUFFER_MS });
}

function clearGateAfterDelay(): void {
  gateTimeoutId = setTimeout(() => {
    isGatedFlag = false;
    gateTimeoutId = null;
    audioDebug.log('audio_route_change', { status: 'gate_cleared' });
  }, REVERB_BUFFER_MS);
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
  if (typeof window === 'undefined') return;
  await ensureAudioContext();
  window.speechSynthesis?.getVoices();
  audioDebug.log('audio_route_change', { status: 'audio_unlocked' });
}

/**
 * Ensures AudioContext is ready and resumed.
 * CRITICAL for iOS: Must be called inside a user gesture handler initially.
 */
async function ensureAudioContext(): Promise<void> {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  }

  if (audioContext.state === 'suspended') {
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
    window.speechSynthesis?.cancel();
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
  const sentences = text.match(/[^.!?]+[.!?]+[\s]?|[^.!?]+$/g);

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

  if (resumeListening && resumeListeningRequestId === status.requestId && sttController) {
    sttController.resumeListening();
    updateStatus({ isListening: sttController.isListening() });
    resumeListeningRequestId = null;
  }

  audioDebug.log('tts_end', { reason });
}

async function fetchOpenAiAudio(options: SpeakOptions): Promise<Blob> {
  const { supabaseUrl, supabaseKey, text, voice, speed } = options;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }

  abortController = new AbortController();
  const response = await fetch(`${supabaseUrl}/functions/v1/text-to-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ text, voice, speed }),
    signal: abortController.signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({} as { error?: string }));
    throw new Error(errorData.error || `TTS request failed: ${response.status}`);
  }

  return response.blob();
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

  // Delay the actual STT resume by REVERB_BUFFER_MS to prevent echo
  setTimeout(() => {
    if (!sttController) return;
    if (resumeListeningRequestId !== requestId) return; // Request may have been superseded

    sttController.resumeListening();
    updateStatus({ isListening: sttController.isListening() });
    resumeListeningRequestId = null;
    audioDebug.log('app_state_change', { status: 'stt_resumed_after_tts_delay' });
  }, REVERB_BUFFER_MS);
}

async function playOpenAiAudio(blob: Blob, requestId: number, options: SpeakOptions): Promise<void> {
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  audio.volume = options.volume ?? 1;
  audioElement = audio;

  return new Promise<void>((resolve, reject) => {
    audio.onplay = () => {
      if (requestId !== status.requestId) return;
      updateStatus({ isSpeaking: true, isLoading: false, backend: 'openai' });
      useAssistantSpeakingStore.getState().startSpeaking();
      audioDebug.log('tts_start', { backend: 'openai' });
      options.onStart?.();
    };

    audio.onended = () => {
      if (requestId !== status.requestId) return;
      updateStatus({ isSpeaking: false, backend: 'openai' });
      useAssistantSpeakingStore.getState().stopSpeaking();
      URL.revokeObjectURL(audioUrl);
      resumeListeningIfNeeded(requestId);
      audioDebug.log('tts_end', { backend: 'openai' });
      options.onEnd?.();
      resolve();
    };

    audio.onerror = () => {
      if (requestId !== status.requestId) return;
      const error = new Error('Audio playback failed');
      updateStatus({ isSpeaking: false, isLoading: false, backend: 'openai' });
      useAssistantSpeakingStore.getState().stopSpeaking();
      audioDebug.error('tts_error', { backend: 'openai' });
      options.onError?.(error);
      reject(error);
    };

    audio.play().catch((error) => {
      reject(error as Error);
    });
  });
}

async function speakWithWebSpeech(requestId: number, options: SpeakOptions): Promise<void> {
  if (!window.speechSynthesis) {
    throw new Error('Web Speech API not supported');
  }

  window.speechSynthesis.cancel();

  // iOS Safari: use sentence chunking for reliability
  const useChunking = needsSentenceChunking();
  const sentences = useChunking ? splitIntoSentences(options.text) : [options.text];

  if (useChunking && sentences.length > 1) {
    audioDebug.log('tts_enqueue', { chunking: true, sentenceCount: sentences.length });
  }

  const voices = window.speechSynthesis.getVoices();
  // Use the active i18n language instead of document fallback for more accurate language selection
  const activeLang = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const desiredLang = getSpeechLocale(activeLang);
  const desiredBase = desiredLang.split("-")[0]?.toLowerCase() ?? "en";

  const matchingVoices = voices.filter((v) => {
    const vLang = (v.lang ?? "").toLowerCase();
    return vLang === desiredLang.toLowerCase() || vLang.startsWith(`${desiredBase}-`) || vLang === desiredBase;
  });

  const pickFrom = matchingVoices.length > 0 ? matchingVoices : voices;

  const preferredVoice =
    pickFrom.find((v) => v.default) ||
    pickFrom.find((v) => v.name.includes("Google")) ||
    pickFrom.find((v) => v.name.includes("Samantha")) ||
    pickFrom.find((v) => v.name.includes("Daniel")) ||
    pickFrom[0];

  let isFirstSentence = true;
  let hasErrored = false;

  // Speak each sentence sequentially
  for (let i = 0; i < sentences.length; i++) {
    if (requestId !== status.requestId || hasErrored) break;

    const sentence = sentences[i];
    const isLastSentence = i === sentences.length - 1;

    await new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(sentence);
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
        if (isFirstSentence) {
          updateStatus({ isSpeaking: true, isLoading: false, backend: 'webSpeech' });
          useAssistantSpeakingStore.getState().startSpeaking();
          audioDebug.log('tts_start', { backend: 'webSpeech', chunked: useChunking });
          options.onStart?.();
          isFirstSentence = false;
        }
      };

      utterance.onend = () => {
        if (requestId !== status.requestId) return;
        if (isLastSentence) {
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
        if (event.error === 'interrupted' && useChunking && !isLastSentence) {
          resolve();
          return;
        }
        hasErrored = true;
        const error = new Error(`Speech synthesis error: ${event.error}`);
        updateStatus({ isSpeaking: false, isLoading: false, backend: 'webSpeech' });
        useAssistantSpeakingStore.getState().stopSpeaking();
        audioDebug.error('tts_error', { backend: 'webSpeech', error: event.error });
        options.onError?.(error);
        reject(error);
      };

      speechUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    });

    // Small pause between sentences for natural pacing (iOS needs this)
    if (useChunking && !isLastSentence && requestId === status.requestId) {
      await new Promise(r => setTimeout(r, 50));
    }
  }
}

async function processQueue() {
  if (isProcessingQueue || ttsQueue.length === 0) return;
  isProcessingQueue = true;

  try {
    while (ttsQueue.length > 0) {
      const entry = ttsQueue.shift();
      if (!entry) continue;

      const requestId = entry.id;
      updateStatus({ requestId });
      cancelActive('superseded', false);
      updateStatus({ isLoading: true, backend: 'none' });
      pauseListeningForRequest(requestId);
      audioDebug.log('tts_enqueue', { queueLength: ttsQueue.length, requestId });

      try {
        if (entry.options.forceWebSpeech) {
          // Force WebSpeech only
          await speakWithWebSpeech(requestId, entry.options);
          entry.resolve();
        } else {
          // Try OpenAI first, fallback to WebSpeech
          const blob = await fetchOpenAiAudio(entry.options);
          if (requestId !== status.requestId) {
            entry.resolve();
            continue;
          }
          await playOpenAiAudio(blob, requestId, entry.options);
          entry.resolve();
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

  // Ensure AudioContext is active first
  await ensureAudioContext();

  return new Promise<void>((resolve, reject) => {
    ttsRequestCounter += 1;
    const entry = {
      id: ttsRequestCounter,
      options: { ...options, text: trimmed },
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
  });
}
