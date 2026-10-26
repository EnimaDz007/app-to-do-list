import React, { useEffect } from 'react';
import {
  X, Clock, Calendar as CalendarIcon, Tag, Repeat, Bell,
  CheckSquare, Folder, Edit3, CheckCircle2, Flag, ListTree,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, Subtask, QuadrantId, Project, CONTEXT_DEFINITIONS } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

// ─────────────────────────────────────────────────────────────
//   TYPES
// ─────────────────────────────────────────────────────────────

interface TaskSummarySheetProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  /** Optional — pass all projects so we can render the assigned one. */
  projects?: Project[];
}

type LocalLang = 'en' | 'fr' | 'ar';

// ─────────────────────────────────────────────────────────────
//   CONSTANTS
// ─────────────────────────────────────────────────────────────

const QUADRANT_META: Record<QuadrantId, { color: string; bg: string; emoji: string }> = {
  do_first:  { color: '#E11D48', bg: 'rgba(225,29,72,0.10)',   emoji: '🔥' },
  schedule:  { color: '#4F46E5', bg: 'rgba(79,70,229,0.10)',   emoji: '📅' },
  delegate:  { color: '#059669', bg: 'rgba(5,150,105,0.10)',   emoji: '👥' },
  eliminate: { color: '#64748B', bg: 'rgba(100,116,139,0.10)', emoji: '🗑️' },
};

// ─────────────────────────────────────────────────────────────
//   COPY  (section header renamed to contextsLabel to avoid clash)
// ─────────────────────────────────────────────────────────────

const COPY: Record<LocalLang, {
  locale: string;
  header: string;
  noDescription: string;
  dueDate: string;
  duration: string;
  minutesSuffix: string;
  category: string;
  contextsLabel: string;               // ← renamed (was `contexts`)
  reminders: string;
  reminderAtDueTime: string;
  reminderMinutesBefore: (n: number) => string;
  reminderHoursBefore: (h: number) => string;
  reminderDaysBefore: (d: number) => string;
  subtasks: string;
  subtasksProgress: (done: number, total: number) => string;
  recurrence: string;
  recurrenceEvery: (n: number) => string;
  project: string;
  edit: string;
  complete: string;
  reopen: string;
  close: string;
  completed: string;
  quadrants: Record<QuadrantId, string>;
  freqLabels: Record<string, string>;
  contexts: Record<string, string>;    // ← kept: localized context names
  categories: Record<string, string>;
}> = {
  en: {
    locale: 'en-US',
    header: 'Task details',
    noDescription: 'No description',
    dueDate: 'Due',
    duration: 'Duration',
    minutesSuffix: 'min',
    category: 'Category',
    contextsLabel: 'Contexts',
    reminders: 'Reminders',
    reminderAtDueTime: 'At due time',
    reminderMinutesBefore: (n) => `${n} min before`,
    reminderHoursBefore: (h) => `${h} ${h === 1 ? 'hour' : 'hours'} before`,
    reminderDaysBefore: (d) => `${d} ${d === 1 ? 'day' : 'days'} before`,
    subtasks: 'Subtasks',
    subtasksProgress: (done, total) => `${done} of ${total} done`,
    recurrence: 'Repeats',
    recurrenceEvery: (n) => `every ${n}`,
    project: 'Project',
    edit: 'Edit',
    complete: 'Mark complete',
    reopen: 'Reopen',
    close: 'Close',
    completed: 'Completed',
    quadrants: { do_first: 'Do First', schedule: 'Schedule', delegate: 'Delegate', eliminate: 'Eliminate' },
    freqLabels: { daily: 'day', weekdays: 'weekday', weekly: 'week', monthly: 'month', yearly: 'year' },
    contexts: { home: 'Home', work: 'Work', call: 'Call', computer: 'Deep Work', errand: 'Errand', health: 'Health' },
    categories: {
      Engineering: 'Engineering', Operations: 'Operations', Product: 'Product',
      Design: 'Design', Client: 'Client', Marketing: 'Marketing', Personal: 'Personal',
    },
  },
  fr: {
    locale: 'fr-FR',
    header: 'Détails de la tâche',
    noDescription: 'Aucune description',
    dueDate: 'Échéance',
    duration: 'Durée',
    minutesSuffix: 'min',
    category: 'Catégorie',
    contextsLabel: 'Contextes',
    reminders: 'Rappels',
    reminderAtDueTime: 'À l’heure',
    reminderMinutesBefore: (n) => `${n} min avant`,
    reminderHoursBefore: (h) => `${h} ${h === 1 ? 'heure' : 'heures'} avant`,
    reminderDaysBefore: (d) => `${d} ${d === 1 ? 'jour' : 'jours'} avant`,
    subtasks: 'Sous-tâches',
    subtasksProgress: (done, total) => `${done} sur ${total} terminées`,
    recurrence: 'Répétition',
    recurrenceEvery: (n) => `tous les ${n}`,
    project: 'Projet',
    edit: 'Modifier',
    complete: 'Marquer terminée',
    reopen: 'Rouvrir',
    close: 'Fermer',
    completed: 'Terminée',
    quadrants: { do_first: 'À faire', schedule: 'Planifier', delegate: 'Déléguer', eliminate: 'Éliminer' },
    freqLabels: { daily: 'jour', weekdays: 'jour ouvré', weekly: 'semaine', monthly: 'mois', yearly: 'an' },
    contexts: { home: 'Maison', work: 'Travail', call: 'Appel', computer: 'Travail profond', errand: 'Courses', health: 'Santé' },
    categories: {
      Engineering: 'Ingénierie', Operations: 'Opérations', Product: 'Produit',
      Design: 'Design', Client: 'Client', Marketing: 'Marketing', Personal: 'Personnel',
    },
  },
  ar: {
    locale: 'ar-EG',
    header: 'تفاصيل المهمة',
    noDescription: 'لا يوجد وصف',
    dueDate: 'الاستحقاق',
    duration: 'المدة',
    minutesSuffix: 'دقيقة',
    category: 'التصنيف',
    contextsLabel: 'السياقات',
    reminders: 'التذكيرات',
    reminderAtDueTime: 'في وقت الاستحقاق',
    reminderMinutesBefore: (n) => `قبل ${n} دقيقة`,
    reminderHoursBefore: (h) => `قبل ${h} ساعة`,
    reminderDaysBefore: (d) => `قبل ${d} يوم`,
    subtasks: 'المهام الفرعية',
    subtasksProgress: (done, total) => `${done} من ${total} مكتملة`,
    recurrence: 'التكرار',
    recurrenceEvery: (n) => `كل ${n}`,
    project: 'المشروع',
    edit: 'تعديل',
    complete: 'وضع علامة مكتملة',
    reopen: 'إعادة الفتح',
    close: 'إغلاق',
    completed: 'مكتملة',
    quadrants: { do_first: 'ابدأ به فوراً', schedule: 'جدولة وتخطيط', delegate: 'تفويض', eliminate: 'استبعاد وإلغاء' },
    freqLabels: { daily: 'يوم', weekdays: 'يوم عمل', weekly: 'أسبوع', monthly: 'شهر', yearly: 'سنة' },
    contexts: { home: 'المنزل', work: 'العمل', call: 'مكالمة', computer: 'عمل عميق', errand: 'مشاوير', health: 'الصحة' },
    categories: {
      Engineering: 'هندسة وبرمجة', Operations: 'العمليات', Product: 'المنتج',
      Design: 'التصميم', Client: 'العملاء', Marketing: 'التسويق', Personal: 'شخصي',
    },
  },
};

// ─────────────────────────────────────────────────────────────
//   HELPERS
// ─────────────────────────────────────────────────────────────

function flattenSubtasks(subtasks: Subtask[], depth = 0): { sub: Subtask; depth: number }[] {
  const out: { sub: Subtask; depth: number }[] = [];
  for (const s of subtasks) {
    out.push({ sub: s, depth });
    if (s.subtasks && s.subtasks.length > 0) {
      out.push(...flattenSubtasks(s.subtasks, depth + 1));
    }
  }
  return out;
}

function countSubtasks(subtasks: Subtask[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const s of subtasks) {
    total += 1;
    if (s.done) done += 1;
    if (s.subtasks && s.subtasks.length > 0) {
      const nested = countSubtasks(s.subtasks);
      done += nested.done;
      total += nested.total;
    }
  }
  return { done, total };
}

// ─────────────────────────────────────────────────────────────
//   COMPONENT
// ─────────────────────────────────────────────────────────────

export const TaskSummarySheet: React.FC<TaskSummarySheetProps> = ({
  isOpen,
  task,
  onClose,
  onEdit,
  onToggleComplete,
  projects = [],
}) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;
  const isRtl = lang === 'ar';

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        triggerHaptic('light');
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!task) return null;

  const meta = QUADRANT_META[task.quadrant];
  const isDone = task.status === 'completed';
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const hasDue = !!due && !isNaN(due.getTime());

  const dueDateStr = hasDue
    ? due!.toLocaleDateString(copy.locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const dueTimeStr = hasDue
    ? due!.toLocaleTimeString(copy.locale, { hour: 'numeric', minute: '2-digit' })
    : '';

  const subtaskList = task.subtasks && task.subtasks.length > 0
    ? flattenSubtasks(task.subtasks)
    : [];
  const subtaskCount = task.subtasks && task.subtasks.length > 0
    ? countSubtasks(task.subtasks)
    : null;

  const assignedProject = task.projectId
    ? projects.find((p) => p.id === task.projectId)
    : null;

  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  const handleEdit = () => {
    triggerHaptic('medium');
    onEdit(task);
  };

  const handleToggle = () => {
    triggerHaptic(isDone ? 'light' : 'success');
    onToggleComplete(task.id);
    onClose();
  };

  const reminderLabel = (minutesBefore: number): string => {
    if (minutesBefore === 0) return copy.reminderAtDueTime;
    if (minutesBefore < 60) return copy.reminderMinutesBefore(minutesBefore);
    if (minutesBefore < 1440) {
      const h = minutesBefore / 60;
      return copy.reminderHoursBefore(h % 1 === 0 ? h : parseFloat(h.toFixed(1)));
    }
    const d = minutesBefore / 1440;
    return copy.reminderDaysBefore(d % 1 === 0 ? d : parseFloat(d.toFixed(1)));
  };

  const freqLabel = task.recurrence
    ? copy.freqLabels[task.recurrence.frequency] ?? task.recurrence.frequency
    : '';

  const categoryLabel = copy.categories[task.category] ?? task.category;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-xs"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            dir={isRtl ? 'rtl' : 'ltr'}
            className="fixed bottom-0 left-0 right-0 z-[71] rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            <div className="flex items-center justify-between px-5 pb-3 pt-2 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={handleClose}
                className="p-1.5 -ms-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label={copy.close}
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                {copy.header}
              </h2>
              <div className="w-8" />
            </div>

            <div className="overflow-y-auto px-5 py-5 space-y-5">

              <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: meta.bg }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{meta.emoji}</span>
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.15em]"
                    style={{ color: meta.color }}
                  >
                    {copy.quadrants[task.quadrant]}
                  </span>
                  {isDone && (
                    <span className="ms-auto text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400">
                      ✓ {copy.completed}
                    </span>
                  )}
                </div>
                <h3
                  className={`text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight ${
                    isDone ? 'line-through opacity-70' : ''
                  }`}
                >
                  {task.title}
                </h3>
              </div>

              {task.description && task.description.trim().length > 0 ? (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed pt-1.5 whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                {hasDue && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <CalendarIcon className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-0.5">
                        {copy.dueDate}
                      </div>
                      <div className="text-[12px] font-bold text-slate-900 dark:text-white leading-snug">
                        {dueDateStr}
                      </div>
                      <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {dueTimeStr}
                      </div>
                    </div>
                  </div>
                )}
                {task.estimatedMinutes > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <Clock className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-0.5">
                        {copy.duration}
                      </div>
                      <div className="text-[12px] font-bold text-slate-900 dark:text-white leading-snug tabular-nums">
                        {task.estimatedMinutes} {copy.minutesSuffix}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {assignedProject && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                      {copy.project}
                    </div>
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: `${assignedProject.color}20` }}
                    >
                      <span className="text-sm leading-none">{assignedProject.emoji}</span>
                      <span
                        className="text-[12px] font-bold truncate"
                        style={{ color: assignedProject.color }}
                      >
                        {assignedProject.name}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Flag className="w-3.5 h-3.5 text-violet-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                    {copy.category}
                  </div>
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-[12px] font-bold text-violet-700 dark:text-violet-300">
                    {categoryLabel}
                  </span>
                </div>
              </div>

              {task.contexts && task.contexts.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Tag className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1.5">
                      {copy.contextsLabel}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {task.contexts.map((ctxId) => {
                        const def = CONTEXT_DEFINITIONS.find((c) => c.id === ctxId);
                        const emoji = def?.emoji ?? '🏷️';
                        const label = copy.contexts[ctxId] ?? def?.label ?? ctxId;
                        return (
                          <span
                            key={ctxId}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-[11px] font-bold text-violet-700 dark:text-violet-300"
                          >
                            <span>{emoji}</span>
                            <span>{label}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {task.reminders && task.reminders.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1.5">
                      {copy.reminders}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {task.reminders.map((r) => (
                        <span
                          key={r.id}
                          className="inline-block px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-[11px] font-bold text-amber-700 dark:text-amber-300 tabular-nums"
                        >
                          {reminderLabel(r.minutesBefore)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {task.recurrence && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                      {copy.recurrence}
                    </div>
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-[12px] font-bold text-indigo-700 dark:text-indigo-300">
                      {copy.recurrenceEvery(task.recurrence.interval)} {freqLabel}
                    </span>
                  </div>
                </div>
              )}

              {subtaskList.length > 0 && subtaskCount && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <ListTree className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        {copy.subtasks}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                        {copy.subtasksProgress(subtaskCount.done, subtaskCount.total)}
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {subtaskList.map(({ sub, depth }) => (
                        <li
                          key={sub.id}
                          className="flex items-start gap-2"
                          style={{ paddingInlineStart: depth * 16 }}
                        >
                          {sub.done ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0 mt-0.5" />
                          )}
                          <span
                            className={`text-[12px] font-semibold leading-snug ${
                              sub.done
                                ? 'text-slate-400 dark:text-slate-600 line-through'
                                : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {sub.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 pt-3 pb-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={handleEdit}
                className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-black tracking-tight hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>{copy.edit}</span>
              </button>
              <button
                type="button"
                onClick={handleToggle}
                className={`flex-1 py-3 rounded-2xl text-sm font-black tracking-tight transition cursor-pointer flex items-center justify-center gap-2 text-white ${
                  isDone
                    ? 'bg-slate-500 hover:bg-slate-600'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>{isDone ? copy.reopen : copy.complete}</span>
              </button>
            </div>

            <div style={{ height: 'env(safe-area-inset-bottom)' }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};