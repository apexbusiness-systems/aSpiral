import { createLogger } from '@/lib/logger';
import { addBreadcrumb } from '@/lib/debugOverlay';
import { useAssistantSpeakingStore } from '@/hooks/useAssistantSpeaking';
import { featureFlags } from '@/lib/featureFlags';

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

async function ensureAudioContext(): Promise<void> {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  }

  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch (error) {
      logger.warn('AudioContext resume failed', error as Error);
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

  addBreadcrumb({
    type: 'audio',
    message: 'tts_cancel',
    data: { reason },
  });
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
  if (wasListening) {
    sttController.stopListening();
    resumeListeningRequestId = requestId;
    updateStatus({ isListening: sttController.isListening() });
    addBreadcrumb({ type: 'audio', message: 'stt_paused_for_tts' });
  }
}

function resumeListeningIfNeeded(requestId: number) {
  if (!sttController) return;
  if (resumeListeningRequestId !== requestId) return;
  sttController.resumeListening();
  updateStatus({ isListening: sttController.isListening() });
  resumeListeningRequestId = null;
  addBreadcrumb({ type: 'audio', message: 'stt_resumed_after_tts' });
}

async function playOpenAiAudio(blob: Blob, requestId: number, options: SpeakOptions): Promise<void> {
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  audioElement = audio;

  return new Promise<void>((resolve, reject) => {
    audio.onplay = () => {
      if (requestId !== status.requestId) return;
      updateStatus({ isSpeaking: true, isLoading: false, backend: 'openai' });
      useAssistantSpeakingStore.getState().startSpeaking();
      addBreadcrumb({ type: 'audio', message: 'tts_play_start', data: { backend: 'openai' } });
      options.onStart?.();
    };

    audio.onended = () => {
      if (requestId !== status.requestId) return;
      updateStatus({ isSpeaking: false, backend: 'openai' });
      useAssistantSpeakingStore.getState().stopSpeaking();
      URL.revokeObjectURL(audioUrl);
      resumeListeningIfNeeded(requestId);
      addBreadcrumb({ type: 'audio', message: 'tts_play_end', data: { backend: 'openai' } });
      options.onEnd?.();
      resolve();
    };

    audio.onerror = () => {
      if (requestId !== status.requestId) return;
      const error = new Error('Audio playback failed');
      updateStatus({ isSpeaking: false, isLoading: false, backend: 'openai' });
      useAssistantSpeakingStore.getState().stopSpeaking();
      addBreadcrumb({ type: 'audio', message: 'tts_error', data: { backend: 'openai' } });
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

  return new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(options.text);
    utterance.rate = options.speed;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) =>
        v.name.includes('Google') ||
        v.name.includes('Samantha') ||
        v.name.includes('Daniel')
      ) || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      if (requestId !== status.requestId) return;
      updateStatus({ isSpeaking: true, isLoading: false, backend: 'webSpeech' });
      useAssistantSpeakingStore.getState().startSpeaking();
      addBreadcrumb({ type: 'audio', message: 'tts_play_start', data: { backend: 'webSpeech' } });
      options.onStart?.();
    };

    utterance.onend = () => {
      if (requestId !== status.requestId) return;
      updateStatus({ isSpeaking: false, backend: 'webSpeech' });
      useAssistantSpeakingStore.getState().stopSpeaking();
      resumeListeningIfNeeded(requestId);
      addBreadcrumb({ type: 'audio', message: 'tts_play_end', data: { backend: 'webSpeech' } });
      options.onEnd?.();
      resolve();
    };

    utterance.onerror = (event) => {
      if (requestId !== status.requestId) return;
      const error = new Error(`Speech synthesis error: ${event.error}`);
      updateStatus({ isSpeaking: false, isLoading: false, backend: 'webSpeech' });
      useAssistantSpeakingStore.getState().stopSpeaking();
      addBreadcrumb({ type: 'audio', message: 'tts_error', data: { backend: 'webSpeech' } });
      options.onError?.(error);
      reject(error);
    };

    speechUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
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

  const requestId = status.requestId + 1;
  updateStatus({ requestId });
  cancelActive('superseded', false);
  updateStatus({ isLoading: true, backend: 'none' });
  pauseListeningForRequest(requestId);

  addBreadcrumb({ type: 'audio', message: 'tts_request', data: { textLength: trimmed.length } });

  try {
    await ensureAudioContext();
    const blob = await fetchOpenAiAudio({ ...options, text: trimmed });
    if (requestId !== status.requestId) return;
    await playOpenAiAudio(blob, requestId, options);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return;
    }

    logger.error('OpenAI TTS failed, trying fallback', error as Error);

    if (options.fallbackToWebSpeech) {
      try {
        await speakWithWebSpeech(requestId, options);
      } catch (fallbackError) {
        const finalError = new Error(`TTS failed: ${(fallbackError as Error).message}`);
        updateStatus({ isSpeaking: false, isLoading: false });
        resumeListeningIfNeeded(requestId);
        options.onError?.(finalError);
      }
    } else {
      const finalError = error as Error;
      updateStatus({ isSpeaking: false, isLoading: false });
      resumeListeningIfNeeded(requestId);
      options.onError?.(finalError);
    }
  }
}

export function stop(reason = 'stopped') {
  cancelActive(reason, true);
}

export function disposeAudioSession() {
  cancelActive('disposed', true);
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}
