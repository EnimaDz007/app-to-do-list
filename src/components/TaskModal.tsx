import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Clock, Target, Dumbbell, Mic, MicOff, Sparkles } from 'lucide-react';
import { Task, QuadrantId, TaskCategory, PriorityLevel } from '../types';
import { QUADRANT_CONFIGS } from '../data/initialTasks';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../i18n/translations';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseSpokenTask } from '../utils/voiceParser';
import { playVoiceCue } from '../utils/notifications';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => void;
  editingTask?: Task | null;
  defaultQuadrant?: QuadrantId;
}

// Helper: Convert a Date object to a local datetime-local string (YYYY-MM-DDTHH:MM)
function dateToLocalInputString(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

// Helper: Convert a datetime-local string (local time) into an ISO UTC string for storage
function localInputStringToISO(localStr: string): string {
  if (!localStr) return new Date().toISOString();
  return new Date(localStr).toISOString();
}

// ✅ Helper: Detect relative time expressions in the transcript ("in 3 minutes", "dans 5 min", "بعد 10 دقائق")
function extractRelativeTime(text: string): Date | null {
  const lower = text.toLowerCase();

  const patterns: { regex: RegExp; unit: 'min' | 'hour' }[] = [
    { regex: /\bin\s+(\d+)\s*(?:min|minute|minutes)\b/i, unit: 'min' },
    { regex: /\bin\s+(\d+)\s*(?:h|hr|hour|hours)\b/i, unit: 'hour' },
    { regex: /\bdans\s+(\d+)\s*(?:min|minute|minutes)\b/i, unit: 'min' },
    { regex: /\bdans\s+(\d+)\s*(?:h|hr|heure|heures)\b/i, unit: 'hour' },
    { regex: /بعد\s+(\d+)\s*(?:دقيقة|دقائق|دقيقه)\b/, unit: 'min' },
    { regex: /بعد\s+(\d+)\s*(?:ساعة|ساعات|ساعه)\b/, unit: 'hour' },
  ];

  for (const { regex, unit } of patterns) {
    const match = lower.match(regex);
    if (match) {
      const amount = parseInt(match[1], 10);
      if (isNaN(amount)) continue;
      const result = new Date();
      if (unit === 'min') {
        result.setMinutes(result.getMinutes() + amount);
      } else {
        result.setHours(result.getHours() + amount);
      }
      console.log(`⏱️ Voice: detected relative time → +${amount} ${unit}(s)`);
      return result;
    }
  }

  return null;
}

// ✅ Helper: Remove the relative time expression from the transcript (so the title stays clean)
function stripRelativeTime(text: string): string {
  return text
    .replace(/\bin\s+\d+\s*(?:min|minute|minutes|h|hr|hour|hours)\b/i, '')
    .replace(/\bdans\s+\d+\s*(?:min|minute|minutes|h|hr|heure|heures)\b/i, '')
    .replace(/بعد\s+\d+\s*(?:دقيقة|دقائق|دقيقه|ساعة|ساعات|ساعه)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  editingTask,
  defaultQuadrant = 'do_first',
}) => {
  const { language, t, isRTL } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quadrant, setQuadrant] = useState<QuadrantId>(defaultQuadrant);
  const [category, setCategory] = useState<TaskCategory>('Engineering');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);

  // ✅ Track if the user has manually edited the title.
  // When true, the voice transcript effect will NOT overwrite it.
  const userEditedTitleRef = useRef(false);

  // Default due date: 15 minutes from now
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    return dateToLocalInputString(d);
  });

  const [impactScore, setImpactScore] = useState<number>(4);
  const [effortScore, setEffortScore] = useState<number>(2);

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    restartListening,
    resetTranscript,
  } = useSpeechRecognition();

  const stopListeningRef = useRef(stopListening);
  const resetTranscriptRef = useRef(resetTranscript);
  useEffect(() => {
    stopListeningRef.current = stopListening;
    resetTranscriptRef.current = resetTranscript;
  });

  const speechLangMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    ar: 'ar-SA',
  };

  // ✅ Sync speech into title and auto-detect category, quadrant & relative time
  useEffect(() => {
    if (!transcript) return;

    // 🔑 If the user typed something manually, don't overwrite it
    if (userEditedTitleRef.current) {
      console.log('[TaskModal] 🚫 user edited title — skipping voice→title sync');
      return;
    }

    const relativeTime = extractRelativeTime(transcript);
    const cleanedTranscript = relativeTime ? stripRelativeTime(transcript) : transcript;
    const parsed = parseSpokenTask(cleanedTranscript);

    setTitle(parsed.title || cleanedTranscript || transcript);
    if (parsed.description) {
      setDescription(parsed.description);
    }
    setCategory(parsed.category);
    setQuadrant(parsed.quadrant);
    if (parsed.estimatedMinutes) {
      setEstimatedMinutes(parsed.estimatedMinutes);
    }

    if (relativeTime) {
      setDueDate(dateToLocalInputString(relativeTime));
    } else if (parsed.dueDate) {
      setDueDate(parsed.dueDate);
    }
  }, [transcript]);

  // ✅ Reset form fields when the modal opens (but do NOT touch the mic here)
  useEffect(() => {
    if (!isOpen) return;

    // 🔑 Reset the "user edited" flag when the modal opens fresh
    userEditedTitleRef.current = false;

    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setQuadrant(editingTask.quadrant);
      setCategory(editingTask.category);
      setEstimatedMinutes(editingTask.estimatedMinutes);

      setDueDate(() => {
        const d = editingTask.dueDate
          ? new Date(editingTask.dueDate)
          : new Date(Date.now() + 15 * 60000);
        if (isNaN(d.getTime())) {
          return dateToLocalInputString(new Date(Date.now() + 15 * 60000));
        }
        return dateToLocalInputString(d);
      });

      setImpactScore(editingTask.impactScore || 3);
      setEffortScore(editingTask.effortScore || 2);
    } else {
      setTitle('');
      setDescription('');
      setQuadrant(defaultQuadrant);
      setCategory('Engineering');
      setEstimatedMinutes(30);

      setDueDate(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 15);
        return dateToLocalInputString(d);
      });

      setImpactScore(4);
      setEffortScore(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingTask, defaultQuadrant]);

  // ✅ AUTO-START: Begin always-on listening as soon as the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    if (!isSupported) return;

    stopListeningRef.current();
    resetTranscriptRef.current();

    const timer = setTimeout(() => {
      console.log('🎤 Modal opened — starting always-on mic.');
      startListening(speechLangMap[language] || 'en-US');
    }, 600);

    return () => {
      clearTimeout(timer);
      console.log('🛑 Modal closed — stopping mic.');
      stopListeningRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSupported, language]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    triggerHaptic('success');
    const priorityMap: Record<QuadrantId, PriorityLevel> = {
      do_first: 'urgent',
      schedule: 'high',
      delegate: 'medium',
      eliminate: 'low',
    };

    onSaveTask({
      id: editingTask ? editingTask.id : undefined,
      title: title.trim(),
      description: description.trim(),
      quadrant,
      priority: priorityMap[quadrant],
      category,
      status: editingTask ? editingTask.status : 'todo',
      estimatedMinutes,
      dueDate: localInputStringToISO(dueDate),
      impactScore,
      effortScore,
    });
    onClose();
  };

  const categories: TaskCategory[] = [
    'Engineering',
    'Operations',
    'Product',
    'Design',
    'Client',
    'Marketing',
    'Personal',
  ];

  const quadrantI18n: Record<QuadrantId, { titleKey: TranslationKey; subtitleKey: TranslationKey }> = {
    do_first: { titleKey: 'matrix_q1_title', subtitleKey: 'matrix_q1_subtitle' },
    schedule: { titleKey: 'matrix_q2_title', subtitleKey: 'matrix_q2_subtitle' },
    delegate: { titleKey: 'matrix_q3_title', subtitleKey: 'matrix_q3_subtitle' },
    eliminate: { titleKey: 'matrix_q4_title', subtitleKey: 'matrix_q4_subtitle' },
  };

  return (
    <div
      id="task-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="task-modal-container"
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 shadow-2xl text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {editingTask ? t('modal_title_edit') : t('modal_title_new')}
          </h3>
          <button
            id="btn-close-task-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-medium text-slate-700 dark:text-slate-300">
                {t('modal_field_title')} <span className="text-rose-500">*</span>
              </label>

              {/* ✅ Tappable mic — tap to restart if auto-restart fails */}
              <button
                id="btn-taskmodal-mic"
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  if (isListening) {
                    stopListening();
                  } else {
                    restartListening();
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white shadow-xs ring-2 ring-rose-500/30'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                }`}
                title={isListening ? 'Listening... tap to stop' : 'Tap to restart mic'}
              >
                <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-bounce' : ''}`} />
                <span>{isListening ? 'Listening...' : 'Tap to Talk'}</span>
              </button>
            </div>

            <div className="relative">
              <input
                id="input-task-title"
                type="text"
                required
                value={title}
                onChange={(e) => {
                  // 🔑 Mark that the user manually edited the title
                  userEditedTitleRef.current = true;
                  setTitle(e.target.value);
                }}
                placeholder={t('modal_field_title_placeholder')}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
              />
              {interimTranscript && (
                <div className="text-[11px] text-indigo-500 italic mt-1 px-1">
                  "{interimTranscript}..."
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('modal_field_description')}
            </label>
            <textarea
              id="input-task-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('modal_field_description_placeholder')}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Quadrant Selector */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t('modal_field_quadrant')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(QUADRANT_CONFIGS) as QuadrantId[]).map((qid) => {
                const conf = QUADRANT_CONFIGS[qid];
                const isSelected = quadrant === qid;
                const { titleKey, subtitleKey } = quadrantI18n[qid];

                return (
                  <button
                    key={qid}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setQuadrant(qid);
                    }}
                    className={`p-2.5 rounded-xl border text-left rtl:text-right transition cursor-pointer ${
                      isSelected
                        ? `${conf.badgeBg} ${conf.borderColor} border-2 ring-1 ring-indigo-500/30`
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 dark:text-white text-xs">{t(titleKey)}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{t(subtitleKey)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date & Time Picker */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>Due Date & Time</span>
              </span>
            </label>
            <input
              id="input-task-duedate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Tip: Say "remind me in 3 minutes" to auto-set the time. You'll get a silent alert 2 min before, and a loud alarm at the due time.
            </p>
          </div>

          {/* Category & Minutes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('modal_field_category')}
              </label>
              <select
                id="select-task-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`cat_${cat}` as TranslationKey) || cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>{t('modal_field_est_time')}</span>
                </span>
              </label>
              <input
                id="input-task-minutes"
                type="number"
                value={estimatedMinutes || ''}
                onChange={(e) => setEstimatedMinutes(e.target.value === '' ? 0 : parseInt(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Impact (1-5) and Effort (1-5) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <label className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 mb-1.5 font-medium">
                <span className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>{t('modal_field_impact', { score: impactScore })}</span>
                </span>
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setImpactScore(val)}
                    className={`flex-1 py-1 rounded-md text-xs font-mono transition cursor-pointer ${
                      impactScore === val
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <label className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 mb-1.5 font-medium">
                <span className="flex items-center gap-1">
                  <Dumbbell className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>{t('modal_field_effort', { score: effortScore })}</span>
                </span>
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setEffortScore(val)}
                    className={`flex-1 py-1 rounded-md text-xs font-mono transition cursor-pointer ${
                      effortScore === val
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition cursor-pointer"
            >
              {t('modal_btn_cancel')}
            </button>
            <button
              id="btn-submit-task-form"
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editingTask ? t('modal_btn_save') : t('modal_btn_create')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};