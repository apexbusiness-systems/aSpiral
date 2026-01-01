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
import { useAssistantSpeakingStore } from './useAssistantSpeaking';
import { createLogger } from '@/lib/logger';

const logger = createLogger('useTextToSpeech');

// Debug event types for voice debug panel
type TTSDebugEvent = {
  type: 'tts.request' | 'tts.audio_received' | 'tts.play_start' | 'tts.play_end' | 'tts.error' | 'tts.fallback' | 'audioContext.state';
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

  const [state, setState] = useState<TextToSpeechState>({
    isSpeaking: false,
    isLoading: false,
    error: null,
    usesFallback: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const { startSpeaking, stopSpeaking } = useAssistantSpeakingStore();

  // Ensure AudioContext is ready (mobile requirement)
  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        emitTTSDebugEvent({ 
          type: 'audioContext.state', 
          data: { state: 'resumed', success: true } 
        });
      } catch (e) {
        emitTTSDebugEvent({ 
          type: 'audioContext.state', 
          data: { state: 'suspended', error: (e as Error).message } 
        });
      }
    }
    
    return audioContextRef.current;
  }, []);

  // Stop any ongoing speech
  const stop = useCallback(() => {
    // Stop audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    // Abort fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Stop Web Speech API
    if (utteranceRef.current) {
      window.speechSynthesis?.cancel();
      utteranceRef.current = null;
    }

    setState(prev => ({ ...prev, isSpeaking: false, isLoading: false }));
    stopSpeaking();
    emitTTSDebugEvent({ type: 'tts.play_end', data: { reason: 'stopped' } });
  }, [stopSpeaking]);

  // Web Speech API fallback
  const speakWithWebSpeech = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Web Speech API not supported'));
        return;
      }

      emitTTSDebugEvent({ type: 'tts.fallback', data: { engine: 'webSpeech' } });

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speed;
      utterance.pitch = 1.0;
      
      // Try to find a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes('Google') || 
        v.name.includes('Samantha') || 
        v.name.includes('Daniel')
      ) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setState(prev => ({ ...prev, isSpeaking: true, isLoading: false }));
        startSpeaking();
        emitTTSDebugEvent({ type: 'tts.play_start', data: { engine: 'webSpeech' } });
        onStart?.();
      };

      utterance.onend = () => {
        setState(prev => ({ ...prev, isSpeaking: false }));
        stopSpeaking();
        emitTTSDebugEvent({ type: 'tts.play_end', data: { engine: 'webSpeech' } });
        onEnd?.();
        resolve();
      };

      utterance.onerror = (event) => {
        const error = new Error(`Speech synthesis error: ${event.error}`);
        emitTTSDebugEvent({ type: 'tts.error', data: { engine: 'webSpeech', error: event.error } });
        reject(error);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }, [speed, startSpeaking, stopSpeaking, onStart, onEnd]);

  // Main speak function
  const speak = useCallback(async (text: string): Promise<void> => {
    if (!text || text.trim().length === 0) {
      logger.warn('speak called with empty text');
      return;
    }

    // Stop any ongoing speech first
    stop();

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      usesFallback: false 
    }));

    emitTTSDebugEvent({ 
      type: 'tts.request', 
      data: { textLength: text.length, voice, speed } 
    });

    try {
      // Ensure AudioContext is ready for mobile
      await ensureAudioContext();

      // Try OpenAI TTS via edge function
      abortControllerRef.current = new AbortController();

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase not configured');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/text-to-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ text, voice, speed }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      
      emitTTSDebugEvent({ 
        type: 'tts.audio_received', 
        data: { bytes: audioBlob.size, format: 'mp3' } 
      });

      // Create audio element and play
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setState(prev => ({ ...prev, isSpeaking: true, isLoading: false }));
        startSpeaking();
        emitTTSDebugEvent({ type: 'tts.play_start', data: { engine: 'openai' } });
        onStart?.();
      };

      audio.onended = () => {
        setState(prev => ({ ...prev, isSpeaking: false }));
        stopSpeaking();
        URL.revokeObjectURL(audioUrl);
        emitTTSDebugEvent({ type: 'tts.play_end', data: { engine: 'openai' } });
        onEnd?.();
      };

      audio.onerror = (e) => {
        const error = new Error('Audio playback failed');
        setState(prev => ({ ...prev, isSpeaking: false, isLoading: false, error: error.message }));
        stopSpeaking();
        emitTTSDebugEvent({ type: 'tts.error', data: { engine: 'openai', error: 'playback_failed' } });
        onError?.(error);
      };

      await audio.play();

    } catch (error) {
      // If aborted, don't treat as error
      if ((error as Error).name === 'AbortError') {
        return;
      }

      logger.error('OpenAI TTS failed, trying fallback', error as Error);
      emitTTSDebugEvent({ 
        type: 'tts.error', 
        data: { engine: 'openai', error: (error as Error).message } 
      });

      // Try Web Speech API fallback
      if (fallbackToWebSpeech) {
        try {
          setState(prev => ({ ...prev, usesFallback: true }));
          await speakWithWebSpeech(text);
        } catch (fallbackError) {
          const finalError = new Error(`TTS failed: ${(fallbackError as Error).message}`);
          setState(prev => ({ 
            ...prev, 
            isSpeaking: false, 
            isLoading: false, 
            error: finalError.message 
          }));
          onError?.(finalError);
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          isSpeaking: false, 
          isLoading: false, 
          error: (error as Error).message 
        }));
        onError?.(error as Error);
      }
    }
  }, [voice, speed, stop, ensureAudioContext, startSpeaking, stopSpeaking, onStart, onEnd, onError, fallbackToWebSpeech, speakWithWebSpeech]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
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
