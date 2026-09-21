import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API interface declarations for TypeScript
interface IWindowSpeechRecognition extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: (langCode?: string) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setManualTranscript: (text: string) => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  const isSupported =
    typeof window !== 'undefined' &&
    !!((window as IWindowSpeechRecognition).SpeechRecognition ||
      (window as IWindowSpeechRecognition).webkitSpeechRecognition);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore already stopped
      }
    }
  }, []);

  const startListening = useCallback(
    (langCode = 'en-US') => {
      if (!isSupported) {
        setError('Voice recognition is not supported in this browser.');
        return;
      }

      setError(null);

      // Stop previous instance if running
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const SpeechRecClass =
        (window as IWindowSpeechRecognition).SpeechRecognition ||
        (window as IWindowSpeechRecognition).webkitSpeechRecognition;

      const recognition = new SpeechRecClass();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = langCode;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            currentFinal += text + ' ';
          } else {
            currentInterim += text;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => (prev ? `${prev.trim()} ${currentFinal.trim()}` : currentFinal.trim()));
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        // Ignore "no-speech" or user aborted without spamming error
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        if (event.error === 'not-allowed') {
          setError('Microphone permission denied. Please allow microphone access in your browser.');
        } else {
          setError(`Speech error: ${event.error}`);
        }
        stopListening();
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          // User intended to keep recording, or browser timed out on silence
          setIsListening(false);
          isListeningRef.current = false;
        }
      };

      try {
        recognition.start();
      } catch (err: any) {
        setError(err?.message || 'Could not start microphone');
        setIsListening(false);
        isListeningRef.current = false;
      }
    },
    [isSupported, stopListening]
  );

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const setManualTranscript = useCallback((text: string) => {
    setTranscript(text);
    setInterimTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    setManualTranscript,
  };
}
