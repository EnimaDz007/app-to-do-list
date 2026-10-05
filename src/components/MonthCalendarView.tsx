import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, QuadrantId, CONTEXT_DEFINITIONS } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';

interface MonthCalendarViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  /** Reports the currently selected day (YYYY-MM-DD) to the parent */
  onDateSelect?: (dateKey: string) => void;
}

type LocalLang = 'en' | 'fr' | 'ar';

const QUADRANT_COLORS: Record<QuadrantId, string> = {
  do_first:  '#E11D48',
  schedule:  '#4F46E5',
  delegate:  '#059669',
  eliminate: '#64748B',
};

const COPY: Record<LocalLang, {
  locale: string;
  today: string;
  tasksThisMonth: string;   // "{count} tasks this month"
  task: string;             // singular
  tasks: string;            // plural
  nothingScheduled: string;
  prevMonth: string;
  nextMonth: string;
  toggleComplete: string;
  quadrants: Record<QuadrantId, string>;
  contexts: Record<string, string>;
  weekDaysShort: string[];
  weekDaysMin: string[];
}> = {
  en: {
    locale: 'en-US',
    today: 'Today',
    tasksThisMonth: '{count} tasks this month',
    task: 'task',
    tasks: 'tasks',
    nothingScheduled: 'Nothing scheduled for this day',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    toggleComplete: 'Toggle complete',
    quadrants: { do_first: 'Do First', schedule: 'Schedule', delegate: 'Delegate', eliminate: 'Eliminate' },
    contexts: { home: 'Home', work: 'Work', call: 'Call', computer: 'Deep Work', errand: 'Errand', health: 'Health' },
    weekDaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weekDaysMin: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  },
  fr: {
    locale: 'fr-FR',
    today: "Aujourd'hui",
    tasksThisMonth: '{count} tâches ce mois-ci',
    task: 'tâche',
    tasks: 'tâches',
    nothingScheduled: 'Rien de prévu ce jour',
    prevMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    toggleComplete: 'Marquer comme fait',
    quadrants: { do_first: 'À faire', schedule: 'Planifier', delegate: 'Déléguer', eliminate: 'Éliminer' },
    contexts: { home: 'Maison', work: 'Travail', call: 'Appel', computer: 'Travail profond', errand: 'Courses', health: 'Santé' },
    weekDaysShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    weekDaysMin: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  },
  ar: {
    locale: 'ar-EG',
    today: 'اليوم',
    tasksThisMonth: '{count} مهمة هذا الشهر',
    task: 'مهمة',
    tasks: 'مهام',
    nothingScheduled: 'لا شيء مجدول في هذا اليوم',
    prevMonth: 'الشهر السابق',
    nextMonth: 'الشهر التالي',
    toggleComplete: 'تبديل الإكمال',
    quadrants: { do_first: 'ابدأ به فوراً', schedule: 'جدولة وتخطيط', delegate: 'تفويض', eliminate: 'استبعاد وإلغاء' },
    contexts: { home: 'المنزل', work: 'العمل', call: 'مكالمة', computer: 'عمل عميق', errand: 'مشاوير', health: 'الصحة' },
    weekDaysShort: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
    weekDaysMin: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'],
  },
};

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
  tasks,
  onToggleStatus,
  onEditTask,
  onDateSelect,
}) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(toLocalDateKey(today));

  // Report the selected day up to App so the "+" button can pre-fill the due date
  const onDateSelectRef = useRef(onDateSelect);
  useEffect(() => { onDateSelectRef.current = onDateSelect; });
  useEffect(() => {
    onDateSelectRef.current?.(selectedDateKey);
  }, [selectedDateKey]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.status === 'completed' && !t.completedAt) return;
      const refDate = t.dueDate || t.createdAt;
      if (!refDate) return;
      const d = new Date(refDate);
      if (isNaN(d.getTime())) return;
      const key = toLocalDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const ta = new Date(a.dueDate || a.createdAt).getTime();
        const tb = new Date(b.dueDate || b.createdAt).getTime();
        return ta - tb;
      });
    });
    return map;
  }, [tasks]);

  const gridDays = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startDay = firstOfMonth.getDay();
    const gridStart = new Date(viewYear, viewMonth, 1 - startDay);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [viewYear, viewMonth]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(copy.locale, {
    month: 'long',
    year: 'numeric',
  });

  const goPrevMonth = () => {
    triggerHaptic('light');
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    triggerHaptic('light');
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    triggerHaptic('medium');
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDateKey(toLocalDateKey(today));
  };

  const selectedDayTasks = tasksByDate[selectedDateKey] || [];
  const selectedDate = new Date(selectedDateKey + 'T00:00:00');

  return (
    <div className="w-full space-y-3 pb-4">
      {/* Header with month nav */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
              {monthLabel}
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {copy.tasksThisMonth.replace('{count}', String(Object.values(tasksByDate).flat().length))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={goToday}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
          >
            {copy.today}
          </button>
          <button
            onClick={goPrevMonth}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            aria-label={copy.prevMonth}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goNextMonth}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            aria-label={copy.nextMonth}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 px-0.5">
        {copy.weekDaysMin.map((d, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 py-1"
          >
            <span className="hidden sm:inline">{copy.weekDaysShort[i]}</span>
            <span className="sm:hidden">{d}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {gridDays.map((day, idx) => {
          const key = toLocalDateKey(day);
          const dayTasks = tasksByDate[key] || [];
          const isCurrentMonth = day.getMonth() === viewMonth;
          const isToday = toLocalDateKey(day) === toLocalDateKey(today);
          const isSelected = key === selectedDateKey;

          const quadrantColors = Array.from(
            new Set(dayTasks.map((t) => t.quadrant))
          ).slice(0, 4);

          const allDone = dayTasks.length > 0 && dayTasks.every((t) => t.status === 'completed');

          return (
            <button
              key={idx}
              onClick={() => {
                triggerHaptic('light');
                setSelectedDateKey(key);
              }}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-start pt-1 pb-1 transition cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : isToday
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-400 dark:ring-indigo-500'
                  : isCurrentMonth
                  ? 'bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span className={`text-[13px] font-bold leading-none ${allDone && !isSelected ? 'line-through opacity-60' : ''}`}>
                {day.getDate()}
              </span>

              <div className="flex items-center justify-center gap-0.5 mt-1">
                {quadrantColors.map((q, i) => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full"
                    style={{
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.9)' : QUADRANT_COLORS[q],
                    }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-[12px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {selectedDate.toLocaleDateString(copy.locale, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </h3>
          <span className="text-[10px] font-bold text-slate-400">
            {selectedDayTasks.length} {selectedDayTasks.length === 1 ? copy.task : copy.tasks}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {selectedDayTasks.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80"
            >
              <div className="text-3xl mb-2 opacity-40">📭</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {copy.nothingScheduled}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={selectedDateKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-1.5"
            >
              {selectedDayTasks.map((task) => {
                const color = QUADRANT_COLORS[task.quadrant];
                const label = copy.quadrants[task.quadrant];
                const isDone = task.status === 'completed';
                const due = task.dueDate ? new Date(task.dueDate) : null;
                const dueTime = due && !isNaN(due.getTime())
                  ? due.toLocaleTimeString(copy.locale, { hour: 'numeric', minute: '2-digit' })
                  : null;

                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-2 p-2.5 rounded-xl border bg-white dark:bg-slate-800/60 transition ${
                      isDone
                        ? 'border-slate-200 dark:border-slate-700 opacity-60'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    style={{ borderLeftWidth: 3, borderLeftColor: color }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('success');
                        onToggleStatus(task.id);
                      }}
                      className="w-4 h-4 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                      style={{
                        borderColor: color,
                        backgroundColor: isDone ? color : 'transparent',
                      }}
                      aria-label={copy.toggleComplete}
                    >
                      {isDone && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        onEditTask(task);
                      }}
                      className="flex-1 min-w-0 text-left rtl:text-right cursor-pointer"
                    >
                      <p
                        className={`text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 leading-tight ${
                          isDone ? 'line-through' : ''
                        }`}
                      >
                        {task.title}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{
                            backgroundColor: `${color}18`,
                            color: color,
                          }}
                        >
                          {label}
                        </span>

                        {dueTime && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-500 dark:text-slate-400 font-semibold">
                            <Clock className="w-2.5 h-2.5" />
                            {dueTime}
                          </span>
                        )}

                        {task.contexts && task.contexts.slice(0, 2).map((ctxId) => {
                          const def = CONTEXT_DEFINITIONS.find((c) => c.id === ctxId);
                          const emoji = def?.emoji ?? '🏷️';
                          const label = copy.contexts[ctxId] ?? def?.label ?? ctxId;
                          return (
                            <span
                              key={ctxId}
                              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
                            >
                              <span>{emoji}</span>
                              <span>{label}</span>
                            </span>
                          );
                        })}
                      </div>
                    </button>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};