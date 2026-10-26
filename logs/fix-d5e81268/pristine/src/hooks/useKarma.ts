import { useMemo } from 'react';
import { Task, Habit, HabitCheckIn, Milestone } from '../types';

export interface KarmaLevel {
  name: string;
  emoji: string;
  min: number;
  max: number;
}

export const KARMA_LEVELS: KarmaLevel[] = [
  { name: 'Beginner',     emoji: '🌱', min: 0,     max: 50 },
  { name: 'Novice',       emoji: '🌿', min: 50,    max: 200 },
  { name: 'Intermediate', emoji: '🌳', min: 200,   max: 500 },
  { name: 'Professional', emoji: '⭐', min: 500,   max: 1000 },
  { name: 'Expert',       emoji: '🏅', min: 1000,  max: 2000 },
  { name: 'Master',       emoji: '👑', min: 2000,  max: 5000 },
  { name: 'Enlightened',  emoji: '💎', min: 5000,  max: 10000 },
  { name: 'Grandmaster',  emoji: '🌟', min: 10000, max: Infinity },
];

const QUADRANT_WEIGHT: Record<string, number> = {
  do_first: 5,
  schedule: 3,
  delegate: 2,
  eliminate: 1,
};

const HABIT_WEIGHT = 2;
const STREAK_WEIGHT = 1;
const MILESTONE_WEIGHT = 10;
const LATE_PENALTY_PER_TASK = 2;
const TASKS_DAILY_GOAL = 3;

export interface KarmaState {
  total: number;
  level: KarmaLevel;
  nextLevel: KarmaLevel | null;
  progressToNext: number;
  pointsToNext: number;
  breakdown: {
    fromTasks: number;
    fromHabits: number;
    fromStreak: number;
    fromMilestones: number;
    fromPenalties: number;
  };
  rings: {
    tasksDoneToday: number;
    tasksGoal: number;
    habitsCheckedToday: number;
    habitsGoal: number;
  };
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useKarma(
  tasks: Task[],
  habits: Habit[],
  checkIns: HabitCheckIn[],
  milestones: Milestone[],
  currentStreak: number,
): KarmaState {
  return useMemo(() => {
    // ---- Task completion karma ----
    let fromTasks = 0;
    for (const t of tasks) {
      if (t.status === 'completed') {
        fromTasks += QUADRANT_WEIGHT[t.quadrant] ?? 1;
      }
    }

    // ---- Habit check-in karma ----
    const fromHabits = checkIns.length * HABIT_WEIGHT;

    // ---- Streak bonus ----
    const fromStreak = currentStreak * STREAK_WEIGHT;

    // ---- Milestone bonus (active milestones only) ----
    const fromMilestones =
      milestones.filter((m) => !m.archivedAt).length * MILESTONE_WEIGHT;

    // ---- Late penalties: Do First tasks overdue >24h & still incomplete ----
    const now = Date.now();
    const ONE_DAY = 86400000;
    let lateCount = 0;
    for (const t of tasks) {
      if (
        t.quadrant === 'do_first' &&
        t.status !== 'completed' &&
        !t.archivedAt &&
        t.dueDate
      ) {
        const due = new Date(t.dueDate).getTime();
        if (!isNaN(due) && now - due > ONE_DAY) lateCount++;
      }
    }
    const fromPenalties = -lateCount * LATE_PENALTY_PER_TASK;

    const raw = fromTasks + fromHabits + fromStreak + fromMilestones + fromPenalties;
    const total = Math.max(0, Math.round(raw));

    // ---- Level ----
    const level =
      [...KARMA_LEVELS].reverse().find((l) => total >= l.min) || KARMA_LEVELS[0];
    const idx = KARMA_LEVELS.indexOf(level);
    const nextLevel = KARMA_LEVELS[idx + 1] || null;

    let progressToNext = 1;
    let pointsToNext = 0;
    if (nextLevel) {
      const range = nextLevel.min - level.min;
      progressToNext = range > 0 ? Math.min(1, (total - level.min) / range) : 0;
      pointsToNext = Math.max(0, nextLevel.min - total);
    }

    // ---- Today's rings ----
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toLocalDateKey(today);

    const tasksDoneToday = tasks.filter((t) => {
      if (t.status !== 'completed' || !t.completedAt) return false;
      return toLocalDateKey(new Date(t.completedAt)) === todayKey;
    }).length;

    const habitsCheckedToday = checkIns
      .filter((ci) => ci.date === todayKey)
      .reduce((sum, ci) => sum + ci.count, 0);

    const habitsScheduledToday = habits.filter((h) => {
      if (h.archivedAt) return false;
      if (h.frequency === 'daily') return true;
      if (h.frequency === 'weekly' || h.frequency === 'custom') {
        return (h.daysOfWeek || []).includes(today.getDay());
      }
      return false;
    }).length;

    return {
      total,
      level,
      nextLevel,
      progressToNext,
      pointsToNext,
      breakdown: {
        fromTasks,
        fromHabits,
        fromStreak,
        fromMilestones,
        fromPenalties,
      },
      rings: {
        tasksDoneToday,
        tasksGoal: TASKS_DAILY_GOAL,
        habitsCheckedToday,
        habitsGoal: Math.max(1, habitsScheduledToday),
      },
    };
  }, [tasks, habits, checkIns, milestones, currentStreak]);
}