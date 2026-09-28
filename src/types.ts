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

// 🔁 Recurrence types
export type RecurrenceFrequency = 
  | 'daily'       // every N days
  | 'weekdays'    // Mon–Fri only
  | 'weekly'      // specific days of the week
  | 'monthly'     // specific day of month
  | 'yearly';     // same date every year

export interface Recurrence {
  frequency: RecurrenceFrequency;
  interval: number;             // e.g. 2 for "every 2 days/weeks/months"
  daysOfWeek?: number[];        // 0=Sun, 1=Mon, ..., 6=Sat (used for 'weekly')
  dayOfMonth?: number;          // 1–31 (used for 'monthly')
  endDate?: string;             // ISO date; optional stop date
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
  impactScore: number; // 1 - 5
  effortScore: number; // 1 - 5
  createdAt: string;
  completedAt?: string;
  pinned?: boolean;
  subtasks?: Subtask[];
  // 🔁 NEW: optional recurrence rule
  recurrence?: Recurrence;
}

export type TabView = 'matrix' | 'list' | 'timeline' | 'analytics' | 'export' | 'archive';

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