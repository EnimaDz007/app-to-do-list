import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

const HALLUCINATIONS = [
  'thank you', 'thanks', 'thank you very much',
  'شكرا', 'شكرا لك', 'شكرا جزيلا',
  'merci', 'merci beaucoup',
  'uh', 'um', 'hmm', 'er', 'ah',
  'you', 'the', 'a', 'and', 'or', 'so',
  'subtitles by', 'subs by', 'subscribe',
  'okay google', 'hey google', 'alexa',
  'mama', 'papa', 'call mama', 'call papa',
  'please', 'yes', 'no', 'ok',
];

function isHallucination(text: string): boolean {
  const cleaned = text.toLowerCase().replace(/[.,!?;:]/g, '').trim();
  return HALLUCINATIONS.includes(cleaned);
}

function looksLikeGarbage(text: string): boolean {
  const cleaned = text.trim();
  if (cleaned.length < 3) return true;
  const hasVowel = /[aeiouyAEIOUYإأآاويى]/.test(cleaned) || /[\u0600-\u06FF]/.test(cleaned);
  if (!hasVowel) return true;
  if (!/[a-zA-Z\u0600-\u06FF]/.test(cleaned)) return true;
  return false;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: (langCode?: string) => void;
  stopListening: () => void;
  restartListening: () => void;
  resetTranscript: () => void;
  setManualTranscript: (text: string) => void;
}

export function useSpeechRecognition(manualMode: boolean = false): UseSpeechRecognitionReturn {
  console.log(`[MIC] 🚀 useSpeechRecognition VERSION 14.0 (manualMode=${manualMode})`);

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const modeRef = useRef<'web' | 'native' | 'none'>('none');
  const manualModeRef = useRef(manualMode);
  manualModeRef.current = manualMode;

  const webRecognitionRef = useRef<any>(null);
  const sessionActiveRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const langRef = useRef('en-US');
  const lastStateChangeRef = useRef<number>(Date.now());
  const isRestartingRef = useRef(false);

  const committedRef = useRef('');
  const currentUtteranceRef = useRef('');
  const lastHeardRef = useRef('');
  const userEditedRef = useRef(false);

  const refreshDisplay = () => {
    if (userEditedRef.current) return;
    const combined = [committedRef.current, currentUtteranceRef.current]
      .filter(Boolean)
      .join(' ')
      .trim();
    setTranscript(combined);
  };

  const commitCurrent = useCallback(() => {
    const cur = currentUtteranceRef.current.trim();
    currentUtteranceRef.current = '';
    lastHeardRef.current = '';
    if (!cur) return;
    if (looksLikeGarbage(cur)) return;

    const prev = committedRef.current.trim();
    if (!prev) {
      committedRef.current = cur;
    } else if (prev.toLowerCase().endsWith(cur.toLowerCase())) {
      return;
    } else {
      committedRef.current = `${prev} ${cur}`;
    }
    refreshDisplay();
  }, []);

  useEffect(() => {
    const w = window as any;
    const hasWebSpeech = !!(w.SpeechRecognition || w.webkitSpeechRecognition);
    if (Capacitor.isNativePlatform()) {
      modeRef.current = 'native';
      setIsSupported(true);
    } else if (hasWebSpeech) {
      modeRef.current = 'web';
      setIsSupported(true);
    } else {
      modeRef.current = 'none';
      setIsSupported(false);
    }
  }, []);

  // Native listeners (attached once)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let partialL: any = null;
    let stateL: any = null;
    let cancelled = false;

    const setup = async () => {
      partialL = await SpeechRecognition.addListener('partialResults', (data: any) => {
        if (cancelled || !sessionActiveRef.current) return;
        const matches = data?.matches || [];
        if (matches.length === 0) return;

        const newText = (matches[0] || '').trim();
        if (!newText) return;
        if (isHallucination(newText) || looksLikeGarbage(newText)) return;

        const oldText = lastHeardRef.current;
        if (newText === oldText) return;
        lastHeardRef.current = newText;

        const session = currentUtteranceRef.current;

        if (session && newText.toLowerCase().startsWith(session.toLowerCase())) {
          currentUtteranceRef.current = newText;
        } else if (session && session.toLowerCase().includes(newText.toLowerCase())) {
          // no-op
        } else if (session) {
          commitCurrent();
          currentUtteranceRef.current = newText;
        } else {
          currentUtteranceRef.current = newText;
        }

        refreshDisplay();
        lastStateChangeRef.current = Date.now();
      });

      stateL = await SpeechRecognition.addListener('listeningState', (data: any) => {
        if (cancelled) return;
        const status = data?.status;
        lastStateChangeRef.current = Date.now();
        if (status === 'started') {
          setIsListening(true);
        } else if (status === 'stopped') {
          setIsListening(false);
          setInterimTranscript('');
        }
      });
    };

    setup();
    return () => {
      cancelled = true;
      partialL?.remove?.();
      stateL?.remove?.();
    };
  }, [commitCurrent]);

  const nativeRestart = useCallback(async () => {
    if (isRestartingRef.current || !sessionActiveRef.current) return;
    isRestartingRef.current = true;
    try {
      lastHeardRef.current = '';
      try {
        await SpeechRecognition.start({
          language: langRef.current,
          maxResults: 1,
          partialResults: true,
          popup: false,
        });
      } catch {
        await new Promise((r) => setTimeout(r, 2000));
        if (!sessionActiveRef.current) return;
        await SpeechRecognition.start({
          language: langRef.current,
          maxResults: 1,
          partialResults: true,
          popup: false,
        });
      }
      lastStateChangeRef.current = Date.now();
    } catch (err) {
      console.warn('[MIC] Restart failed:', err);
    } finally {
      isRestartingRef.current = false;
    }
  }, []);

  // Watchdog
  useEffect(() => {
    const interval = setInterval(() => {
      if (!sessionActiveRef.current) return;
      if (isRestartingRef.current) return;
      const silent = Date.now() - lastStateChangeRef.current;
      if (silent > 5000) {
        if (currentUtteranceRef.current.trim()) {
          commitCurrent();
        }
        if (!manualModeRef.current) {
          // Auto mode: restart mic
          nativeRestart();
        } else {
          // Manual mode: mark as not listening so user has to tap again
          sessionActiveRef.current = false;
          setIsListening(false);
        }
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [nativeRestart, commitCurrent]);

  const startWebRecognition = useCallback(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    if (webRecognitionRef.current) { try { webRecognitionRef.current.abort(); } catch {} }
    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = langRef.current;

    recog.onstart = () => setIsListening(true);
    recog.onresult = (event: any) => {
      if (!sessionActiveRef.current) return;
      let interim = '';
      const finals: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const txt = (res[0]?.transcript || '').trim();
        if (!txt) continue;
        if (isHallucination(txt) || looksLikeGarbage(txt)) continue;
        if (res.isFinal) finals.push(txt);
        else interim += txt + ' ';
      }
      if (interim) {
        currentUtteranceRef.current = interim.trim();
        refreshDisplay();
      }
      if (finals.length > 0) {
        currentUtteranceRef.current = finals.join(' ').trim();
        commitCurrent();
      }
    };
    recog.onerror = () => {};
    recog.onend = () => {
      setIsListening(false);
      commitCurrent();
      if (shouldRestartRef.current && sessionActiveRef.current && !manualModeRef.current) {
        setTimeout(() => {
          if (shouldRestartRef.current && sessionActiveRef.current) startWebRecognition();
        }, 200);
      }
    };
    webRecognitionRef.current = recog;
    try { recog.start(); } catch {}
  }, [commitCurrent]);

  const startListening = useCallback(async (langCode = 'en-US') => {
    langRef.current = langCode;
    sessionActiveRef.current = true;
    shouldRestartRef.current = true;
    setError(null);
    lastStateChangeRef.current = Date.now();

    if (modeRef.current === 'web') {
      startWebRecognition();
    } else if (modeRef.current === 'native') {
      try {
        const perm = await SpeechRecognition.checkPermissions();
        if (perm.speechRecognition !== 'granted') {
          const req = await SpeechRecognition.requestPermissions();
          if (req.speechRecognition !== 'granted') {
            setError('Mic denied.');
            sessionActiveRef.current = false;
            return;
          }
        }
        await SpeechRecognition.start({
          language: langCode,
          maxResults: 1,
          partialResults: true,
          popup: false,
        });
        setIsListening(true);
      } catch (err) {
        console.warn('[MIC] start failed:', err);
        sessionActiveRef.current = false;
      }
    }
  }, [startWebRecognition]);

  const stopListening = useCallback(() => {
    // Commit whatever we have before stopping
    commitCurrent();
    sessionActiveRef.current = false;
    shouldRestartRef.current = false;
    if (webRecognitionRef.current) { try { webRecognitionRef.current.abort(); } catch {} webRecognitionRef.current = null; }
    if (Capacitor.isNativePlatform()) SpeechRecognition.stop().catch(() => {});
    setIsListening(false);
    setInterimTranscript('');
  }, [commitCurrent]);

  const restartListening = useCallback(() => {
    stopListening();
    setTimeout(() => startListening(langRef.current), 400);
  }, [startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    committedRef.current = '';
    currentUtteranceRef.current = '';
    lastHeardRef.current = '';
    userEditedRef.current = false;
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const setManualTranscript = useCallback((text: string) => {
    committedRef.current = text;
    currentUtteranceRef.current = '';
    lastHeardRef.current = '';
    userEditedRef.current = true;
    setTranscript(text);
    setInterimTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      sessionActiveRef.current = false;
      shouldRestartRef.current = false;
      if (webRecognitionRef.current) { try { webRecognitionRef.current.abort(); } catch {} }
      if (Capacitor.isNativePlatform()) {
        SpeechRecognition.stop().catch(() => {});
        SpeechRecognition.removeAllListeners().catch(() => {});
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
    restartListening,
    resetTranscript,
    setManualTranscript,
  };
}