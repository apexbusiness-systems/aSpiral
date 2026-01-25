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
import { toast } from 'sonner';

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
const ttsDebugSubscribers: Set<(events: TTSDebugEvent[]) => void> = new Set();

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
  voice?: string; // OpenAI voices: alloy, ash, ballot, coral, echo, sage, shimmer, verse, nova
  speed?: number; // 0.25 to 4
  volume?: number; // 0 to 1
  forceWebSpeech?: boolean;
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
    speed = 1,
    volume = 1,
    forceWebSpeech = false,
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
    const unsubscribe = subscribeAudioSession((status) => {
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
    return () => { unsubscribe(); };
  }, []);

  const stop = useCallback(() => {
    sessionStop('stopped');
    setState(prev => ({ ...prev, isSpeaking: false, isLoading: false }));
    emitTTSDebugEvent({ type: 'tts.play_end', data: { reason: 'stopped' } });
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (!featureFlags.voiceEnabled) {
      logger.warn('TTS disabled via VITE_VOICE_ENABLED');
      toast.error('Voice output disabled');
      return;
    }

    if (!text || text.trim().length === 0) {
      logger.warn('speak called with empty text');
      toast.error('Nothing to speak yet');
      return;
    }

    // Enterprise-grade input validation
    if (text.length > 4000) {
      logger.warn('Text exceeds maximum length, truncating');
      text = text.substring(0, 4000) + '...';
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
      // Add request timeout for enterprise reliability
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('TTS request timeout after 30 seconds'));
        }, 30000);
      });

      // Race condition protection
      const speakPromise = sessionSpeak({
        text,
        voice,
        speed,
        volume,
        forceWebSpeech,
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
          toast.error('Voice playback failed', { description: error.message });
          onError?.(error);
        },
      });

      await Promise.race([speakPromise, timeoutPromise]);

      const backend = getAudioSessionStatus().backend;
      if (backend === 'webSpeech') {
        emitTTSDebugEvent({ type: 'tts.fallback', data: { engine: 'webSpeech' } });
      }
    } catch (error) {
      const err = error as Error;
      logger.error('TTS failed with error:', err);

      // Enhanced error classification and recovery
      if (err.message.includes('timeout') || err.message.includes('network')) {
        // Network-related errors - attempt fallback if available
        if (fallbackToWebSpeech && !forceWebSpeech) {
          logger.info('Attempting WebSpeech fallback due to network error');
          try {
            await sessionSpeak({
              text,
              voice,
              speed,
              volume,
              forceWebSpeech: true,
              fallbackToWebSpeech: false,
              supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
              supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              onStart: () => {
                emitTTSDebugEvent({ type: 'tts.play_start', data: { fallback: true } });
                onStart?.();
              },
              onEnd: () => {
                emitTTSDebugEvent({ type: 'tts.play_end', data: { fallback: true } });
                onEnd?.();
              },
              onError: (fallbackError) => {
                emitTTSDebugEvent({ type: 'tts.error', data: { error: fallbackError.message, fallback: true } });
                setState(prev => ({ ...prev, error: fallbackError.message }));
                toast.error('Fallback voice playback failed', { description: fallbackError.message });
                onError?.(fallbackError);
              },
            });
            setState(prev => ({ ...prev, usesFallback: true }));
            return;
          } catch (fallbackError) {
            logger.error('Fallback also failed:', fallbackError as Error);
            err.message = `Primary and fallback TTS failed: ${err.message}`;
          }
        }
      }

      setState(prev => ({
        ...prev,
        isSpeaking: false,
        isLoading: false,
        error: err.message,
      }));
      toast.error('Voice playback failed', { description: err.message });
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
