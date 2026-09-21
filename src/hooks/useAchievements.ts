import { useState, useEffect, useRef } from 'react';

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlockedAt?: string;
}

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_task', emoji: '🎯', title: 'First Step', description: 'Complete your first task' },
  { id: 'ten_tasks', emoji: '🔟', title: 'Getting Started', description: 'Complete 10 tasks' },
  { id: 'fifty_tasks', emoji: '🏆', title: 'Half Century', description: 'Complete 50 tasks' },
  { id: 'hundred_tasks', emoji: '💎', title: 'Century Club', description: 'Complete 100 tasks' },
  { id: 'streak_3', emoji: '🔥', title: 'On Fire', description: '3 day streak' },
  { id: 'streak_7', emoji: '⚡', title: 'Unstoppable', description: '7 day streak' },
  { id: 'streak_30', emoji: '👑', title: 'Legend', description: '30 day streak' },
  { id: 'perfect_day', emoji: '✨', title: 'Perfect Day', description: 'Complete 5 tasks in one day' },
];

const STORAGE_KEY = 'taskpriority-achievements-v1';

export const useAchievements = (totalCompleted: number, currentStreak: number) => {
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);
  const justChecked = useRef(false);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setUnlocked(JSON.parse(saved));
    } catch (e) {}
  }, []);

  // Check for new unlocks
  useEffect(() => {
    if (justChecked.current) return;
    justChecked.current = true;

    const newUnlocks: string[] = [];

    if (totalCompleted >= 1 && !unlocked.first_task) newUnlocks.push('first_task');
    if (totalCompleted >= 10 && !unlocked.ten_tasks) newUnlocks.push('ten_tasks');
    if (totalCompleted >= 50 && !unlocked.fifty_tasks) newUnlocks.push('fifty_tasks');
    if (totalCompleted >= 100 && !unlocked.hundred_tasks) newUnlocks.push('hundred_tasks');
    if (currentStreak >= 3 && !unlocked.streak_3) newUnlocks.push('streak_3');
    if (currentStreak >= 7 && !unlocked.streak_7) newUnlocks.push('streak_7');
    if (currentStreak >= 30 && !unlocked.streak_30) newUnlocks.push('streak_30');
    if (totalCompleted >= 5 && !unlocked.perfect_day) newUnlocks.push('perfect_day');

    if (newUnlocks.length > 0) {
      const timestamp = new Date().toISOString();
      const updated = { ...unlocked };
      newUnlocks.forEach((id) => { updated[id] = timestamp; });
      setUnlocked(updated);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch (e) {}

      const firstNew = ALL_ACHIEVEMENTS.find((a) => a.id === newUnlocks[0]);
      if (firstNew) {
        setNewlyUnlocked(firstNew);
        setTimeout(() => setNewlyUnlocked(null), 4000);
      }
    }
  }, [totalCompleted, currentStreak, unlocked]);

  return { unlocked, newlyUnlocked, allAchievements: ALL_ACHIEVEMENTS };
};
