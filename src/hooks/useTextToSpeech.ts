/**
 * Text-to-Speech Hook
 * 
 * Provides TTS functionality with:
 * - OpenAI TTS API via edge function (primary)
 * - Web Speech API fallback (when edge function unavailable)
 * - Mobile AudioContext resume handling
 * - Integration with assistant speaking gate
 * 
 * Debug events are emitted for the voice debug panel.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createLogger } from '@/lib/logger';
import {
  speak as sessionSpeak,
  stop as sessionStop,
  subscribeAudioSession,
  getAudioSessionStatus,
} from '@/lib/audioSession';
import { featureFlags } from '@/lib/featureFlags';

const logger = createLogger('useTextToSpeech');

// Debug event types for voice debug panel
type TTSDebugEvent = {
  type: 'tts.request' | 'tts.audio_received' | 'tts.play_start' | 'tts.play_end' | 'tts.error' | 'tts.fallback';
  timestamp: number;
  data?: Record<string, unknown>;
};

// Debug buffer (shared with voice debug panel)
const DEBUG_BUFFER_SIZE = 50;
let ttsDebugBuffer: TTSDebugEvent[] = [];
let ttsDebugSubscribers: Set<(events: TTSDebugEvent[]) => void> = new Set();

function emitTTSDebugEvent(event: Omit<TTSDebugEvent, 'timestamp'>) {
  const fullEvent: TTSDebugEvent = { ...event, timestamp: Date.now() };
  ttsDebugBuffer = [...ttsDebugBuffer.slice(-(DEBUG_BUFFER_SIZE - 1)), fullEvent];
  ttsDebugSubscribers.forEach(cb => cb(ttsDebugBuffer));
  logger.debug(`[${event.type}]`, event.data);
}

export function subscribeToTTSDebug(callback: (events: TTSDebugEvent[]) => void) {
  ttsDebugSubscribers.add(callback);
  callback(ttsDebugBuffer);
  return () => { ttsDebugSubscribers.delete(callback); };
}

interface UseTextToSpeechOptions {
  voice?: string; // OpenAI voices: alloy, ash, ballad, coral, echo, sage, shimmer, verse, nova
  speed?: number; // 0.25 to 4.0
  fallbackToWebSpeech?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

interface TextToSpeechState {
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
  usesFallback: boolean;
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}) {
  const {
    voice = 'nova',
    speed = 1.0,
    fallbackToWebSpeech = true,
    onStart,
    onEnd,
    onError,
  } = options;

  const [state, setState] = useState<TextToSpeechState>(() => {
    const status = getAudioSessionStatus();
    return {
      isSpeaking: status.isSpeaking,
      isLoading: status.isLoading,
      error: null,
      usesFallback: status.backend === 'webSpeech',
    };
  });

  const lastBackendRef = useRef(getAudioSessionStatus().backend);

  useEffect(() => {
    return subscribeAudioSession((status) => {
      const backendChanged = lastBackendRef.current !== status.backend;
      if (backendChanged) {
        lastBackendRef.current = status.backend;
      }

      setState((prev) => {
        const usesFallback = status.backend === 'webSpeech';
        if (
          prev.isSpeaking === status.isSpeaking &&
          prev.isLoading === status.isLoading &&
          prev.usesFallback === usesFallback
        ) {
          return prev;
        }
        return {
          ...prev,
          isSpeaking: status.isSpeaking,
          isLoading: status.isLoading,
          usesFallback,
        };
      });
    });
  }, []);

  const stop = useCallback(() => {
    sessionStop('stopped');
    setState(prev => ({ ...prev, isSpeaking: false, isLoading: false }));
    emitTTSDebugEvent({ type: 'tts.play_end', data: { reason: 'stopped' } });
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (!featureFlags.voiceEnabled) {
      logger.warn('TTS disabled via VITE_VOICE_ENABLED');
      return;
    }

    if (!text || text.trim().length === 0) {
      logger.warn('speak called with empty text');
      return;
    }

    emitTTSDebugEvent({
      type: 'tts.request',
      data: { textLength: text.length, voice, speed },
    });

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      usesFallback: false,
    }));

    try {
      await sessionSpeak({
        text,
        voice,
        speed,
        fallbackToWebSpeech,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        onStart: () => {
          emitTTSDebugEvent({ type: 'tts.play_start' });
          onStart?.();
        },
        onEnd: () => {
          emitTTSDebugEvent({ type: 'tts.play_end' });
          onEnd?.();
        },
        onError: (error) => {
          emitTTSDebugEvent({ type: 'tts.error', data: { error: error.message } });
          setState(prev => ({ ...prev, error: error.message }));
          onError?.(error);
        },
      });

      const backend = getAudioSessionStatus().backend;
      if (backend === 'webSpeech') {
        emitTTSDebugEvent({ type: 'tts.fallback', data: { engine: 'webSpeech' } });
      }
    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        isSpeaking: false,
        isLoading: false,
        error: err.message,
      }));
      onError?.(err);
    }
  }, [voice, speed, fallbackToWebSpeech, onStart, onEnd, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    speak,
    stop,
    isSpeaking: state.isSpeaking,
    isLoading: state.isLoading,
    error: state.error,
    usesFallback: state.usesFallback,
  };
}
