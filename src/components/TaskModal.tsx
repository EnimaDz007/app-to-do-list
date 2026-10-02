import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Clock, Target, Dumbbell, Mic, Repeat, Calendar, Tag, Check, Share2, LayoutTemplate } from 'lucide-react';
import { Task, Subtask, Template, QuadrantId, TaskCategory, PriorityLevel, Recurrence, RecurrenceFrequency, CONTEXT_DEFINITIONS } from '../types';
import { QUADRANT_CONFIGS } from '../data/initialTasks';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../i18n/translations';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseSpokenTask } from '../utils/voiceParser';
import { cloneSubtaskTree, countTemplateSubtasks } from '../utils/templateHelpers';
import { TemplatePicker } from './TemplatePicker';
import { LocalizedDateInput } from './LocalizedDateInput';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => void;
  editingTask?: Task | null;
  defaultQuadrant?: QuadrantId;
  onShareTask?: (task: Task) => void;
  templates?: Template[];
  onDeleteTemplate?: (templateId: string) => void;
}

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  startFromTpl: string;
  startFromTplDesc: string;
  usingTpl: string;
  tplReady: string;
  willCreate: string;
  editAfterSave: string;
  tapToTalk: string;
  listening: string;
  contextsTitle: string;
  contextsSub: string;
  contextsTip: string;
  dueDateTime: string;
  repeat: string;
  repeatNever: string;
  repeatDaily: string;
  repeatWeekdays: string;
  repeatWeekly: string;
  repeatMonthly: string;
  repeatYearly: string;
  repeatEvery: string;
  dayS: string;
  weekS: string;
  monthS: string;
  yearS: string;
  categoryLabel: string;
  estTime: string;
  saveTask: string;
  createTask: string;
  editTask: string;
  newTask: string;
  impactOf: string;
  effortOf: string;
  shareTitle: string;
  shareAlready: string;
  shareCompleted: string;
  shareDeclined: string;
  shareGenerate: string;
  shareBtn: string;
  shareOpen: string;
  weekdaysShort: string[];
  freqLabels: Record<'daily'|'weekdays'|'weekly'|'monthly'|'yearly', string>;
  contexts: Record<string, string>;
}> = {
  en: {
    startFromTpl: 'Start from a template',
    startFromTplDesc: 'Trip, launch, weekly review…',
    usingTpl: 'Using: {name}',
    tplReady: '{count} subtask(s) ready — tap to swap',
    willCreate: '{count} subtask(s) will be created',
    editAfterSave: 'You can edit them on the task card after saving',
    tapToTalk: 'Tap to Talk',
    listening: 'Listening...',
    contextsTitle: 'Contexts',
    contextsSub: '(where / how)',
    contextsTip: 'Tip: use @home, @work in the voice/text box for auto-tagging.',
    dueDateTime: 'Due Date & Time',
    repeat: 'Repeat',
    repeatNever: 'Never',
    repeatDaily: 'Daily',
    repeatWeekdays: 'Weekdays',
    repeatWeekly: 'Weekly',
    repeatMonthly: 'Monthly',
    repeatYearly: 'Yearly',
    repeatEvery: 'Every',
    dayS: 'day(s)',
    weekS: 'week(s)',
    monthS: 'month(s)',
    yearS: 'year(s)',
    categoryLabel: 'Category',
    estTime: 'Est. Time (min)',
    saveTask: 'Save Task',
    createTask: 'Add Task',
    editTask: 'Edit Task',
    newTask: 'New Task',
    impactOf: 'Impact: {score}/5',
    effortOf: 'Effort: {score}/5',
    shareTitle: 'Share with someone',
    shareAlready: 'Already shared',
    shareCompleted: 'Completed by {name}',
    shareDeclined: 'They declined — try someone else',
    shareGenerate: 'Generate a link — they just tap "Done"',
    shareBtn: 'Share',
    shareOpen: 'Open',
    weekdaysShort: ['S','M','T','W','T','F','S'],
    freqLabels: { daily:'Daily', weekdays:'Weekdays', weekly:'Weekly', monthly:'Monthly', yearly:'Yearly' },
    contexts: { home: 'Home', work: 'Work', call: 'Call', computer: 'Deep Work', errand: 'Errand', health: 'Health' },
  },
  fr: {
    startFromTpl: 'Partir d’un modèle',
    startFromTplDesc: 'Voyage, lancement, revue…',
    usingTpl: 'Utilise : {name}',
    tplReady: '{count} sous-tâche(s) prête(s) — appuyez pour changer',
    willCreate: '{count} sous-tâche(s) seront créées',
    editAfterSave: 'Vous pourrez les modifier sur la carte après sauvegarde',
    tapToTalk: 'Parler',
    listening: 'Écoute...',
    contextsTitle: 'Contextes',
    contextsSub: '(où / comment)',
    contextsTip: 'Astuce : utilisez @home, @work dans la zone vocale/texte.',
    dueDateTime: 'Date & heure limites',
    repeat: 'Répéter',
    repeatNever: 'Jamais',
    repeatDaily: 'Quotidien',
    repeatWeekdays: 'Jours ouvrés',
    repeatWeekly: 'Hebdo',
    repeatMonthly: 'Mensuel',
    repeatYearly: 'Annuel',
    repeatEvery: 'Tous les',
    dayS: 'jour(s)',
    weekS: 'semaine(s)',
    monthS: 'mois',
    yearS: 'an(s)',
    categoryLabel: 'Catégorie',
    estTime: 'Temps estimé (min)',
    saveTask: 'Enregistrer',
    createTask: 'Ajouter',
    editTask: 'Modifier',
    newTask: 'Nouvelle tâche',
    impactOf: 'Impact : {score}/5',
    effortOf: 'Effort : {score}/5',
    shareTitle: 'Partager avec quelqu’un',
    shareAlready: 'Déjà partagé',
    shareCompleted: 'Terminé par {name}',
    shareDeclined: 'Refusé — essayez quelqu’un d’autre',
    shareGenerate: 'Générez un lien — il suffit d’appuyer sur « Terminé »',
    shareBtn: 'Partager',
    shareOpen: 'Ouvrir',
    weekdaysShort: ['D','L','M','M','J','V','S'],
    freqLabels: { daily:'Quotidien', weekdays:'Jours ouvrés', weekly:'Hebdo', monthly:'Mensuel', yearly:'Annuel' },
    contexts: { home: 'Maison', work: 'Travail', call: 'Appel', computer: 'Travail profond', errand: 'Courses', health: 'Santé' },
  },
  ar: {
    startFromTpl: 'ابدأ من قالب',
    startFromTplDesc: 'رحلة، إطلاق، مراجعة…',
    usingTpl: 'يستخدم: {name}',
    tplReady: '{count} مهمة فرعية جاهزة — اضغط للتبديل',
    willCreate: 'سيتم إنشاء {count} مهمة فرعية',
    editAfterSave: 'يمكنك تعديلها من البطاقة بعد الحفظ',
    tapToTalk: 'تحدث',
    listening: 'جار الاستماع...',
    contextsTitle: 'السياقات',
    contextsSub: '(أين / كيف)',
    contextsTip: 'نصيحة: استخدم @home، @work في مربع الصوت أو النص للتصنيف التلقائي.',
    dueDateTime: 'تاريخ ووقت الاستحقاق',
    repeat: 'التكرار',
    repeatNever: 'أبداً',
    repeatDaily: 'يومياً',
    repeatWeekdays: 'أيام الأسبوع',
    repeatWeekly: 'أسبوعياً',
    repeatMonthly: 'شهرياً',
    repeatYearly: 'سنوياً',
    repeatEvery: 'كل',
    dayS: 'يوم',
    weekS: 'أسبوع',
    monthS: 'شهر',
    yearS: 'سنة',
    categoryLabel: 'التصنيف',
    estTime: 'الوقت المقدر (بالدقائق)',
    saveTask: 'حفظ المهمة',
    createTask: 'إضافة المهمة',
    editTask: 'تعديل المهمة',
    newTask: 'مهمة جديدة',
    impactOf: 'الأثر: {score}/5',
    effortOf: 'الجهد: {score}/5',
    shareTitle: 'شارك مع شخص',
    shareAlready: 'تمت المشاركة',
    shareCompleted: 'أكمله {name}',
    shareDeclined: 'رفض — جرّب شخصاً آخر',
    shareGenerate: 'أنشئ رابطاً — يكفي أن يضغط "تم"',
    shareBtn: 'مشاركة',
    shareOpen: 'فتح',
    weekdaysShort: ['ح','ن','ث','ر','خ','ج','س'],
    freqLabels: { daily:'يومياً', weekdays:'أيام الأسبوع', weekly:'أسبوعياً', monthly:'شهرياً', yearly:'سنوياً' },
    contexts: { home: 'المنزل', work: 'العمل', call: 'مكالمة', computer: 'عمل عميق', errand: 'مشاوير', health: 'الصحة' },
  },
};

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

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen, onClose, onSaveTask, editingTask, defaultQuadrant = 'do_first', onShareTask,
  templates = [], onDeleteTemplate,
}) => {
  const { language, t } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;
  const isRtl = lang === 'ar';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quadrant, setQuadrant] = useState<QuadrantId>(defaultQuadrant);
  const [category, setCategory] = useState<TaskCategory>('Engineering');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [dueDate, setDueDate] = useState<string>('');
  const [impactScore, setImpactScore] = useState<number>(4);
  const [effortScore, setEffortScore] = useState<number>(2);
  const [recurrence, setRecurrence] = useState<Recurrence | undefined>(undefined);
  const [contexts, setContexts] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(null);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  const userEditedTitleRef = useRef(false);

  const {
    isSupported, isListening, transcript, interimTranscript,
    startListening, stopListening, resetTranscript,
  } = useSpeechRecognition(true);

  const speechLangMap: Record<string, string> = { en: 'en-US', fr: 'fr-FR', ar: 'ar-SA' };

  useEffect(() => {
    if (!isOpen) return;
    userEditedTitleRef.current = false;
    setAppliedTemplateName(null);
    setIsTemplatePickerOpen(false);

    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setQuadrant(editingTask.quadrant);
      setCategory(editingTask.category);
      setEstimatedMinutes(editingTask.estimatedMinutes);
      setRecurrence(editingTask.recurrence);
      setContexts(editingTask.contexts || []);
      setSubtasks(editingTask.subtasks || []);
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
      setContexts([]);
      setSubtasks([]);
      setDueDate(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 15);
        return dateToLocalInputString(d);
      });
      setImpactScore(4);
      setEffortScore(2);
    }

    resetTranscript();
    stopListening();
    // eslint-disable-next-line
  }, [isOpen, editingTask, defaultQuadrant]);

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
    if (parsed.contexts && parsed.contexts.length > 0) {
      setContexts(parsed.contexts);
    }

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

  const toggleContext = (id: string) => {
    triggerHaptic('light');
    setContexts((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleApplyTemplate = (tpl: Template) => {
    if (tpl.preset.category) setCategory(tpl.preset.category);
    if (tpl.preset.quadrant) setQuadrant(tpl.preset.quadrant);
    if (tpl.preset.estimatedMinutes) setEstimatedMinutes(tpl.preset.estimatedMinutes);
    if (tpl.preset.impactScore) setImpactScore(tpl.preset.impactScore);
    if (tpl.preset.effortScore) setEffortScore(tpl.preset.effortScore);
    if (tpl.preset.contexts) setContexts(tpl.preset.contexts);
    if (tpl.description && !description) setDescription(tpl.description);
    if (!title.trim()) setTitle(tpl.name);
    setSubtasks(cloneSubtaskTree(tpl.subtasks));
    setAppliedTemplateName(tpl.name);
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
      contexts: contexts.length > 0 ? contexts : undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      delegateId: editingTask?.delegateId,
      delegateStatus: editingTask?.delegateStatus,
      delegateCompletedBy: editingTask?.delegateCompletedBy,
      delegateCompletedAt: editingTask?.delegateCompletedAt,
    });
    onClose();
  };

  const handleShare = () => {
    if (!editingTask || !onShareTask) return;
    triggerHaptic('medium');
    onShareTask(editingTask);
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
    { label: copy.repeatNever,    value: null },
    { label: copy.repeatDaily,    value: 'daily' },
    { label: copy.repeatWeekdays, value: 'weekdays' },
    { label: copy.repeatWeekly,   value: 'weekly' },
    { label: copy.repeatMonthly,  value: 'monthly' },
    { label: copy.repeatYearly,   value: 'yearly' },
  ];
  const dayLabels = copy.weekdaysShort;

  const showShareButton = !!(editingTask && onShareTask && quadrant === 'delegate');
  const subtaskCount = countTemplateSubtasks(subtasks);
  const showTemplateButton = !editingTask && templates.length > 0;

  return (
    <>
      <div id="task-modal-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-0 sm:p-4">
        <div
          id="task-modal-container"
          dir={isRtl ? 'rtl' : 'ltr'}
          className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 shadow-2xl text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {editingTask ? t('modal_title_edit') : t('modal_title_new')}
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            {showTemplateButton && (
              <button
                type="button"
                onClick={() => { triggerHaptic('medium'); setIsTemplatePickerOpen(true); }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-800/70 bg-violet-50/60 dark:bg-violet-950/20 hover:bg-violet-100/70 dark:hover:bg-violet-950/40 transition cursor-pointer text-left rtl:text-right"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-500/30">
                  <LayoutTemplate className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-violet-950 dark:text-violet-100">
                    {appliedTemplateName
                      ? copy.usingTpl.replace('{name}', appliedTemplateName)
                      : copy.startFromTpl}
                  </div>
                  <div className="text-[10px] text-violet-700/80 dark:text-violet-300/80 mt-0.5 truncate">
                    {appliedTemplateName
                      ? copy.tplReady.replace('{count}', String(subtaskCount))
                      : copy.startFromTplDesc}
                  </div>
                </div>
              </button>
            )}

            {!editingTask && subtaskCount > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2">
                <span className="text-base">📋</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                    {copy.willCreate.replace('{count}', String(subtaskCount))}
                  </div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                    {copy.editAfterSave}
                  </div>
                </div>
              </div>
            )}

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
                >
                  <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-bounce' : ''}`} />
                  <span>{isListening ? copy.listening : copy.tapToTalk}</span>
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

            {showShareButton && (
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                        {editingTask?.delegateId ? copy.shareAlready : copy.shareTitle}
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                        {editingTask?.delegateStatus === 'completed'
                          ? copy.shareCompleted.replace('{name}', editingTask.delegateCompletedBy || '—')
                          : editingTask?.delegateStatus === 'rejected'
                          ? copy.shareDeclined
                          : copy.shareGenerate}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
                  >
                    {editingTask?.delegateId ? copy.shareOpen : copy.shareBtn}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-violet-500" />
                  <span>{copy.contextsTitle}</span>
                  <span className="text-[10px] font-normal text-slate-400 ml-1">{copy.contextsSub}</span>
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CONTEXT_DEFINITIONS.map((ctx) => {
                  const isSelected = contexts.includes(ctx.id);
                  const label = copy.contexts[ctx.id] ?? ctx.label;
                  return (
                    <button
                      key={ctx.id}
                      type="button"
                      onClick={() => toggleContext(ctx.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                        isSelected
                          ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{ctx.emoji}</span>
                      <span>{label}</span>
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
              {contexts.length === 0 && (
                <p className="text-[10px] text-slate-400 mt-1.5">
                  {copy.contextsTip}
                </p>
              )}
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                  <span>{copy.dueDateTime}</span>
                </span>
              </label>
              <LocalizedDateInput value={dueDate} onChange={setDueDate} withTime />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1">
                  <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{copy.repeat}</span>
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
                  <span>{copy.repeatEvery}</span>
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
                    {recurrence.frequency === 'daily' ? copy.dayS :
                     recurrence.frequency === 'weekly' ? copy.weekS :
                     recurrence.frequency === 'monthly' ? copy.monthS : copy.yearS}
                  </span>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {recurrence
                    ? `${copy.freqLabels[recurrence.frequency as keyof typeof copy.freqLabels] ?? recurrence.frequency} · ${copy.repeatEvery} ${recurrence.interval}`
                    : copy.repeatNever}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">{copy.categoryLabel}</label>
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
                    <span>{copy.estTime}</span>
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

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <label className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 mb-1.5 font-medium">
                  <span className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    <span>{copy.impactOf.replace('{score}', String(impactScore))}</span>
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
                    <span>{copy.effortOf.replace('{score}', String(effortScore))}</span>
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

      <TemplatePicker
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        templates={templates}
        onPick={handleApplyTemplate}
        onDelete={onDeleteTemplate}
      />
    </>
  );
};