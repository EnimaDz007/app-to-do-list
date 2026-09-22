import { useState, useEffect } from 'react';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  totalDaysActive: number;
}

const STORAGE_KEY = 'taskpriority-streak-v1';

export const useStreak = (totalCompleted: number) => {
  const [data, setData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
    totalDaysActive: 0,
  });

  // Load saved streak on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData({
          currentStreak: parsed.currentStreak || 0,
          longestStreak: parsed.longestStreak || 0,
          lastCompletedDate: parsed.lastCompletedDate || null,
          totalDaysActive: parsed.totalDaysActive || 0,
        });
      }
    } catch (e) {}
  }, []);

  // Update streak when tasks are completed
  useEffect(() => {
    if (totalCompleted === 0) return;
    const today = new Date().toISOString().split('T')[0];
    if (data.lastCompletedDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const newStreak = data.lastCompletedDate === yesterdayStr ? data.currentStreak + 1 : 1;
    const newLongest = Math.max(newStreak, data.longestStreak);

    const updated: StreakData = {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastCompletedDate: today,
      totalDaysActive: data.totalDaysActive + 1,
    };

    setData(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch (e) {}
  }, [totalCompleted, data.lastCompletedDate, data.currentStreak, data.longestStreak, data.totalDaysActive]);

  return data;
};
