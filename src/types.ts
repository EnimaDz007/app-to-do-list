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
}

export interface HabitCheckIn {
  id: string;
  habitId: string;
  date: string;
  count: number;
  note?: string;
  completedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  subtasks?: Subtask[];   // recursive — enables unlimited nesting
}

export interface Milestone {
  id: string;
  name: string;
  emoji: string;
  targetDate: string;
  color: string;
  createdAt: string;
  archivedAt?: string;
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
  delegateId?: string;
  delegateStatus?: DelegateStatus;
  delegateCompletedBy?: string;
  delegateCompletedAt?: string;
}

/* ─────────────────────────────────────────────────────────
   NEW — Task Templates
   ───────────────────────────────────────────────────────── */

export interface Template {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  /** Preset fields applied to the new task */
  preset: {
    category?: TaskCategory;
    quadrant?: QuadrantId;
    estimatedMinutes?: number;
    impactScore?: number;
    effortScore?: number;
    contexts?: string[];
    priority?: PriorityLevel;
  };
  /** The full nested subtask tree to clone into the new task */
  subtasks: Subtask[];
  createdAt: string;
  /** true for the 3 shipped templates — can't be deleted, only duplicated */
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
  | 'archive';

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