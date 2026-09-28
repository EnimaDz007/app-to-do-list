export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';

export type QuadrantId = 'do_first' | 'schedule' | 'delegate' | 'eliminate';

export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export type TaskCategory = 
  | 'Engineering' 
  | 'Product' 
  | 'Design' 
  | 'Operations' 
  | 'Client' 
  | 'Marketing' 
  | 'Personal';

// 🔁 Recurrence types (Phase 7)
export type RecurrenceFrequency = 
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'monthly'
  | 'yearly';

export interface Recurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
}

// 🎯 Habit Tracker types (Phase 8)
export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export type HabitGoalType = 'check' | 'count'; // check = done/not done, count = target number per day

export interface Habit {
  id: string;
  name: string;
  description?: string;
  emoji: string;                 // e.g. "🏃", "📚"
  color: string;                 // hex color, e.g. "#8b5cf6"
  frequency: HabitFrequency;
  daysOfWeek?: number[];         // 0=Sun..6=Sat (used for 'weekly' and 'custom')
  goalType: HabitGoalType;       // check or count
  goalCount?: number;            // e.g. 8 glasses of water
  reminderTime?: string;         // "HH:MM" (24h) or undefined
  reminderEnabled: boolean;
  createdAt: string;
  archivedAt?: string;
}

export interface HabitCheckIn {
  id: string;                    // `${habitId}_${YYYY-MM-DD}`
  habitId: string;
  date: string;                  // 'YYYY-MM-DD' in LOCAL timezone
  count: number;                 // >= 1; for goalType 'check' it stays 1
  note?: string;
  completedAt: string;           // ISO timestamp
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  archivedAt?: string;
  priority: PriorityLevel;
  category: TaskCategory;
  status: TaskStatus;
  quadrant: QuadrantId;
  estimatedMinutes: number;
  dueDate: string;
  impactScore: number;
  effortScore: number;
  createdAt: string;
  completedAt?: string;
  pinned?: boolean;
  subtasks?: Subtask[];
  recurrence?: Recurrence;
}

export type TabView = 'matrix' | 'list' | 'timeline' | 'analytics' | 'habits' | 'export' | 'archive';

export type DeviceFrameMode = 'iphone' | 'android' | 'responsive';

export interface QuadrantInfo {
  id: QuadrantId;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}