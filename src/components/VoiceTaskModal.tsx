import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Check, X, Flame, Calendar, Users, Trash2, Eraser, Keyboard, Sparkles, Clock, Tag } from 'lucide-react';
import { QuadrantId, CONTEXT_DEFINITIONS } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { parseSpokenTask } from '../utils/voiceParser';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';

interface VoiceTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  quadrant?: QuadrantId;
  onAddTask: (parsed: {
    title: string;
    description: string;
    quadrant: QuadrantId;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    category: any;
    contexts: string[];
    estimatedMinutes: number;
    dueDate: string;
  }) => void;
}

const QUADRANTS = [
  { id: 'do_first' as QuadrantId,  icon: Flame,    gradient: 'from-rose-500 to-red-600',         bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700' },
  { id: 'schedule' as QuadrantId,  icon: Calendar, gradient: 'from-indigo-500 to-indigo-700',   bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700' },
  { id: 'delegate' as QuadrantId,  icon: Users,    gradient: 'from-emerald-500 to-emerald-700',  bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  { id: 'eliminate' as QuadrantId, icon: Trash2,   gradient: 'from-slate-500 to-slate-700',      bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-700' },
];

const SPEECH_LANG: Record<string, string> = { en: 'en-US', fr: 'fr-FR', ar: 'ar-SA' };

const HALLUCINATION_EXACT = [
  'thank you', 'thanks', 'thank you very much',
  'شكرا', 'شكرا لك', 'شكرا جزيلا',
  'merci', 'merci beaucoup',
  'uh', 'um', 'hmm',
  'subtitles by', 'subs by', 'subscribe',
  'okay google', 'hey google', 'alexa',
];

function isHallucination(text: string): boolean {
  const cleaned = text.toLowerCase().replace(/[.,!?;:،]/g, '').trim();
  if (cleaned.length === 0) return true;
  return HALLUCINATION_EXACT.includes(cleaned);
}

/** Collapse immediate word-level repetition: "milk milk" → "milk". */
function dedupeWords(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return text.trim();
  const out: string[] = [];
  for (const w of words) {
    const prev = out[out.length - 1];
    if (prev && prev.toLowerCase() === w.toLowerCase()) continue;
    out.push(w);
  }
  return out.join(' ');
}

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  speakYourTask: string;
  typeYourTask: string;
  statusHearing: string;
  statusListening: string;
  statusTapMic: string;
  voiceBtn: string;
  typeBtn: string;
  voicePlaceholder: string;
  typePlaceholder: string;
  smartParse: string;
  matchSuffix: string;
  addTagHint: string;
  priorityLabel: Record<'urgent' | 'high' | 'medium' | 'low', string>;
  minutesSuffix: string;
  alertEmpty: string;
  errNotSupported: string;
  errNotAvailable: string;
  errMicDenied: string;
  contexts: Record<string, string>;
}> = {
  en: {
    speakYourTask: 'Speak your task',
    typeYourTask: 'Type your task',
    statusHearing: 'Hearing you…',
    statusListening: 'Listening — speak now',
    statusTapMic: 'Tap mic to start',
    voiceBtn: 'Voice',
    typeBtn: 'Type',
    voicePlaceholder: 'Your words appear here — feel free to edit…',
    typePlaceholder: 'e.g. Finish report tomorrow 3pm urgent @work',
    smartParse: 'Smart Parse',
    matchSuffix: 'match',
    addTagHint: 'Add @home or @work…',
    priorityLabel: { urgent: 'urgent', high: 'high', medium: 'medium', low: 'low' },
    minutesSuffix: 'min',
    alertEmpty: 'Please speak or type something first.',
    errNotSupported: 'Voice not supported in this browser.',
    errNotAvailable: 'Voice recognition not available on this device.',
    errMicDenied: 'Microphone permission denied. Enable it in device settings.',
    contexts: { home: 'Home', work: 'Work', call: 'Call', computer: 'Deep Work', errand: 'Errand', health: 'Health' },
  },
  fr: {
    speakYourTask: 'Dictez votre tâche',
    typeYourTask: 'Saisissez votre tâche',
    statusHearing: 'Je vous entends…',
    statusListening: 'Écoute — parlez maintenant',
    statusTapMic: 'Appuyez sur le micro',
    voiceBtn: 'Voix',
    typeBtn: 'Écrire',
    voicePlaceholder: 'Vos mots apparaissent ici — modifiables…',
    typePlaceholder: 'ex. Finir le rapport demain 15h urgent @work',
    smartParse: 'Analyse intelligente',
    matchSuffix: 'de correspondance',
    addTagHint: 'Ajouter @home ou @work…',
    priorityLabel: { urgent: 'urgent', high: 'élevé', medium: 'moyen', low: 'bas' },
    minutesSuffix: 'min',
    alertEmpty: 'Veuillez parler ou écrire quelque chose d’abord.',
    errNotSupported: 'Voix non prise en charge dans ce navigateur.',
    errNotAvailable: 'Reconnaissance vocale non disponible sur cet appareil.',
    errMicDenied: 'Accès au micro refusé. Activez-le dans les paramètres.',
    contexts: { home: 'Maison', work: 'Travail', call: 'Appel', computer: 'Travail profond', errand: 'Courses', health: 'Santé' },
  },
  ar: {
    speakYourTask: 'تحدّث بمهمتك',
    typeYourTask: 'اكتب مهمتك',
    statusHearing: 'أسمعك…',
    statusListening: 'يستمع — تحدث الآن',
    statusTapMic: 'اضغط الميكروفون للبدء',
    voiceBtn: 'صوت',
    typeBtn: 'كتابة',
    voicePlaceholder: 'ستظهر كلماتك هنا — يمكنك التعديل…',
    typePlaceholder: 'مثال: أنهِ التقرير غداً 3 مساءً عاجل @work',
    smartParse: 'تحليل ذكي',
    matchSuffix: 'تطابق',
    addTagHint: 'أضف @home أو @work…',
    priorityLabel: { urgent: 'عاجل', high: 'عالي', medium: 'متوسط', low: 'منخفض' },
    minutesSuffix: 'دقيقة',
    alertEmpty: 'الرجاء التحدث أو الكتابة أولاً.',
    errNotSupported: 'الصوت غير مدعوم في هذا المتصفح.',
    errNotAvailable: 'التعرف على الصوت غير متاح على هذا الجهاز.',
    errMicDenied: 'تم رفض إذن الميكروفون. فعّله من إعدادات الجهاز.',
    contexts: { home: 'المنزل', work: 'العمل', call: 'مكالمة', computer: 'عمل عميق', errand: 'مشاوير', health: 'الصحة' },
  },
};

function getContextMeta(id: string, copy: typeof COPY.en) {
  const found = CONTEXT_DEFINITIONS.find((c) => c.id === id);
  if (!found) return { emoji: '🏷️', label: id };
  return { emoji: found.emoji, label: copy.contexts[id] ?? found.label };
}

/** Concatenate two strings, removing overlap between the tail of `a` and the head of `b`. */
function mergeOverlap(a: string, b: string): string {
  const A = a.trim();
  const B = b.trim();
  if (!B) return A;
  if (!A) return B;

  // Full containment
  const aLow = A.toLowerCase();
  const bLow = B.toLowerCase();
  if (aLow.includes(bLow)) return A;
  if (bLow.includes(aLow)) return B;

  const aWords = A.split(/\s+/);
  const bWords = B.split(/\s+/);
  const maxOverlap = Math.min(aWords.length, bWords.length);
  for (let overlap = maxOverlap; overlap > 0; overlap--) {
    const aTail = aWords.slice(-overlap).join(' ').toLowerCase();
    const bHead = bWords.slice(0, overlap).join(' ').toLowerCase();
    if (aTail === bHead) {
      const remainder = bWords.slice(overlap).join(' ');
      return remainder ? `${A} ${remainder}` : A;
    }
  }
  return `${A} ${B}`;
}

export const VoiceTaskModal: React.FC<VoiceTaskModalProps> = ({
  isOpen, onClose, quadrant = 'do_first', onAddTask,
}) => {
  const { t, language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const [step, setStep] = useState<'select' | 'speak'>('select');
  const [mode, setMode] = useState<'voice' | 'type'>('voice');
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantId>(quadrant);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const fullTextRef = useRef('');
  /**
   * Text committed BEFORE the current recognition session started.
   * For the native plugin (which returns accumulated partials per session),
   * we replace the current session's contribution on top of this base.
   */
  const sessionBaseRef = useRef('');
  const wantListeningRef = useRef(false);
  const webRecogRef = useRef<any>(null);
  const nativePartialRef = useRef<any>(null);
  const nativeStateRef = useRef<any>(null);
  const langRef = useRef('en-US');
  const lastActivityRef = useRef(Date.now());
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);

  const theme = QUADRANTS.find((q) => q.id === selectedQuadrant)!;
  const isNative = Capacitor.isNativePlatform();

  const syncTranscript = () => setTranscript(fullTextRef.current);

  const markSpeaking = () => {
    setIsSpeaking(true);
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    speakingTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setIsSpeaking(false);
    }, 1400);
  };

  const attachNativeListeners = async () => {
    nativePartialRef.current = await SpeechRecognition.addListener('partialResults', (data: any) => {
      if (!isMountedRef.current) return;
      if (!data.matches || data.matches.length === 0) return;
      // `matches[0]` is the ACCUMULATED transcript for the CURRENT session.
      const sessionText = dedupeWords((data.matches[0] || '').trim());
      if (!sessionText || isHallucination(sessionText)) return;
      // Rebuild: base (previous sessions) + this session's accumulated text.
      fullTextRef.current = mergeOverlap(sessionBaseRef.current, sessionText);
      lastActivityRef.current = Date.now();
      syncTranscript();
      markSpeaking();
    });

    nativeStateRef.current = await SpeechRecognition.addListener('listeningState', (data: any) => {
      if (!isMountedRef.current) return;
      const status = data?.status;
      if (status === 'started') {
        setIsListening(true);
        startingRef.current = false;
        lastActivityRef.current = Date.now();
      }
      if (status === 'stopped') {
        setIsListening(false);
        setIsSpeaking(false);
        startingRef.current = false;
        // Commit what this session produced so the next session builds on it.
        sessionBaseRef.current = fullTextRef.current;
        if (wantListeningRef.current && isMountedRef.current) scheduleRestart(400);
      }
    });
  };

  const detachNativeListeners = () => {
    if (nativePartialRef.current) {
      try { nativePartialRef.current.remove(); } catch {}
      nativePartialRef.current = null;
    }
    if (nativeStateRef.current) {
      try { nativeStateRef.current.remove(); } catch {}
      nativeStateRef.current = null;
    }
  };

  const scheduleRestart = (delayMs: number) => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      if (!wantListeningRef.current) return;
      void startNativeOnce();
    }, delayMs);
  };

  const startNativeOnce = async () => {
    if (!isMountedRef.current || startingRef.current) return;
    if (!wantListeningRef.current) return;
    startingRef.current = true;
    // Snapshot current text as the session base BEFORE this session starts.
    sessionBaseRef.current = fullTextRef.current;
    try {
      await SpeechRecognition.start({
        language: langRef.current,
        maxResults: 1,
        partialResults: true,
        popup: false,
      });
      if (isMountedRef.current) {
        setIsListening(true);
        lastActivityRef.current = Date.now();
      }
      startingRef.current = false;
    } catch {
      startingRef.current = false;
      if (!wantListeningRef.current) return;
      scheduleRestart(800);
    }
  };

  const stopNative = async () => {
    wantListeningRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try { await SpeechRecognition.stop(); } catch {}
    setIsListening(false);
    setIsSpeaking(false);
  };

  const stopWeb = () => {
    wantListeningRef.current = false;
    const recog = webRecogRef.current;
    webRecogRef.current = null;
    if (recog) {
      try { recog.onresult = null; recog.onerror = null; recog.onend = null; recog.abort(); } catch {}
    }
    setIsListening(false);
    setIsSpeaking(false);
  };

  const startWebOnce = () => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      setVoiceError(copy.errNotSupported);
      return;
    }
    try { webRecogRef.current?.abort?.(); } catch {}

    wantListeningRef.current = true;
    langRef.current = SPEECH_LANG[language] || 'en-US';

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = langRef.current;
    recog.maxAlternatives = 1;

    recog.onresult = (event: any) => {
      if (!isMountedRef.current) return;
      // Rebuild the session transcript from event.results (the source of truth).
      // Interim results get REPLACED as the recognizer learns more, so we
      // never want to append them across events.
      let sessionText = '';
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        const txt = (res[0]?.transcript || '').trim();
        if (!txt || isHallucination(txt)) continue;
        sessionText = mergeOverlap(sessionText, txt);
      }
      sessionText = dedupeWords(sessionText);
      fullTextRef.current = mergeOverlap(sessionBaseRef.current, sessionText);
      lastActivityRef.current = Date.now();
      syncTranscript();
      if (sessionText) markSpeaking();
    };
    recog.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[Voice] Web error:', event.error);
      }
    };
    recog.onend = () => {
      if (!isMountedRef.current) return;
      setIsListening(false);
      setIsSpeaking(false);
      // Commit this session's text and start a new base for the next session.
      sessionBaseRef.current = fullTextRef.current;
      if (wantListeningRef.current) {
        setTimeout(() => {
          if (wantListeningRef.current && isMountedRef.current) {
            try { recog.start(); setIsListening(true); } catch {}
          }
        }, 250);
      }
    };
    webRecogRef.current = recog;
    try { recog.start(); setIsListening(true); } catch (e) {
      console.warn('[Voice] Web start failed:', e);
    }
  };

  const startListeningSession = async () => {
    setVoiceError(null);

    if (isNative) {
      try {
        const available = await SpeechRecognition.available();
        if (!available.available) {
          setVoiceError(copy.errNotAvailable);
          return;
        }
        const perm = await SpeechRecognition.requestPermissions();
        if (perm.speechRecognition !== 'granted') {
          setVoiceError(copy.errMicDenied);
          return;
        }
      } catch (err) {
        console.warn('[Voice] Permission check failed:', err);
      }

      wantListeningRef.current = true;
      langRef.current = SPEECH_LANG[language] || 'en-US';
      lastActivityRef.current = Date.now();
      await attachNativeListeners();
      setIsListening(true);
      startWatchdog();
      void startNativeOnce();
    } else {
      wantListeningRef.current = true;
      startWebOnce();
    }
  };

  const stopListeningSession = async () => {
    if (isNative) {
      await stopNative();
    } else {
      stopWeb();
    }
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  const startWatchdog = () => {
    if (watchdogRef.current) clearInterval(watchdogRef.current);
    watchdogRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      if (!wantListeningRef.current) return;
      if (startingRef.current) return;
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs > 12000 && !isListening) {
        lastActivityRef.current = Date.now();
        void startNativeOnce();
      }
    }, 2000);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      wantListeningRef.current = false;
      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (watchdogRef.current) clearInterval(watchdogRef.current);
      detachNativeListeners();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setMode('voice');
      setSelectedQuadrant(quadrant);
      setTranscript('');
      fullTextRef.current = '';
      sessionBaseRef.current = '';
      wantListeningRef.current = false;
      setIsListening(false);
      setIsSpeaking(false);
      setVoiceError(null);
    } else {
      void stopListeningSession();
    }
    // eslint-disable-next-line
  }, [isOpen]);

  const handleSelectQuadrant = (qId: QuadrantId) => {
    setSelectedQuadrant(qId);
    setStep('speak');
    setTranscript('');
    fullTextRef.current = '';
    sessionBaseRef.current = '';
    setIsSpeaking(false);
    setVoiceError(null);
    if (mode === 'voice') {
      setTimeout(() => { void startListeningSession(); }, 250);
    }
  };

  const handleToggleMic = () => {
    if (isListening || wantListeningRef.current) {
      void stopListeningSession();
    } else {
      void startListeningSession();
    }
  };

  const handleAdd = () => {
    const finalText = dedupeWords(fullTextRef.current.trim());
    if (!finalText) {
      alert(copy.alertEmpty);
      return;
    }
    const parsed = parseSpokenTask(finalText);
    const capitalized = parsed.title.charAt(0).toUpperCase() + parsed.title.slice(1);
    onAddTask({
      title: capitalized,
      description: parsed.description,
      quadrant: selectedQuadrant,
      priority: parsed.priority,
      category: parsed.category,
      contexts: parsed.contexts,
      estimatedMinutes: parsed.estimatedMinutes,
      dueDate: parsed.dueDate,
    });
    void stopListeningSession();
    setTranscript('');
    fullTextRef.current = '';
    sessionBaseRef.current = '';
    onClose();
  };

  const handleBack = () => {
    void stopListeningSession();
    setTranscript('');
    fullTextRef.current = '';
    sessionBaseRef.current = '';
    setVoiceError(null);
    setStep('select');
  };

  const handleCancel = () => {
    void stopListeningSession();
    setTranscript('');
    fullTextRef.current = '';
    sessionBaseRef.current = '';
    setVoiceError(null);
    onClose();
  };

  const handleClear = () => {
    setTranscript('');
    fullTextRef.current = '';
    sessionBaseRef.current = '';
  };

  const handleManualEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTranscript(value);
    fullTextRef.current = value;
    sessionBaseRef.current = value;
  };

  const getQuadrantName = (id: QuadrantId) => t(`quad_${id}`);

  const preview = transcript.trim() ? parseSpokenTask(transcript) : null;
  const previewContexts = preview?.contexts || [];

  const listeningNow = isListening || wantListeningRef.current;
  const statusLabel = isSpeaking
    ? copy.statusHearing
    : listeningNow
    ? copy.statusListening
    : copy.statusTapMic;
  const statusDotClass = isSpeaking
    ? 'animate-pulse bg-red-500'
    : listeningNow
    ? 'bg-emerald-500'
    : 'bg-slate-400';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCancel}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-white dark:bg-slate-800 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.4)] max-h-[90vh] overflow-y-auto"
          >
            <button onClick={step === 'speak' ? handleBack : handleCancel}
              className="absolute left-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-transform hover:scale-110"
            >
              <X size={16} strokeWidth={2.5} />
            </button>

            <AnimatePresence mode="wait">
              {step === 'select' ? (
                <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <h2 className="mb-1 text-center text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white">{t('ptt_drawer_title')}</h2>
                  <p className="mb-4 text-center text-[12px] font-medium text-slate-500 dark:text-slate-400">{t('matrix_quick_add').replace('{quadrant}', '')}</p>

                  <div className="mb-4 flex justify-center">
                    <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1 gap-1">
                      <button
                        onClick={() => setMode('voice')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          mode === 'voice'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Mic size={13} />
                        {copy.voiceBtn}
                      </button>
                      <button
                        onClick={() => setMode('type')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          mode === 'type'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Keyboard size={13} />
                        {copy.typeBtn}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {QUADRANTS.map((q) => {
                      const Icon = q.icon;
                      return (
                        <button key={q.id} onClick={() => handleSelectQuadrant(q.id)}
                          className={`flex flex-col items-center gap-2 rounded-2xl border-2 ${q.border} ${q.bg} dark:border-slate-700 dark:bg-slate-900 p-4 transition-all hover:scale-[1.03] active:scale-95 cursor-pointer`}
                        >
                          <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${q.gradient} shadow-lg`}>
                            <Icon size={22} className="text-white" />
                          </div>
                          <span className={`text-[12px] font-bold ${q.text} dark:text-slate-200`}>{getQuadrantName(q.id)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={handleCancel} className="mt-5 w-full py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 transition-opacity hover:opacity-70 cursor-pointer">
                    {t('modal_btn_cancel')}
                  </button>
                </motion.div>
              ) : (
                <motion.div key="speak" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-center text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {mode === 'voice' ? copy.speakYourTask : copy.typeYourTask}
                  </h2>
                  <p className={`mb-3 text-center text-[10px] font-extrabold uppercase tracking-[3px] ${theme.text} dark:text-slate-300`}>
                    → {getQuadrantName(selectedQuadrant)}
                  </p>

                  {mode === 'voice' && (
                    <>
                      <div className="relative mx-auto mb-3 h-[76px] w-[76px]">
                        {isSpeaking && (
                          <motion.div
                            animate={{ scale: [0.9, 1.4, 0.9], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 1.8, repeat: Infinity }}
                            className={`absolute inset-[-8px] rounded-full border-2 ${theme.border} dark:border-slate-600`}
                          />
                        )}
                        <button
                          onClick={handleToggleMic}
                          className={`flex h-full w-full items-center justify-center rounded-full transition-transform active:scale-95 cursor-pointer shadow-lg ${
                            listeningNow
                              ? `bg-gradient-to-br ${theme.gradient}`
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        >
                          {listeningNow ? (
                            <Mic size={34} strokeWidth={2.5} className="text-white" />
                          ) : (
                            <MicOff size={32} strokeWidth={2.5} className="text-slate-500 dark:text-slate-300" />
                          )}
                        </button>
                      </div>

                      <div className="mb-3 flex justify-center">
                        <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${
                          listeningNow
                            ? `${theme.bg} dark:bg-slate-700 ${theme.border} dark:border-slate-600 ${theme.text} dark:text-white`
                            : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`} />
                          {statusLabel}
                        </div>
                      </div>

                      {isSpeaking && (
                        <div className="mb-3 flex h-[36px] items-center justify-center gap-1">
                          {[12, 28, 18, 38, 24, 44].map((h, i) => (
                            <motion.span
                              key={i}
                              animate={{ scaleY: [0.4, 1.1, 0.4], opacity: [0.6, 1, 0.6] }}
                              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.08 }}
                              style={{ height: `${h}px` }}
                              className={`w-1 rounded-sm bg-gradient-to-t ${theme.gradient}`}
                            />
                          ))}
                        </div>
                      )}

                      {voiceError && (
                        <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-[11px] text-rose-700 dark:text-rose-300">
                          {voiceError}
                        </div>
                      )}
                    </>
                  )}

                  <div className="relative mb-3">
                    <textarea
                      value={transcript}
                      onChange={handleManualEdit}
                      placeholder={mode === 'voice' ? copy.voicePlaceholder : copy.typePlaceholder}
                      rows={3}
                      className={`w-full resize-none rounded-2xl border-[1.5px] p-3 pe-10 text-start text-[13px] font-medium outline-none ${theme.bg} dark:bg-slate-700/50 ${theme.border} dark:border-slate-600 ${theme.text} dark:text-white`}
                    />
                    {transcript && (
                      <button onClick={handleClear}
                        className={`absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full ${theme.bg} dark:bg-slate-700 ${theme.text} dark:text-white cursor-pointer`}
                        title={t('ptt_clear')}
                      >
                        <Eraser size={13} />
                      </button>
                    )}
                  </div>

                  {preview && (
                    <div className="mb-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 dark:from-indigo-950/40 dark:to-violet-950/30 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                          {copy.smartParse}
                        </span>
                        <span className="ms-auto text-[10px] font-bold text-indigo-500 dark:text-indigo-400">
                          {copy.matchSuffix} {preview.confidenceScore}%
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <div className="inline-flex items-center gap-1 rounded-full bg-white/90 dark:bg-slate-800/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <Calendar className="w-2.5 h-2.5 text-rose-500" />
                          {new Date(preview.dueDate).toLocaleString(
                            lang === 'ar' ? 'ar-EG' : lang === 'fr' ? 'fr-FR' : 'en-US',
                            { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
                          )}
                        </div>

                        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          preview.priority === 'urgent' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                          : preview.priority === 'high' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
                          : preview.priority === 'medium' ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          🔥 {copy.priorityLabel[preview.priority]}
                        </div>

                        <div className="inline-flex items-center gap-1 rounded-full bg-white/90 dark:bg-slate-800/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <Clock className="w-2.5 h-2.5 text-indigo-500" />
                          {preview.estimatedMinutes} {copy.minutesSuffix}
                        </div>

                        {previewContexts.map((ctxId) => {
                          const meta = getContextMeta(ctxId, copy);
                          return (
                            <div key={ctxId} className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-950/60 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-900/60">
                              {meta.emoji} {meta.label}
                            </div>
                          );
                        })}

                        {previewContexts.length === 0 && (
                          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100/70 dark:bg-slate-800/60 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-700">
                            <Tag className="w-2.5 h-2.5" />
                            {copy.addTagHint}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleAdd}
                    disabled={!transcript.trim()}
                    className={`mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br ${theme.gradient} py-3.5 text-base font-extrabold text-white shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer`}
                  >
                    <Check size={18} strokeWidth={3} />
                    {t('ptt_add_task_btn')}
                  </button>

                  <button onClick={handleBack} className={`w-full py-2.5 text-sm font-semibold ${theme.text} dark:text-slate-300 transition-opacity hover:opacity-70 cursor-pointer`}>
                    ← {t('modal_btn_cancel')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};