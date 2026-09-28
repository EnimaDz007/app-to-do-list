import { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

// 🔑 Samsung SpeechRecognizer hallucinates these phrases during silence/noise
const HALLUCINATIONS = [
  'thank you', 'thanks', 'thank you very much',
  'شكرا', 'شكرا لك', 'شكرا جزيلا',
  'merci', 'merci beaucoup',
  'uh', 'um', 'hmm', 'er', 'ah',
  'you', 'the', 'a', 'and', 'or', 'so',
  'subtitles by', 'subs by', 'subscribe',
  'okay google', 'hey google', 'alexa',
];

function isHallucination(text: string): boolean {
  const cleaned = text.toLowerCase().replace(/[.,!?;:]/g, '').trim();
  return HALLUCINATIONS.includes(cleaned);
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

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  console.log('[MIC] 🚀 useSpeechRecognition VERSION 9.0 (HALLUCINATION FILTER)');

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const modeRef = useRef<'web' | 'native' | 'none'>('none');
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
    console.log('[MIC] 🖼️ display → committed =', JSON.stringify(committedRef.current), '| current =', JSON.stringify(currentUtteranceRef.current));
    setTranscript(combined);
  };

  const commitCurrent = () => {
    const cur = currentUtteranceRef.current.trim();
    console.log('[MIC] 💾 commit. cur =', JSON.stringify(cur), '| committed was =', JSON.stringify(committedRef.current));
    currentUtteranceRef.current = '';
    lastHeardRef.current = '';
    if (!cur) return;

    const prev = committedRef.current.trim();

    if (!prev) {
      committedRef.current = cur;
    } else if (prev.toLowerCase().endsWith(cur.toLowerCase())) {
      console.log('[MIC] 💾 Skipped (endswith).');
      return;
    } else {
      const prevWords = prev.toLowerCase().split(/\s+/);
      const curWords = cur.toLowerCase().split(/\s+/);
      if (curWords.length <= prevWords.length) {
        const tailWords = prevWords.slice(-curWords.length);
        if (tailWords.join(' ') === curWords.join(' ')) {
          console.log('[MIC] 💾 Skipped (word-level duplicate).');
          return;
        }
      }
      committedRef.current = `${prev} ${cur}`;
    }
    console.log('[MIC] 💾 Committed now =', JSON.stringify(committedRef.current));
    refreshDisplay();
  };

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
    console.log('[MIC] Mode:', modeRef.current);
  }, []);

  // ---------- Native listeners (attached once) ----------
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

        // 🔑 Filter Samsung hallucinations
        if (isHallucination(newText)) {
          console.log('[MIC] 🚫 Filtered hallucination:', JSON.stringify(newText));
          return;
        }

        // 🔑 Ignore 1-letter partials (pure noise)
        if (newText.length < 2) return;

        const oldText = lastHeardRef.current;
        if (newText === oldText) return;
        lastHeardRef.current = newText;

        const session = currentUtteranceRef.current;

        // 🔑 If the new partial starts with what we already have → cumulative, replace
        if (session && newText.toLowerCase().startsWith(session.toLowerCase())) {
          currentUtteranceRef.current = newText;
        }
        // 🔑 If the session contains the new text → keep the longer one
        else if (session && session.toLowerCase().includes(newText.toLowerCase())) {
          // no-op
        }
        // 🔑 Completely new phrase → commit the old, start fresh
        else if (session) {
          commitCurrent();
          currentUtteranceRef.current = newText;
        }
        // 🔑 No session yet → just set it
        else {
          currentUtteranceRef.current = newText;
        }

        refreshDisplay();
        lastStateChangeRef.current = Date.now();
      });

      stateL = await SpeechRecognition.addListener('listeningState', (data: any) => {
        if (cancelled) return;
        const status = data?.status;
        console.log('[MIC] state:', status);
        lastStateChangeRef.current = Date.now();

        if (status === 'started') {
          setIsListening(true);
        } else if (status === 'stopped') {
          setIsListening(false);
          setInterimTranscript('');
          // ⚠️ Don't commit here — Samsung fires 'stopped' aggressively.
          // The watchdog will commit on real silence.
        }
      });
    };

    setup();
    return () => {
      cancelled = true;
      partialL?.remove?.();
      stateL?.remove?.();
    };
  }, []);

  const nativeRestart = useCallback(async () => {
    if (isRestartingRef.current || !sessionActiveRef.current) return;
    isRestartingRef.current = true;
    try {
      await SpeechRecognition.start({
        language: langRef.current,
        maxResults: 1,
        partialResults: true,
        popup: false,
      });
      console.log('[MIC] ✅ restarted.');
      lastStateChangeRef.current = Date.now();
    } catch (err) {
      console.log('[MIC] ⚠️ restart failed, retrying...');
      await SpeechRecognition.stop().catch(() => {});
      await new Promise((r) => setTimeout(r, 1500));
      if (!sessionActiveRef.current) return;
      try {
        await SpeechRecognition.start({
          language: langRef.current,
          maxResults: 1,
          partialResults: true,
          popup: false,
        });
        console.log('[MIC] ✅ restarted after retry.');
      } catch (e) {
        console.warn('[MIC] ❌ retry failed:', e);
      }
    } finally {
      isRestartingRef.current = false;
    }
  }, []);

  // Watchdog: commit on real silence, then restart
  useEffect(() => {
    const interval = setInterval(() => {
      if (!sessionActiveRef.current) return;
      if (isRestartingRef.current) return;
      const silent = Date.now() - lastStateChangeRef.current;
      if (silent > 3500) {
        if (currentUtteranceRef.current.trim()) {
          console.log('[MIC] 🐕 silence → commit:', currentUtteranceRef.current);
          commitCurrent();
        }
        nativeRestart();
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [nativeRestart]);

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
        if (isHallucination(txt)) continue;
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
    recog.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') console.warn('[MIC] web error:', event.error);
    };
    recog.onend = () => {
      setIsListening(false);
      commitCurrent();
      if (shouldRestartRef.current && sessionActiveRef.current) {
        setTimeout(() => {
          if (shouldRestartRef.current && sessionActiveRef.current) startWebRecognition();
        }, 200);
      }
    };
    webRecognitionRef.current = recog;
    try { recog.start(); } catch {}
  }, []);

  const startListening = useCallback(async (langCode = 'en-US') => {
    console.log('[MIC] ▶️ start, mode =', modeRef.current);
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
        console.warn('[MIC] native start failed:', err);
        sessionActiveRef.current = false;
      }
    }
  }, [startWebRecognition]);

  const stopListening = useCallback(() => {
    sessionActiveRef.current = false;
    shouldRestartRef.current = false;
    if (webRecognitionRef.current) { try { webRecognitionRef.current.abort(); } catch {} webRecognitionRef.current = null; }
    if (Capacitor.isNativePlatform()) SpeechRecognition.stop().catch(() => {});
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const restartListening = useCallback(() => {
    stopListening();
    setTimeout(() => startListening(langRef.current), 800);
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