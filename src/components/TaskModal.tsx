import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Clock, Target, Dumbbell, Mic, Repeat, Calendar } from 'lucide-react';
import { Task, QuadrantId, TaskCategory, PriorityLevel, Recurrence, RecurrenceFrequency } from '../types';
import { QUADRANT_CONFIGS } from '../data/initialTasks';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../i18n/translations';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseSpokenTask } from '../utils/voiceParser';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => void;
  editingTask?: Task | null;
  defaultQuadrant?: QuadrantId;
}

function dateToLocalInputString(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}
function localInputStringToISO(localStr: string): string {
  if (!localStr) return new Date().toISOString();
  return new Date(localStr).toISOString();
}

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
      if (unit === 'min') result.setMinutes(result.getMinutes() + amount);
      else result.setHours(result.getHours() + amount);
      return result;
    }
  }
  return null;
}

function stripRelativeTime(text: string): string {
  return text
    .replace(/\bin\s+\d+\s*(?:min|minute|minutes|h|hr|hour|hours)\b/i, '')
    .replace(/\bdans\s+\d+\s*(?:min|minute|minutes|h|hr|heure|heures)\b/i, '')
    .replace(/بعد\s+\d+\s*(?:دقيقة|دقائق|دقيقه|ساعة|ساعات|ساعه)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeRecurrence(freq: RecurrenceFrequency | null, dueDateStr: string): Recurrence | undefined {
  if (!freq) return undefined;
  const base: Recurrence = { frequency: freq, interval: 1 };
  const d = dueDateStr ? new Date(dueDateStr) : new Date();
  if (freq === 'weekly') return { ...base, daysOfWeek: [d.getDay()] };
  if (freq === 'monthly') return { ...base, dayOfMonth: d.getDate() };
  return base;
}

function describeRecurrence(rec?: Recurrence): string {
  if (!rec) return 'Never';
  const n = rec.interval;
  switch (rec.frequency) {
    case 'daily': return n === 1 ? 'Every day' : `Every ${n} days`;
    case 'weekdays': return 'Every weekday (Mon–Fri)';
    case 'weekly': {
      const days = (rec.daysOfWeek || []).map((i) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]).join(', ');
      return n === 1 ? `Every week on ${days || '—'}` : `Every ${n} weeks on ${days || '—'}`;
    }
    case 'monthly': return n === 1 ? `Every month on day ${rec.dayOfMonth || '—'}` : `Every ${n} months on day ${rec.dayOfMonth || '—'}`;
    case 'yearly': return n === 1 ? 'Every year' : `Every ${n} years`;
  }
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen, onClose, onSaveTask, editingTask, defaultQuadrant = 'do_first',
}) => {
  const { language, t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quadrant, setQuadrant] = useState<QuadrantId>(defaultQuadrant);
  const [category, setCategory] = useState<TaskCategory>('Engineering');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [dueDate, setDueDate] = useState<string>('');
  const [impactScore, setImpactScore] = useState<number>(4);
  const [effortScore, setEffortScore] = useState<number>(2);
  const [recurrence, setRecurrence] = useState<Recurrence | undefined>(undefined);

  const userEditedTitleRef = useRef(false);

  // 🔑 manualMode = true → tap to talk, no auto-restart
  const {
    isSupported, isListening, transcript, interimTranscript,
    startListening, stopListening, resetTranscript,
  } = useSpeechRecognition(true);

  const speechLangMap: Record<string, string> = { en: 'en-US', fr: 'fr-FR', ar: 'ar-SA' };

  useEffect(() => {
    if (!isOpen) return;
    userEditedTitleRef.current = false;

    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setQuadrant(editingTask.quadrant);
      setCategory(editingTask.category);
      setEstimatedMinutes(editingTask.estimatedMinutes);
      setRecurrence(editingTask.recurrence);
      setDueDate(() => {
        const d = editingTask.dueDate ? new Date(editingTask.dueDate) : new Date(Date.now() + 15 * 60000);
        if (isNaN(d.getTime())) return dateToLocalInputString(new Date(Date.now() + 15 * 60000));
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
      setRecurrence(undefined);
      setDueDate(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 15);
        return dateToLocalInputString(d);
      });
      setImpactScore(4);
      setEffortScore(2);
    }

    // Reset transcript when the modal opens fresh
    resetTranscript();
    stopListening();
    // eslint-disable-next-line
  }, [isOpen, editingTask, defaultQuadrant]);

  // Sync transcript → title (only when user hasn't manually edited)
  useEffect(() => {
    if (!transcript) return;
    if (userEditedTitleRef.current) return;

    const relativeTime = extractRelativeTime(transcript);
    const cleanedTranscript = relativeTime ? stripRelativeTime(transcript) : transcript;
    const parsed = parseSpokenTask(cleanedTranscript);

    setTitle(parsed.title || cleanedTranscript || transcript);
    if (parsed.description) setDescription(parsed.description);
    setCategory(parsed.category);
    setQuadrant(parsed.quadrant);
    if (parsed.estimatedMinutes) setEstimatedMinutes(parsed.estimatedMinutes);

    if (relativeTime) setDueDate(dateToLocalInputString(relativeTime));
    else if (parsed.dueDate) setDueDate(parsed.dueDate);
  }, [transcript]);

  if (!isOpen) return null;

  const handleMicTap = () => {
    triggerHaptic('medium');
    if (isListening) {
      stopListening();
    } else {
      startListening(speechLangMap[language] || 'en-US');
    }
  };

  const handleFrequencyChange = (freq: RecurrenceFrequency | null) => {
    triggerHaptic('light');
    if (!freq) { setRecurrence(undefined); return; }
    setRecurrence(makeRecurrence(freq, dueDate));
  };

  const toggleDayOfWeek = (dayIdx: number) => {
    triggerHaptic('light');
    setRecurrence((prev) => {
      if (!prev || prev.frequency !== 'weekly') return prev;
      const current = prev.daysOfWeek || [];
      const has = current.includes(dayIdx);
      const next = has ? current.filter((d) => d !== dayIdx) : [...current, dayIdx].sort();
      if (next.length === 0) return undefined;
      return { ...prev, daysOfWeek: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    stopListening();
    triggerHaptic('success');
    const priorityMap: Record<QuadrantId, PriorityLevel> = {
      do_first: 'urgent', schedule: 'high', delegate: 'medium', eliminate: 'low',
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
      recurrence,
    });
    onClose();
  };

  const categories: TaskCategory[] = ['Engineering','Operations','Product','Design','Client','Marketing','Personal'];
  const quadrantI18n: Record<QuadrantId, { titleKey: TranslationKey; subtitleKey: TranslationKey }> = {
    do_first: { titleKey: 'matrix_q1_title', subtitleKey: 'matrix_q1_subtitle' },
    schedule: { titleKey: 'matrix_q2_title', subtitleKey: 'matrix_q2_subtitle' },
    delegate: { titleKey: 'matrix_q3_title', subtitleKey: 'matrix_q3_subtitle' },
    eliminate: { titleKey: 'matrix_q4_title', subtitleKey: 'matrix_q4_subtitle' },
  };
  const freqChips: { label: string; value: RecurrenceFrequency | null }[] = [
    { label: 'Never', value: null },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekdays', value: 'weekdays' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
  ];
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div id="task-modal-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-0 sm:p-4">
      <div id="task-modal-container" className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 shadow-2xl text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {editingTask ? t('modal_title_edit') : t('modal_title_new')}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Title + Mic */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-medium text-slate-700 dark:text-slate-300">
                {t('modal_field_title')} <span className="text-rose-500">*</span>
              </label>
              <button
                id="btn-taskmodal-mic"
                type="button"
                onClick={handleMicTap}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white shadow-xs ring-2 ring-rose-500/30'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                }`}
                title={isListening ? 'Tap to stop' : 'Tap to speak'}
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
                  userEditedTitleRef.current = true;
                  setTitle(e.target.value);
                }}
                placeholder={t('modal_field_title_placeholder')}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
              />
              {interimTranscript && (
                <div className="text-[11px] text-indigo-500 italic mt-1 px-1">"{interimTranscript}..."</div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">{t('modal_field_description')}</label>
            <textarea
              id="input-task-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('modal_field_description_placeholder')}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Quadrant */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('modal_field_quadrant')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(QUADRANT_CONFIGS) as QuadrantId[]).map((qid) => {
                const conf = QUADRANT_CONFIGS[qid];
                const isSelected = quadrant === qid;
                const { titleKey, subtitleKey } = quadrantI18n[qid];
                return (
                  <button
                    key={qid}
                    type="button"
                    onClick={() => { triggerHaptic('light'); setQuadrant(qid); }}
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

          {/* Due Date */}
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
          </div>

          {/* Recurrence */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1">
                <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                <span>Repeat</span>
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {freqChips.map((chip) => {
                const active = (chip.value === null && !recurrence) || (chip.value !== null && recurrence?.frequency === chip.value);
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleFrequencyChange(chip.value)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                      active ? 'bg-indigo-600 text-white border-indigo-600'
                             : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
            {recurrence?.frequency === 'weekly' && (
              <div className="mt-2 flex gap-1">
                {dayLabels.map((d, i) => {
                  const selected = (recurrence.daysOfWeek || []).includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDayOfWeek(i)}
                      className={`w-8 h-8 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        selected ? 'bg-indigo-600 text-white'
                                 : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            )}
            {recurrence && recurrence.frequency !== 'weekdays' && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <span>Every</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={recurrence.interval}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                    setRecurrence({ ...recurrence, interval: v });
                  }}
                  className="w-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <span>
                  {recurrence.frequency === 'daily' ? 'day(s)' :
                   recurrence.frequency === 'weekly' ? 'week(s)' :
                   recurrence.frequency === 'monthly' ? 'month(s)' : 'year(s)'}
                </span>
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{describeRecurrence(recurrence)}</span>
            </p>
          </div>

          {/* Category & Minutes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">{t('modal_field_category')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{t(`cat_${cat}` as TranslationKey) || cat}</option>
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
                type="number"
                value={estimatedMinutes || ''}
                onChange={(e) => setEstimatedMinutes(e.target.value === '' ? 0 : parseInt(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Impact / Effort */}
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
                  <button key={val} type="button" onClick={() => setImpactScore(val)}
                    className={`flex-1 py-1 rounded-md text-xs font-mono transition cursor-pointer ${
                      impactScore === val ? 'bg-indigo-600 text-white font-bold'
                                          : 'bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >{val}</button>
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
                  <button key={val} type="button" onClick={() => setEffortScore(val)}
                    className={`flex-1 py-1 rounded-md text-xs font-mono transition cursor-pointer ${
                      effortScore === val ? 'bg-amber-600 text-white font-bold'
                                          : 'bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >{val}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition cursor-pointer"
            >
              {t('modal_btn_cancel')}
            </button>
            <button type="submit"
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