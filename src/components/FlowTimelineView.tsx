import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock, CalendarDays, BarChart3, Check } from 'lucide-react';
import { Task, QuadrantId, CONTEXT_DEFINITIONS } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';

interface FlowTimelineViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

type LocalLang = 'en' | 'fr' | 'ar';

const QUADRANT_COLORS: Record<QuadrantId, { color: string; colorLight: string; emoji: string }> = {
  do_first:  { color: '#E11D48', colorLight: '#FB7185', emoji: '🔥' },
  schedule:  { color: '#4F46E5', colorLight: '#818CF8', emoji: '📅' },
  delegate:  { color: '#059669', colorLight: '#34D399', emoji: '👥' },
  eliminate: { color: '#64748B', colorLight: '#94A3B8', emoji: '🗑️' },
};

const HOUR_WIDTH = 48;
const DAY_HEIGHT = 46;
const RULER_HEIGHT = 26;
const TOTAL_WIDTH = 24 * HOUR_WIDTH;

const COPY: Record<LocalLang, {
  locale: string;
  title: string;
  today: string;
  prevWeek: string;
  nextWeek: string;
  tasksLabel: string;
  hoursSuffix: string;
  thisWeek: string;
  nothingScheduled: string;
  scrollHint: string;
  toggleComplete: string;
  quadrants: Record<QuadrantId, string>;
  contexts: Record<string, string>;
  weekDayShort: (d: Date) => string;
}> = {
  en: {
    locale: 'en-US',
    title: 'Flow Timeline',
    today: 'Today',
    prevWeek: 'Previous week',
    nextWeek: 'Next week',
    tasksLabel: 'tasks',
    hoursSuffix: 'h',
    thisWeek: 'This week · {count}',
    nothingScheduled: 'Nothing scheduled this week',
    scrollHint: '← Scroll horizontally →',
    toggleComplete: 'Toggle complete',
    quadrants: { do_first: 'Do First', schedule: 'Schedule', delegate: 'Delegate', eliminate: 'Eliminate' },
    contexts: { home: 'Home', work: 'Work', call: 'Call', computer: 'Deep Work', errand: 'Errand', health: 'Health' },
    weekDayShort: (d) => d.toLocaleDateString('en-US', { weekday: 'short' }),
  },
  fr: {
    locale: 'fr-FR',
    title: 'Chronologie de flux',
    today: "Aujourd'hui",
    prevWeek: 'Semaine précédente',
    nextWeek: 'Semaine suivante',
    tasksLabel: 'tâches',
    hoursSuffix: 'h',
    thisWeek: 'Cette semaine · {count}',
    nothingScheduled: 'Rien de prévu cette semaine',
    scrollHint: '← Faites défiler horizontalement →',
    toggleComplete: 'Marquer comme fait',
    quadrants: { do_first: 'À faire', schedule: 'Planifier', delegate: 'Déléguer', eliminate: 'Éliminer' },
    contexts: { home: 'Maison', work: 'Travail', call: 'Appel', computer: 'Travail profond', errand: 'Courses', health: 'Santé' },
    weekDayShort: (d) => d.toLocaleDateString('fr-FR', { weekday: 'short' }),
  },
  ar: {
    locale: 'ar-EG',
    title: 'الخط الزمني للتدفق',
    today: 'اليوم',
    prevWeek: 'الأسبوع السابق',
    nextWeek: 'الأسبوع التالي',
    tasksLabel: 'مهام',
    hoursSuffix: 'س',
    thisWeek: 'هذا الأسبوع · {count}',
    nothingScheduled: 'لا شيء مجدول هذا الأسبوع',
    scrollHint: '← مرر أفقياً →',
    toggleComplete: 'تبديل الإكمال',
    quadrants: { do_first: 'ابدأ به فوراً', schedule: 'جدولة وتخطيط', delegate: 'تفويض', eliminate: 'استبعاد وإلغاء' },
    contexts: { home: 'المنزل', work: 'العمل', call: 'مكالمة', computer: 'عمل عميق', errand: 'مشاوير', health: 'الصحة' },
    weekDayShort: (d) => d.toLocaleDateString('ar-EG', { weekday: 'short' }),
  },
};

function formatHourLabel(h: number, lang: LocalLang): string {
  if (lang === 'ar') {
    if (h === 0) return '١٢ص';
    if (h === 12) return '١٢م';
    const h12 = h < 12 ? h : h - 12;
    return `${h12}${h < 12 ? 'ص' : 'م'}`;
  }
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export const FlowTimelineView: React.FC<FlowTimelineViewProps> = ({
  tasks,
  onToggleStatus,
  onEditTask,
}) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;
  const isRtl = lang === 'ar';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [weekOffset, setWeekOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
    return d;
  }, [weekOffset, today]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + 7);
    return d;
  }, [weekStart]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const weekTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      if (isNaN(d.getTime())) return false;
      return d >= weekStart && d < weekEnd;
    });
  }, [tasks, weekStart, weekEnd]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    weekTasks.forEach((t) => {
      const d = new Date(t.dueDate);
      const k = dayKey(d);
      if (!map[k]) map[k] = [];
      map[k].push(t);
    });
    return map;
  }, [weekTasks]);

  const totalMinutes = useMemo(() => {
    return weekTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
  }, [weekTasks]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const sorted = weekTasks
      .map((t) => new Date(t.dueDate))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (sorted.length > 0) {
      const hour = sorted[0].getHours();
      const left = Math.max(0, (hour - 2) * HOUR_WIDTH);
      container.scrollTo({ left, behavior: 'smooth' });
    } else {
      container.scrollTo({ left: 8 * HOUR_WIDTH, behavior: 'smooth' });
    }
  }, [weekOffset, weekTasks]);

  const nowLine = useMemo(() => {
    const now = new Date();
    if (now < weekStart || now >= weekEnd) return null;
    const minuteOfDay = now.getHours() * 60 + now.getMinutes();
    return (minuteOfDay / 60) * HOUR_WIDTH;
  }, [weekStart, weekEnd]);

  const todayIdx = weekDays.findIndex((d) => d.getTime() === today.getTime());

  const weekLabel = `${weekDays[0].toLocaleDateString(copy.locale, { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString(copy.locale, { month: 'short', day: 'numeric' })}`;

  const goPrev = () => {
    triggerHaptic('light');
    setWeekOffset((o) => o - 1);
  };

  const goNext = () => {
    triggerHaptic('light');
    setWeekOffset((o) => o + 1);
  };

  const goToday = () => {
    triggerHaptic('medium');
    setWeekOffset(0);
  };

  const handleBarClick = (task: Task) => {
    triggerHaptic('light');
    onEditTask(task);
  };

  return (
    <div className="w-full space-y-3 pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
              {copy.title}
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {weekLabel} · {weekTasks.length} {copy.tasksLabel} · {Math.round(totalMinutes / 60 * 10) / 10}{copy.hoursSuffix}
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
            onClick={goPrev}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            aria-label={copy.prevWeek}
          >
            {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={goNext}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            aria-label={copy.nextWeek}
          >
            {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex">
          <div className="w-12 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80">
            <div style={{ height: RULER_HEIGHT }} />
            {weekDays.map((d, i) => {
              const isToday = i === todayIdx;
              return (
                <div
                  key={i}
                  style={{ height: DAY_HEIGHT }}
                  className={`flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-800/60 ${
                    isToday ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : ''
                  }`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-wider ${
                    isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                  }`}>
                    {copy.weekDayShort(d)}
                  </span>
                  <span className={`text-[11px] font-bold ${
                    isToday ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-x-auto no-scrollbar">
            <div style={{ width: TOTAL_WIDTH, minWidth: '100%' }}>
              <div
                className="relative border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80"
                style={{ height: RULER_HEIGHT, width: TOTAL_WIDTH }}
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <div
                    key={h}
                    className="absolute top-0 bottom-0 flex items-center justify-center"
                    style={{ left: h * HOUR_WIDTH, width: HOUR_WIDTH }}
                  >
                    {h % 3 === 0 && (
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                        {formatHourLabel(h, lang)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="relative">
                {nowLine !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none"
                    style={{ left: nowLine }}
                  >
                    <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-rose-500 shadow-md" />
                  </div>
                )}

                {weekDays.map((d, dayIdx) => {
                  const key = dayKey(d);
                  const dayTasks = tasksByDay[key] || [];
                  const isToday = dayIdx === todayIdx;
                  return (
                    <div
                      key={dayIdx}
                      className={`relative border-b border-slate-100 dark:border-slate-800/60 ${
                        isToday ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''
                      }`}
                      style={{ height: DAY_HEIGHT, width: TOTAL_WIDTH }}
                    >
                      {Array.from({ length: 24 }).map((_, h) => (
                        <div
                          key={h}
                          className={`absolute top-0 bottom-0 border-l ${
                            h % 3 === 0
                              ? 'border-slate-200 dark:border-slate-700/60'
                              : 'border-slate-100 dark:border-slate-800/40'
                          }`}
                          style={{ left: h * HOUR_WIDTH }}
                        />
                      ))}

                      {dayTasks.map((task) => {
                        const due = new Date(task.dueDate);
                        if (isNaN(due.getTime())) return null;
                        const meta = QUADRANT_COLORS[task.quadrant];
                        const startMinute = due.getHours() * 60 + due.getMinutes();
                        const duration = Math.max(15, task.estimatedMinutes || 30);
                        const left = (startMinute / 60) * HOUR_WIDTH;
                        const width = Math.max(28, (duration / 60) * HOUR_WIDTH);
                        const isDone = task.status === 'completed';

                        return (
                          <button
                            key={task.id}
                            onClick={() => handleBarClick(task)}
                            title={`${task.title} · ${due.toLocaleTimeString(copy.locale, { hour: 'numeric', minute: '2-digit' })} · ${duration} min`}
                            className="absolute top-1.5 rounded-md text-left rtl:text-right transition-all hover:z-10 hover:scale-[1.02] active:scale-95 cursor-pointer"
                            style={{
                              left,
                              width,
                              height: DAY_HEIGHT - 12,
                              backgroundColor: meta.color,
                              opacity: isDone ? 0.45 : 0.95,
                              boxShadow: `0 2px 8px ${meta.color}55`,
                            }}
                          >
                            <div className="h-full flex items-center gap-1 px-1.5 overflow-hidden">
                              <span className="text-[9px] shrink-0">{meta.emoji}</span>
                              <span className={`text-[10px] font-bold text-white truncate ${isDone ? 'line-through' : ''}`}>
                                {task.title}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-1">
        {(Object.keys(QUADRANT_COLORS) as QuadrantId[]).map((q) => (
          <div key={q} className="inline-flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: QUADRANT_COLORS[q].color }}
            />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {copy.quadrants[q]}
            </span>
          </div>
        ))}
        <span className="ml-auto rtl:ml-0 rtl:mr-auto text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          {copy.scrollHint}
        </span>
      </div>

      <div>
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 px-1">
          {copy.thisWeek.replace('{count}', String(weekTasks.length))}
        </h3>

        {weekTasks.length === 0 ? (
          <div className="py-10 text-center rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
            <CalendarDays className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              {copy.nothingScheduled}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {weekTasks
              .slice()
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .map((task) => {
                const due = new Date(task.dueDate);
                const meta = QUADRANT_COLORS[task.quadrant];
                const isDone = task.status === 'completed';
                const isPast = due.getTime() < Date.now() && !isDone;

                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border bg-white dark:bg-slate-800/60 transition ${
                      isDone
                        ? 'border-slate-200 dark:border-slate-700 opacity-60'
                        : isPast
                        ? 'border-rose-200 dark:border-rose-900/60'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                    style={{ borderLeftWidth: 3, borderLeftColor: meta.color }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('success');
                        onToggleStatus(task.id);
                      }}
                      className="w-4 h-4 rounded-md border-2 shrink-0 flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                      style={{
                        borderColor: meta.color,
                        backgroundColor: isDone ? meta.color : 'transparent',
                      }}
                      aria-label={copy.toggleComplete}
                    >
                      {isDone && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBarClick(task);
                      }}
                      className="flex-1 min-w-0 text-left rtl:text-right cursor-pointer"
                    >
                      <p className={`text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 leading-tight ${
                        isDone ? 'line-through' : ''
                      }`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                          <Clock className="w-2.5 h-2.5" />
                          {due.toLocaleDateString(copy.locale, { weekday: 'short', month: 'short', day: 'numeric' })}
                          {' · '}
                          {due.toLocaleTimeString(copy.locale, { hour: 'numeric', minute: '2-digit' })}
                        </span>

                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{
                            backgroundColor: `${meta.color}18`,
                            color: meta.color,
                          }}
                        >
                          {meta.emoji} {task.estimatedMinutes || 30}m
                        </span>

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
          </div>
        )}
      </div>
    </div>
  );
};