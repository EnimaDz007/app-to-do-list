import React, { useState, useMemo } from 'react';
import { Plus, Flame, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { Habit, HabitCheckIn } from '../types';
import { HabitHeatmap } from './HabitHeatmap';
import { triggerHaptic } from '../utils/haptics';

interface HabitViewProps {
  habits: Habit[];
  checkIns: HabitCheckIn[];
  onToggleCheckIn: (habitId: string, date: string) => void;
  onIncrementCount: (habitId: string, date: string) => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onOpenNewHabit: () => void;
}

// Format Date to 'YYYY-MM-DD' in LOCAL time
function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Check if the habit is scheduled for this day
function isHabitScheduledForDay(habit: Habit, date: Date): boolean {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekly' || habit.frequency === 'custom') {
    return (habit.daysOfWeek || []).includes(date.getDay());
  }
  return false;
}

// Calculate current streak (consecutive scheduled days completed)
function computeStreak(habit: Habit, checkInMap: Record<string, number>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  const maxLookback = 3650; // safety cap

  for (let i = 0; i < maxLookback; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    const isScheduled = isHabitScheduledForDay(habit, d);
    const isCompleted = (checkInMap[key] || 0) > 0;

    if (!isScheduled) {
      // skip non-scheduled days
      continue;
    }
    if (isCompleted) {
      streak++;
    } else {
      // miss on a scheduled day → streak breaks
      // BUT if the miss is today, don't break the streak (user still has today)
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
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toLocalDateKey(today);

  // Group check-ins by habit → date → count
  const checkInMapByHabit = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    checkIns.forEach((ci) => {
      if (!map[ci.habitId]) map[ci.habitId] = {};
      map[ci.habitId][ci.date] = (map[ci.habitId][ci.date] || 0) + ci.count;
    });
    return map;
  }, [checkIns]);

  const activeHabits = habits.filter((h) => !h.archivedAt);

  // Today's scheduled habits
  const todaysHabits = activeHabits.filter((h) => isHabitScheduledForDay(h, today));

  // Counts
  const completedToday = todaysHabits.filter((h) => {
    const map = checkInMapByHabit[h.id] || {};
    const count = map[todayKey] || 0;
    if (h.goalType === 'count') return count >= (h.goalCount || 1);
    return count > 0;
  }).length;

  const handleToggle = (habit: Habit) => {
    triggerHaptic('success');
    onToggleCheckIn(habit.id, todayKey);
  };

  const handleCountChange = (habit: Habit, delta: number) => {
    triggerHaptic('light');
    if (delta > 0) {
      onIncrementCount(habit.id, todayKey);
    } else {
      onToggleCheckIn(habit.id, todayKey); // reuse toggle for decrement via a special path
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Habits</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {completedToday} of {todaysHabits.length} completed today
          </p>
        </div>
        <button
          onClick={onOpenNewHabit}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>
      </div>

      {/* Empty state */}
      {activeHabits.length === 0 && (
        <div className="text-center py-12 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-700">
          <div className="text-4xl mb-2">🌱</div>
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">No habits yet</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
            Build a streak, one day at a time.
          </p>
          <button
            onClick={onOpenNewHabit}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
          >
            Create your first habit
          </button>
        </div>
      )}

      {/* Today's habits */}
      {activeHabits.length > 0 && (
        <>
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Today
            </h3>
            <div className="space-y-2">
              {todaysHabits.length === 0 && (
                <p className="text-[11px] text-slate-400 italic">
                  No habits scheduled today. Enjoy the rest! 🎉
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
                    className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 overflow-hidden transition-all"
                    style={isComplete ? { borderColor: habit.color } : undefined}
                  >
                    {/* Main row */}
                    <div className="flex items-center gap-3 p-3">
                      {/* Big icon / check button */}
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

                      {/* Info */}
                      <div className="flex-1 min-w-0">
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
                            ? `${count}/${goalCount} today`
                            : isComplete ? 'Done today ✓' : 'Not done yet'}
                        </p>
                      </div>

                      {/* Count controls (if count type) */}
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

                      {/* Expand toggle */}
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

                    {/* Expanded: heatmap + edit/delete */}
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
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${habit.name}" and all its history?`)) {
                                onDeleteHabit(habit.id);
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-semibold cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/60"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* All habits */}
          {activeHabits.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 mt-4">
                All Habits
              </h3>
              <div className="space-y-2">
                {activeHabits.map((habit) => {
                  const map = checkInMapByHabit[habit.id] || {};
                  const streak = computeStreak(habit, map);
                  const totalDays = Object.values(map).filter((c) => c > 0).length;
                  return (
                    <button
                      key={habit.id}
                      onClick={() => setExpandedHabitId(expandedHabitId === habit.id ? null : habit.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-left"
                    >
                      <span className="text-lg">{habit.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {habit.name}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {streak > 0 && <span className="text-orange-500 font-bold">🔥 {streak} · </span>}
                          {totalDays} total
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