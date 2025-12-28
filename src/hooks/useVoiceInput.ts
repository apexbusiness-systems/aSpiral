import { useState, useCallback, useRef, useEffect } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { createLogger } from "@/lib/logger";

const logger = createLogger("useVoiceInput");

interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (error: Error) => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const accumulatedTranscriptRef = useRef("");

  const { isRecording, setRecording, setError } = useSessionStore();

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (!SpeechRecognition) {
      logger.warn("Speech recognition not supported");
    }
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const error = new Error("Speech recognition not supported");
      setError(error.message);
      options.onError?.(error);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        logger.info("Recording started");
        setRecording(true);
        setIsPaused(false);
        setTranscript("");
        accumulatedTranscriptRef.current = "";
      };

      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);

        if (finalTranscript) {
          accumulatedTranscriptRef.current += " " + finalTranscript;
          options.onTranscript?.(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        logger.error("Recognition error", new Error(event.error));
        setError(`Voice recognition error: ${event.error}`);
        setRecording(false);
        setIsPaused(false);
        options.onError?.(new Error(event.error));
      };

      recognition.onend = () => {
        logger.info("Recording ended");
        setRecording(false);
        setIsPaused(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      logger.error("Failed to start recording", error as Error);
      setError("Failed to start voice recording");
      options.onError?.(error as Error);
    }
  }, [setRecording, setError, options]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      logger.info("Recording stopped");
    }
    setRecording(false);
    setIsPaused(false);
  }, [setRecording]);

  const pauseRecording = useCallback(() => {
    if (recognitionRef.current && isRecording && !isPaused) {
      recognitionRef.current.stop();
      setIsPaused(true);
      logger.info("Recording paused");
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (isPaused) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          const currentTranscript = finalTranscript || interimTranscript;
          setTranscript(currentTranscript);

          if (finalTranscript) {
            accumulatedTranscriptRef.current += " " + finalTranscript;
            options.onTranscript?.(finalTranscript);
          }
        };

        recognition.onerror = (event) => {
          logger.error("Recognition error", new Error(event.error));
          setError(`Voice recognition error: ${event.error}`);
          setRecording(false);
          setIsPaused(false);
          options.onError?.(new Error(event.error));
        };

        recognition.onend = () => {
          if (!isPaused) {
            logger.info("Recording ended");
            setRecording(false);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsPaused(false);
        logger.info("Recording resumed");
      }
    }
  }, [isPaused, setRecording, setError, options]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  }, [isPaused, pauseRecording, resumeRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    isSupported,
    isPaused,
    transcript,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    toggleRecording,
    togglePause,
  };
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}
