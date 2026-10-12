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

/** A user-defined reminder that fires at a specific time before the due date. */
export interface TaskReminder {
  /** Unique id, stable across edits — used to build the notification id. */
  id: string;
  /** ISO timestamp when this reminder should fire. */
  fireAt: string;
  /**
   * Minutes before the dueDate. 0 = at due time.
   * Kept for display ("1h before") and to recompute fireAt if dueDate changes.
   */
  minutesBefore: number;
}

export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export type HabitGoalType = 'check' | 'count';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  emoji: string;
  color: string;
  frequency: HabitFrequency;
  daysOfWeek?: number[];
  goalType: HabitGoalType;
  goalCount?: number;
  reminderTime?: string;
  reminderEnabled: boolean;
  createdAt: string;
  archivedAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface HabitCheckIn {
  id: string;
  habitId: string;
  date: string;
  count: number;
  note?: string;
  completedAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  subtasks?: Subtask[];
}

export interface Milestone {
  id: string;
  name: string;
  emoji: string;
  targetDate: string;
  color: string;
  createdAt: string;
  archivedAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

/**
 * User-defined project — a bucket for grouping tasks (like Todoist's Projects).
 * Completely independent from the Eisenhower quadrant system.
 * One task can belong to exactly one project (or none).
 */
export interface Project {
  id: string;
  name: string;
  emoji: string;
  /** Hex color like "#6366f1". Used for the accent bar and text. */
  color: string;
  createdAt: string;
  archivedAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export type DelegateStatus = 'pending' | 'completed' | 'rejected';

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
  contexts?: string[];
  milestoneId?: string;

  /** Optional user-defined project this task belongs to. */
  projectId?: string;

  delegateId?: string;
  delegateStatus?: DelegateStatus;
  delegateCompletedBy?: string;
  delegateCompletedAt?: string;

  /** Custom user-defined reminders (fired by LocalNotifications / server push). */
  reminders?: TaskReminder[];

  updatedAt?: string;
  deletedAt?: string;
}

export interface Template {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  preset: {
    category?: TaskCategory;
    quadrant?: QuadrantId;
    estimatedMinutes?: number;
    impactScore?: number;
    effortScore?: number;
    contexts?: string[];
    priority?: PriorityLevel;
  };
  subtasks: Subtask[];
  createdAt: string;
  isBuiltIn?: boolean;
}

export type TabView =
  | 'matrix'
  | 'list'
  | 'timeline'
  | 'calendar'
  | 'flow'
  | 'analytics'
  | 'habits'
  | 'review'
  | 'export'
  | 'archive'
  | 'projects';

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

export interface ContextDefinition {
  id: string;
  emoji: string;
  label: string;
  keywords: string[];
}

export const CONTEXT_DEFINITIONS: ContextDefinition[] = [
  { id: 'home',     emoji: '🏠', label: 'Home',      keywords: ['home', 'house', 'kitchen', 'bedroom', 'garage', 'garden', 'laundry', 'dishes', 'maison', 'بيت', 'منزل'] },
  { id: 'work',     emoji: '💼', label: 'Work',      keywords: ['work', 'office', 'meeting', 'standup', 'client', 'boss', 'team', 'bureau', 'réunion', 'عمل', 'اجتماع'] },
  { id: 'call',     emoji: '📞', label: 'Call',      keywords: ['call', 'phone', 'text', 'whatsapp', 'dm', 'message', 'appeler', 'téléphone', 'اتصال', 'مكالمة', 'هاتف'] },
  { id: 'computer', emoji: '💻', label: 'Deep Work', keywords: ['code', 'coding', 'email', 'deep work', 'focus', 'writing', 'docs', 'ordi', 'écrire', 'برمجة', 'كتابة'] },
  { id: 'errand',   emoji: '🛒', label: 'Errand',    keywords: ['buy', 'pick up', 'drop off', 'store', 'market', 'mall', 'supermarket', 'grocery', 'courses', 'acheter', 'تسوق', 'بقالة'] },
  { id: 'health',   emoji: '🏋️', label: 'Health',    keywords: ['gym', 'workout', 'run', 'yoga', 'doctor', 'medical', 'therapy', 'dentist', 'sport', 'santé', 'طبيب', 'رياضة'] },
];