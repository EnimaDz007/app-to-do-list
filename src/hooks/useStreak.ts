import { useMemo } from 'react';
import { Task } from '../types';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  totalDaysActive: number;
}

/**
 * Format a Date as a local-time YYYY-MM-DD key.
 * Matches the pattern used by MonthCalendarView + useKarma.
 */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Compute streak data from the tasks array.
 *
 * - Uses LOCAL dates (not UTC) — a task completed at 11pm in New York
 *   counts as that same local day, not tomorrow UTC.
 * - No localStorage — syncs across devices because tasks sync.
 * - Restoring a backup restores the streak automatically.
 *
 * New signature: pass the tasks array (not a count).
 */
export function useStreak(tasks: Task[]): StreakData {
  return useMemo(() => {
    // 1) Collect unique local dates that have at least one completed task.
    const completedDates = new Set<string>();
    for (const t of tasks) {
      if (t.status !== 'completed') continue;
      if (!t.completedAt) continue;
      const d = new Date(t.completedAt);
      if (isNaN(d.getTime())) continue;
      completedDates.add(toLocalDateKey(d));
    }

    if (completedDates.size === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null,
        totalDaysActive: 0,
      };
    }

    const sortedAsc = Array.from(completedDates).sort(); // ascending: oldest → newest
    const sortedDesc = [...sortedAsc].reverse();

    // 2) Current streak — walk backwards from today (or yesterday if
    //    today has no activity yet, which keeps the streak alive).
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toLocalDateKey(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toLocalDateKey(yesterday);

    let currentStreak = 0;
    let cursor: string | null = completedDates.has(todayKey)
      ? todayKey
      : completedDates.has(yesterdayKey)
      ? yesterdayKey
      : null;

    while (cursor && completedDates.has(cursor)) {
      currentStreak++;
      const prev = new Date(cursor + 'T00:00:00');
      prev.setDate(prev.getDate() - 1);
      cursor = toLocalDateKey(prev);
    }

    // 3) Longest streak — single pass over ascending dates.
    let longestStreak = 0;
    let run = 0;
    let prevKey: string | null = null;
    for (const key of sortedAsc) {
      if (prevKey) {
        const prevDate = new Date(prevKey + 'T00:00:00');
        prevDate.setDate(prevDate.getDate() + 1);
        const expectedNext = toLocalDateKey(prevDate);
        run = expectedNext === key ? run + 1 : 1;
      } else {
        run = 1;
      }
      if (run > longestStreak) longestStreak = run;
      prevKey = key;
    }

    return {
      currentStreak,
      longestStreak,
      lastCompletedDate: sortedDesc[0] || null,
      totalDaysActive: completedDates.size,
    };
  }, [tasks]);
}