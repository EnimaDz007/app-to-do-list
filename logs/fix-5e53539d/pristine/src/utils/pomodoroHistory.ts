/* ============================================================
   POMODORO HISTORY — offline session log
   Stored in localStorage under `taskflow_pomodoro_sessions`.
   Each entry is one finished (or cancelled) focus session.
   ============================================================ */

export interface PomodoroSession {
  id: string;
  taskId?: string;
  taskTitle: string;
  minutes: number;
  completed: boolean;
  startedAt: string;
  endedAt: string;
}

const STORAGE_KEY = 'taskflow_pomodoro_sessions';
const MAX_SESSIONS = 1000;
const LANG_STORAGE_KEY = 'taskflow_language';

type Lang = 'en' | 'fr' | 'ar';

const DAY_LABELS: Record<Lang, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  ar: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
};

function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (v === 'en' || v === 'fr' || v === 'ar') return v;
  } catch { /* noop */ }
  return 'en';
}

export function getSessions(): PomodoroSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function logSession(session: PomodoroSession): void {
  try {
    const current = getSessions();
    const next = [session, ...current].slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* noop */ }
}

export function clearSessions(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export interface TodayStats {
  minutes: number;
  count: number;
  completedCount: number;
  sessions: PomodoroSession[];
}

export function getTodayStats(): TodayStats {
  const todayKey = toDateKey(new Date());
  const all = getSessions();
  const sessions = all.filter((s) => toDateKey(new Date(s.endedAt)) === todayKey);
  return {
    minutes: sessions.reduce((sum, s) => sum + s.minutes, 0),
    count: sessions.length,
    completedCount: sessions.filter((s) => s.completed).length,
    sessions,
  };
}

export interface DayStats {
  date: string;
  dayLabel: string;
  minutes: number;
  count: number;
  isToday: boolean;
}

export function getWeekStats(): DayStats[] {
  const all = getSessions();
  const result: DayStats[] = [];
  const labels = DAY_LABELS[readLang()] ?? DAY_LABELS.en;

  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i);
    const key = toDateKey(d);
    const daySessions = all.filter((s) => toDateKey(new Date(s.endedAt)) === key);
    result.push({
      date: key,
      dayLabel: labels[d.getDay()],
      minutes: daySessions.reduce((sum, s) => sum + s.minutes, 0),
      count: daySessions.length,
      isToday: i === 0,
    });
  }
  return result;
}

export interface TopTask {
  taskId?: string;
  taskTitle: string;
  minutes: number;
  sessions: number;
}

export function getTopTasks(limit = 5): TopTask[] {
  const all = getSessions();
  const map = new Map<string, TopTask>();

  for (const s of all) {
    const key = s.taskId ?? `title:${s.taskTitle}`;
    const existing = map.get(key);
    if (existing) {
      existing.minutes += s.minutes;
      existing.sessions += 1;
    } else {
      map.set(key, {
        taskId: s.taskId,
        taskTitle: s.taskTitle,
        minutes: s.minutes,
        sessions: 1,
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, limit);
}

export function getStreak(): number {
  const sessions = getSessions().filter((s) => s.completed);
  if (sessions.length === 0) return 0;

  const days = new Set(sessions.map((s) => toDateKey(new Date(s.endedAt))));

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key = toDateKey(daysAgo(i));
    if (days.has(key)) {
      streak += 1;
    } else {
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

export interface TotalStats {
  totalMinutes: number;
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
}

export function getTotalStats(): TotalStats {
  const sessions = getSessions();
  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const completedSessions = sessions.filter((s) => s.completed).length;
  const completionRate = sessions.length > 0
    ? Math.round((completedSessions / sessions.length) * 100)
    : 0;
  return {
    totalMinutes,
    totalSessions: sessions.length,
    completedSessions,
    completionRate,
  };
}

export function emitPomodoroCompleted(minutes: number, completed: boolean): void {
  try {
    window.dispatchEvent(new CustomEvent('pomodoro-session-ended', {
      detail: { minutes, completed },
    }));
  } catch { /* noop */ }
}