import { useState, useEffect, useCallback, useRef } from 'react';
import { useVoiceInput } from './useVoiceInput';

interface UseOfflineSpeechProps {
  onOfflineTransition?: (isOffline: boolean) => void;
  // Allows forcing offline mode for testing
  forceOffline?: boolean;
}

/**
 * Wrapper around useVoiceInput that detects network status and falls back 
 * to native Web Speech API if offline, maintaining basic dictation capabilities
 * even when cloud STT is unavailable.
 */
export function useOfflineSpeech(props: UseOfflineSpeechProps = {}) {
  const { onOfflineTransition, forceOffline = false, ...voiceInputProps } = props;
  
  const [isOffline, setIsOffline] = useState<boolean>(
    forceOffline || (typeof navigator !== 'undefined' ? !navigator.onLine : false)
  );
  
  const baseVoice = useVoiceInput(voiceInputProps);

  // Network listener
  useEffect(() => {
    if (forceOffline) {
      setIsOffline(true);
      return;
    }

    const handleOnline = () => {
      setIsOffline(false);
      onOfflineTransition?.(false);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      onOfflineTransition?.(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOfflineTransition, forceOffline]);

  // Native Web Speech Fallback Ref
  const recognitionRef = useRef<any>(null);
  const [offlineTranscript, setOfflineTranscript] = useState('');
  const [isOfflineListening, setIsOfflineListening] = useState(false);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Type casting to avoid strict TS DOM lib issues with experimental API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      // Use user's selected locale or default to US English
      recognition.lang = (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // Match the shape of useVoiceInput's return
        setOfflineTranscript(finalTranscript || interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Offline speech recognition error:', event.error);
        if (event.error === 'network') {
          // Expected in true offline, but some native engines fail here
        }
        setIsOfflineListening(false);
      };

      recognition.onend = () => {
        // Auto-restart if we're meant to be listening (continuous mode polyfill)
        if (isOfflineListening && isOffline) {
          try {
            recognition.start();
          } catch (e) {
            // Might already be started
          }
        } else {
          setIsOfflineListening(false);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isOffline, isOfflineListening]);

  const startOfflineListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        setOfflineTranscript('');
        recognitionRef.current.start();
        setIsOfflineListening(true);
      } catch (e) {
        console.warn('Failed to start offline recognition', e);
      }
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }, []);

  const stopOfflineListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsOfflineListening(false);
    }
  }, []);

  // Proxy the commands based on online/offline state
  const proxyStart = useCallback(() => {
    if (isOffline) {
      startOfflineListening();
    } else {
      baseVoice.togglePause(); // Assuming togglePause handles start/stop if startListening doesn't exist
    }
  }, [isOffline, startOfflineListening, baseVoice]);

  const proxyStop = useCallback(() => {
    if (isOffline) {
      stopOfflineListening();
    } else {
      baseVoice.togglePause();
    }
  }, [isOffline, stopOfflineListening, baseVoice]);

  // Merge the exposed API
  return {
    ...baseVoice,
    transcript: isOffline ? offlineTranscript : baseVoice.transcript,
    isListening: isOffline ? isOfflineListening : baseVoice.voiceState === 'Listening',
    startListening: proxyStart,
    stopListening: proxyStop,
    isOfflineMode: isOffline,
    isNativeSupported: !!recognitionRef.current
  };
}
