/**
 * Assistant Speaking State Hook
 * 
 * Provides a global "assistant is speaking" gate to prevent feedback loops
 * where STT transcribes the assistant's TTS output.
 * 
 * This is the single source of truth for whether the assistant is speaking.
 */

import { create } from 'zustand';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AssistantSpeaking');

interface AssistantSpeakingState {
  isSpeaking: boolean;
  speakingStartedAt: number | null;
  
  // Actions
  startSpeaking: () => void;
  stopSpeaking: () => void;
}

export const useAssistantSpeakingStore = create<AssistantSpeakingState>((set, get) => ({
  isSpeaking: false,
  speakingStartedAt: null,
  
  startSpeaking: () => {
    if (get().isSpeaking) {
      logger.debug('startSpeaking called but already speaking - ignoring');
      return;
    }
    
    logger.info('Assistant started speaking');
    set({ 
      isSpeaking: true, 
      speakingStartedAt: Date.now() 
    });
  },
  
  stopSpeaking: () => {
    const duration = get().speakingStartedAt 
      ? Date.now() - get().speakingStartedAt 
      : 0;
    
    logger.info('Assistant stopped speaking', { durationMs: duration });
    set({ 
      isSpeaking: false, 
      speakingStartedAt: null 
    });
  },
}));

/**
 * Hook to access assistant speaking state
 */
export function useAssistantSpeaking() {
  const { isSpeaking, startSpeaking, stopSpeaking } = useAssistantSpeakingStore();
  
  return {
    isSpeaking,
    startSpeaking,
    stopSpeaking,
  };
}
