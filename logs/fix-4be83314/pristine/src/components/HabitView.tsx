import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Flame, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { Habit, HabitCheckIn } from '../types';
import { HabitHeatmap } from './HabitHeatmap';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';

interface HabitViewProps {
  habits: Habit[];
  checkIns: HabitCheckIn[];
  onToggleCheckIn: (habitId: string, date: string) => void;
  onIncrementCount: (habitId: string, date: string) => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onOpenNewHabit: () => void;
}

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  title: string;
  completedToday: string;   // "{done} of {total} completed today"
  newBtn: string;
  noHabitsTitle: string;
  noHabitsSubtitle: string;
  createFirst: string;
  todaySection: string;
  noHabitsToday: string;
  countToday: string;       // "{count}/{goal} today"
  doneToday: string;
  notDoneYet: string;
  edit: string;
  delete: string;
  allHabits: string;
  totalLabel: string;       // "{count} total"
  confirmDelete: string;    // Delete "{name}" and all its history?
}> = {
  en: {
    title: 'Habits',
    completedToday: '{done} of {total} completed today',
    newBtn: 'New',
    noHabitsTitle: 'No habits yet',
    noHabitsSubtitle: 'Build a streak, one day at a time.',
    createFirst: 'Create your first habit',
    todaySection: 'Today',
    noHabitsToday: 'No habits scheduled today. Enjoy the rest! 🎉',
    countToday: '{count}/{goal} today',
    doneToday: 'Done today ✓',
    notDoneYet: 'Not done yet',
    edit: 'Edit',
    delete: 'Delete',
    allHabits: 'All Habits',
    totalLabel: '{count} total',
    confirmDelete: 'Delete "{name}" and all its history?',
  },
  fr: {
    title: 'Habitudes',
    completedToday: '{done} sur {total} complétées aujourd’hui',
    newBtn: 'Nouvelle',
    noHabitsTitle: 'Aucune habitude',
    noHabitsSubtitle: 'Construisez une série, un jour à la fois.',
    createFirst: 'Créer votre première habitude',
    todaySection: 'Aujourd’hui',
    noHabitsToday: 'Aucune habitude prévue aujourd’hui. Profitez du reste ! 🎉',
    countToday: '{count}/{goal} aujourd’hui',
    doneToday: 'Fait aujourd’hui ✓',
    notDoneYet: 'Pas encore fait',
    edit: 'Modifier',
    delete: 'Supprimer',
    allHabits: 'Toutes les habitudes',
    totalLabel: '{count} au total',
    confirmDelete: 'Supprimer « {name} » et tout son historique ?',
  },
  ar: {
    title: 'العادات',
    completedToday: '{done} من {total} أُكملت اليوم',
    newBtn: 'جديدة',
    noHabitsTitle: 'لا توجد عادات بعد',
    noHabitsSubtitle: 'ابنِ سلسلة، يوماً بيوم.',
    createFirst: 'أنشئ عادتك الأولى',
    todaySection: 'اليوم',
    noHabitsToday: 'لا توجد عادات مجدولة اليوم. استمتع بالباقي! 🎉',
    countToday: '{count}/{goal} اليوم',
    doneToday: 'مكتملة اليوم ✓',
    notDoneYet: 'لم تُكمل بعد',
    edit: 'تعديل',
    delete: 'حذف',
    allHabits: 'كل العادات',
    totalLabel: '{count} الإجمالي',
    confirmDelete: 'حذف "{name}" وكل سجلها؟',
  },
};

function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isHabitScheduledForDay(habit: Habit, date: Date): boolean {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekly' || habit.frequency === 'custom') {
    return (habit.daysOfWeek || []).includes(date.getDay());
  }
  return false;
}

function computeStreak(habit: Habit, checkInMap: Record<string, number>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  const maxLookback = 3650;

  for (let i = 0; i < maxLookback; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    const isScheduled = isHabitScheduledForDay(habit, d);
    const isCompleted = (checkInMap[key] || 0) > 0;

    if (!isScheduled) continue;
    if (isCompleted) {
      streak++;
    } else {
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

export const HabitView: React.FC<HabitViewProps> = ({
  habits,
  checkIns,
  onToggleCheckIn,
  onIncrementCount,
  onEditHabit,
  onDeleteHabit,
  onOpenNewHabit,
}) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  const [highlightedHabitId, setHighlightedHabitId] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toLocalDateKey(today);

  const checkInMapByHabit = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    checkIns.forEach((ci) => {
      if (!map[ci.habitId]) map[ci.habitId] = {};
      map[ci.habitId][ci.date] = (map[ci.habitId][ci.date] || 0) + ci.count;
    });
    return map;
  }, [checkIns]);

  const activeHabits = habits.filter((h) => !h.archivedAt);
  const todaysHabits = activeHabits.filter((h) => isHabitScheduledForDay(h, today));

  const completedToday = todaysHabits.filter((h) => {
    const map = checkInMapByHabit[h.id] || {};
    const count = map[todayKey] || 0;
    if (h.goalType === 'count') return count >= (h.goalCount || 1);
    return count > 0;
  }).length;

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { habitId?: string } | undefined;
      const habitId = detail?.habitId;
      if (!habitId) return;

      setExpandedHabitId(habitId);
      setHighlightedHabitId(habitId);

      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedHabitId(null);
        highlightTimerRef.current = null;
      }, 5000);
    };

    window.addEventListener('open-habit', handler as EventListener);
    return () => {
      window.removeEventListener('open-habit', handler as EventListener);
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!highlightedHabitId) return;

    const timer = window.setTimeout(() => {
      const el = document.querySelector(
        `[data-habit-id="${highlightedHabitId}"]`
      ) as HTMLElement | null;
      if (!el) return;

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      el.classList.add('ring-4', 'ring-amber-400', 'animate-pulse');
      window.setTimeout(() => {
        el.classList.remove('ring-4', 'ring-amber-400', 'animate-pulse');
      }, 4000);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [highlightedHabitId, expandedHabitId]);

  const handleToggle = (habit: Habit) => {
    triggerHaptic('success');
    onToggleCheckIn(habit.id, todayKey);
  };

  const handleCountChange = (habit: Habit, delta: number) => {
    triggerHaptic('light');
    if (delta > 0) {
      onIncrementCount(habit.id, todayKey);
    } else {
      onToggleCheckIn(habit.id, todayKey);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-start">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{copy.title}</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {copy.completedToday
              .replace('{done}', String(completedToday))
              .replace('{total}', String(todaysHabits.length))}
          </p>
        </div>
        <button
          onClick={onOpenNewHabit}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{copy.newBtn}</span>
        </button>
      </div>

      {/* Empty state */}
      {activeHabits.length === 0 && (
        <div className="text-center py-12 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-700">
          <div className="text-4xl mb-2">🌱</div>
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{copy.noHabitsTitle}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
            {copy.noHabitsSubtitle}
          </p>
          <button
            onClick={onOpenNewHabit}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
          >
            {copy.createFirst}
          </button>
        </div>
      )}

      {/* Today's habits */}
      {activeHabits.length > 0 && (
        <>
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 text-start">
              {copy.todaySection}
            </h3>
            <div className="space-y-2">
              {todaysHabits.length === 0 && (
                <p className="text-[11px] text-slate-400 italic text-start">
                  {copy.noHabitsToday}
                </p>
              )}
              {todaysHabits.map((habit) => {
                const map = checkInMapByHabit[habit.id] || {};
                const count = map[todayKey] || 0;
                const goalCount = habit.goalCount || 1;
                const isComplete = habit.goalType === 'count'
                  ? count >= goalCount
                  : count > 0;
                const streak = computeStreak(habit, map);
                const isExpanded = expandedHabitId === habit.id;

                return (
                  <div
                    key={habit.id}
                    data-habit-id={habit.id}
                    className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 overflow-hidden transition-all"
                    style={isComplete ? { borderColor: habit.color } : undefined}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <button
                        onClick={() => handleToggle(habit)}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all active:scale-90 cursor-pointer shrink-0"
                        style={{
                          backgroundColor: isComplete ? habit.color : habit.color + '20',
                          border: `2px solid ${habit.color}`,
                        }}
                      >
                        {isComplete ? '✓' : habit.emoji}
                      </button>

                      <div className="flex-1 min-w-0 text-start">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {habit.name}
                          </p>
                          {streak > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-500 shrink-0">
                              <Flame className="w-3 h-3" />
                              {streak}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {habit.goalType === 'count'
                            ? copy.countToday
                                .replace('{count}', String(count))
                                .replace('{goal}', String(goalCount))
                            : isComplete ? copy.doneToday : copy.notDoneYet}
                        </p>
                      </div>

                      {habit.goalType === 'count' && !isComplete && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCountChange(habit, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                            disabled={count === 0}
                          >
                            −
                          </button>
                          <button
                            onClick={() => handleCountChange(habit, +1)}
                            className="w-7 h-7 rounded-lg text-white font-bold text-sm cursor-pointer"
                            style={{ backgroundColor: habit.color }}
                          >
                            +
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          setExpandedHabitId(isExpanded ? null : habit.id);
                        }}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-200 dark:border-slate-700 p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                        <HabitHeatmap
                          checkInMap={map}
                          color={habit.color}
                          days={90}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEditHabit(habit)}
                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
                          >
                            <Pencil className="w-3 h-3" />
                            {copy.edit}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(copy.confirmDelete.replace('{name}', habit.name))) {
                                onDeleteHabit(habit.id);
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-semibold cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/60"
                          >
                            <Trash2 className="w-3 h-3" />
                            {copy.delete}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {activeHabits.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 mt-4 text-start">
                {copy.allHabits}
              </h3>
              <div className="space-y-2">
                {activeHabits.map((habit) => {
                  const map = checkInMapByHabit[habit.id] || {};
                  const streak = computeStreak(habit, map);
                  const totalDays = Object.values(map).filter((c) => c > 0).length;
                  return (
                    <button
                      key={habit.id}
                      data-habit-id={habit.id}
                      onClick={() => setExpandedHabitId(expandedHabitId === habit.id ? null : habit.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-start transition-all"
                    >
                      <span className="text-lg">{habit.emoji}</span>
                      <div className="flex-1 min-w-0 text-start">
                        <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {habit.name}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {streak > 0 && <span className="text-orange-500 font-bold">🔥 {streak} · </span>}
                          {copy.totalLabel.replace('{count}', String(totalDays))}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};