import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Check, X, Flame, Calendar, Users, Trash2, Eraser } from 'lucide-react';
import { QuadrantId } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { parseSpokenTask } from '../utils/voiceParser';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';

interface VoiceTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  quadrant?: QuadrantId;
  onAddTask: (taskText: string, quadrant: QuadrantId, dueDate?: string) => void;
}

const QUADRANTS = [
  { id: 'do_first' as QuadrantId,  name: 'Do First',  icon: Flame,    gradient: 'from-rose-500 to-red-600',         bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700' },
  { id: 'schedule' as QuadrantId,  name: 'Schedule',  icon: Calendar, gradient: 'from-indigo-500 to-indigo-700',   bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700' },
  { id: 'delegate' as QuadrantId,  name: 'Delegate',  icon: Users,    gradient: 'from-emerald-500 to-emerald-700',  bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  { id: 'eliminate' as QuadrantId, name: 'Eliminate', icon: Trash2,   gradient: 'from-slate-500 to-slate-700',      bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-700' },
];

const SPEECH_LANG: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  ar: 'ar-SA',
};

export const VoiceTaskModal: React.FC<VoiceTaskModalProps> = ({
  isOpen,
  onClose,
  quadrant = 'do_first',
  onAddTask,
}) => {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<'select' | 'speak'>('select');
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantId>(quadrant);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const sessionActiveRef = useRef(false);
  const nativePartialListenerRef = useRef<any>(null);

  const theme = QUADRANTS.find((q) => q.id === selectedQuadrant)!;
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (nativePartialListenerRef.current) {
        try { nativePartialListenerRef.current.remove(); } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedQuadrant(quadrant);
      setTranscript('');
      sessionActiveRef.current = false;
    } else {
      killRecognition();
    }
    // eslint-disable-next-line
  }, [isOpen]);

  const killRecognition = async () => {
    sessionActiveRef.current = false;

    // Stop native speech recognition
    if (isNative) {
      try { await SpeechRecognition.stop(); } catch (e) {}
      if (nativePartialListenerRef.current) {
        try { nativePartialListenerRef.current.remove(); } catch (e) {}
        nativePartialListenerRef.current = null;
      }
    }

    // Stop web speech recognition
    const recog = recognitionRef.current;
    recognitionRef.current = null;
    if (recog) {
      recog.onresult = null;
      recog.onerror = null;
      recog.onend = null;
      try { recog.abort(); } catch (e) {}
      try { recog.stop(); } catch (e) {}
    }

    if (isMountedRef.current) setIsListening(false);
  };

  const startRecognitionNative = async () => {
    try {
      const available = await SpeechRecognition.available();
      if (!available.available) {
        alert('Voice not supported on this device.');
        return;
      }

      const perm = await SpeechRecognition.requestPermissions();
      if (perm.speechRecognition !== 'granted') {
        alert('Microphone permission denied. Please enable it in phone settings.');
        return;
      }

      sessionActiveRef.current = true;

      nativePartialListenerRef.current = await SpeechRecognition.addListener(
        'partialResults',
        (data: any) => {
          if (!isMountedRef.current || !sessionActiveRef.current) return;
          if (data.matches && data.matches.length > 0) {
            const text = data.matches[0];
            if (text) setTranscript(text);
          }
        }
      );

      await SpeechRecognition.start({
        language: SPEECH_LANG[language] || 'en-US',
        maxResults: 1,
        prompt: t('ptt_listening'),
        partialResults: true,
        popup: false,
      });

      if (isMountedRef.current) setIsListening(true);
    } catch (err) {
      console.error('Native speech error:', err);
      if (isMountedRef.current) setIsListening(false);
    }
  };

  const startRecognitionWeb = () => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      alert('Voice not supported. Please type instead.');
      return;
    }

    killRecognition();
    sessionActiveRef.current = true;

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = false;
    recog.lang = SPEECH_LANG[language] || 'en-US';
    recog.maxAlternatives = 1;

    recog.onresult = (event: any) => {
      if (!isMountedRef.current || !sessionActiveRef.current) return;
      const results = event.results;
      if (!results || results.length === 0) return;

      const newFinals: string[] = [];
      for (let i = event.resultIndex; i < results.length; i++) {
        if (results[i].isFinal) {
          const text = results[i][0]?.transcript?.trim();
          if (text) newFinals.push(text);
        }
      }

      if (newFinals.length > 0) {
        setTranscript((prev) => {
          const base = prev.trim();
          const addition = newFinals.join(' ');
          return base ? `${base} ${addition}` : addition;
        });
      }
    };

    recog.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Speech error:', event.error);
      }
    };

    recog.onend = () => {
      if (isMountedRef.current && sessionActiveRef.current) {
        setIsListening(false);
      }
    };

    recognitionRef.current = recog;
    try {
      recog.start();
      if (isMountedRef.current) setIsListening(true);
    } catch (e) {
      console.warn('Failed to start:', e);
    }
  };

  const startRecognition = () => {
    if (isNative) {
      startRecognitionNative();
    } else {
      startRecognitionWeb();
    }
  };

  const handleSelectQuadrant = (qId: QuadrantId) => {
    setSelectedQuadrant(qId);
    setStep('speak');
    setTranscript('');
    setTimeout(() => startRecognition(), 250);
  };

  const handleAdd = () => {
    const text = transcript.trim();
    if (!text) {
      alert('Please speak or type something first.');
      return;
    }
    const parsed = parseSpokenTask(text);
    const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
    onAddTask(capitalized, selectedQuadrant, parsed.dueDate);
    killRecognition();
    setTranscript('');
    onClose();
  };

  const handleBack = () => {
    killRecognition();
    setTranscript('');
    setStep('select');
  };

  const handleCancel = () => {
    killRecognition();
    setTranscript('');
    onClose();
  };

  const handleClear = () => {
    setTranscript('');
  };

  const handleResume = () => {
    startRecognition();
  };

  const getQuadrantName = (id: QuadrantId) => t(`quad_${id}`);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-50 w-[88%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-white dark:bg-slate-800 p-7 shadow-[0_30px_80px_rgba(15,23,42,0.4)]"
          >
            <button
              onClick={step === 'speak' ? handleBack : handleCancel}
              className="absolute left-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-transform hover:scale-110"
            >
              <X size={16} strokeWidth={2.5} />
            </button>

            <AnimatePresence mode="wait">
              {step === 'select' ? (
                <motion.div
                  key="select"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="mb-1 text-center text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {t('ptt_drawer_title')}
                  </h2>
                  <p className="mb-6 text-center text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    {t('matrix_quick_add').replace('{quadrant}', '')}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {QUADRANTS.map((q) => {
                      const Icon = q.icon;
                      return (
                        <button
                          key={q.id}
                          onClick={() => handleSelectQuadrant(q.id)}
                          className={`flex flex-col items-center gap-2 rounded-2xl border-2 ${q.border} ${q.bg} dark:border-slate-700 dark:bg-slate-900 p-4 transition-all hover:scale-[1.03] active:scale-95`}
                        >
                          <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${q.gradient} shadow-lg`}>
                            <Icon size={22} className="text-white" />
                          </div>
                          <span className={`text-[12px] font-bold ${q.text} dark:text-slate-200`}>
                            {getQuadrantName(q.id)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleCancel}
                    className="mt-5 w-full py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 transition-opacity hover:opacity-70"
                  >
                    {t('modal_btn_cancel')}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="speak"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-center text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {t('ptt_listening').split('...')[0]}
                  </h2>
                  <p className={`mb-4 text-center text-[10px] font-extrabold uppercase tracking-[3px] ${theme.text} dark:text-slate-300`}>
                    → {getQuadrantName(selectedQuadrant)}
                  </p>

                  <div className="relative mx-auto mb-3 h-[72px] w-[72px]">
                    {isListening && (
                      <motion.div
                        animate={{ scale: [0.9, 1.4, 0.9], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                        className={`absolute inset-[-8px] rounded-full border-2 ${theme.border} dark:border-slate-600`}
                      />
                    )}
                    <button
                      onClick={isListening ? killRecognition : handleResume}
                      className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${theme.gradient} shadow-lg transition-transform active:scale-95`}
                    >
                      <Mic size={32} strokeWidth={2.5} className="text-white" />
                    </button>
                  </div>

                  <div className="mb-3 flex justify-center">
                    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${theme.bg} dark:bg-slate-700 ${theme.border} dark:border-slate-600 ${theme.text} dark:text-white`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isListening ? 'animate-pulse bg-red-500' : 'bg-slate-400'}`} />
                      {isListening ? t('ptt_listening').split('.')[0] + '...' : 'Tap mic'}
                    </div>
                  </div>

                  {isListening && (
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

                  <div className="relative mb-3">
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder={t('ptt_write_placeholder')}
                      rows={3}
                      dir="ltr"
                      className={`w-full resize-none rounded-2xl border-[1.5px] p-3 pr-10 text-left text-[13px] font-medium outline-none ${theme.bg} dark:bg-slate-700/50 ${theme.border} dark:border-slate-600 ${theme.text} dark:text-white`}
                    />
                    {transcript && (
                      <button
                        onClick={handleClear}
                        className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full ${theme.bg} dark:bg-slate-700 ${theme.text} dark:text-white`}
                        title={t('ptt_clear')}
                      >
                        <Eraser size={13} />
                      </button>
                    )}
                  </div>

                  {transcript && (
                    <div className="mb-3 flex items-center justify-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-200">
                      <Calendar size={12} />
                      {new Date(parseSpokenTask(transcript).dueDate).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  )}

                  <p className="mb-3 text-center text-[11px] font-medium text-slate-500 dark:text-slate-300">
                    {t('ptt_release_tip')}
                  </p>

                  <button
                    onClick={handleAdd}
                    disabled={!transcript.trim()}
                    className={`mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br ${theme.gradient} py-3.5 text-base font-extrabold text-white shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <Check size={18} strokeWidth={3} />
                    {t('ptt_add_task_btn')}
                  </button>

                  <button
                    onClick={handleBack}
                    className={`w-full py-2.5 text-sm font-semibold ${theme.text} dark:text-slate-300 transition-opacity hover:opacity-70`}
                  >
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