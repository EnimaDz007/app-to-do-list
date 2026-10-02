import { Task, QuadrantId, PriorityLevel, TaskCategory } from '../types';

export interface ViewFilter {
  quadrant?: QuadrantId;
  category?: TaskCategory;
  priority?: PriorityLevel;
  context?: string;
  status?: 'all' | 'active' | 'completed';
  dueWithinDays?: number;
  overdue?: boolean;
  minAgeDays?: number;
}

export interface SavedView {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  isBuiltIn: boolean;
  filter: ViewFilter;
  /** For built-in views only — resolved at render time via t() */
  i18nKey?: string;
}

export const BUILT_IN_VIEWS: SavedView[] = [
  {
    id: 'today-battlefield',
    i18nKey: 'view_today_battlefield',
    name: "Today's Battlefield",
    emoji: '⚔️',
    description: 'Do First tasks due today or overdue',
    color: '#E11D48',
    isBuiltIn: true,
    filter: { quadrant: 'do_first', status: 'active', dueWithinDays: 1 },
  },
  {
    id: 'slow-burn',
    i18nKey: 'view_slow_burn',
    name: 'Slow Burn',
    emoji: '🐌',
    description: 'Schedule tasks untouched for 14+ days',
    color: '#4F46E5',
    isBuiltIn: true,
    filter: { quadrant: 'schedule', status: 'active', minAgeDays: 14 },
  },
  {
    id: 'delegation-pending',
    i18nKey: 'view_delegation_pending',
    name: 'Delegation Pending',
    emoji: '👥',
    description: 'Delegate tasks open for 3+ days',
    color: '#059669',
    isBuiltIn: true,
    filter: { quadrant: 'delegate', status: 'active', minAgeDays: 3 },
  },
  {
    id: 'dead-weight',
    i18nKey: 'view_dead_weight',
    name: 'Dead Weight',
    emoji: '🪦',
    description: 'Eliminate tasks open for 14+ days',
    color: '#64748B',
    isBuiltIn: true,
    filter: { quadrant: 'eliminate', status: 'active', minAgeDays: 14 },
  },
];

const DAY_MS = 86400000;

export function applyViewFilter(tasks: Task[], filter: ViewFilter): Task[] {
  const now = Date.now();
  return tasks.filter((t) => {
    if (filter.quadrant && t.quadrant !== filter.quadrant) return false;
    if (filter.category && t.category !== filter.category) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    if (filter.context && !(t.contexts || []).includes(filter.context)) return false;

    if (filter.status === 'active' && t.status === 'completed') return false;
    if (filter.status === 'completed' && t.status !== 'completed') return false;

    if (filter.dueWithinDays !== undefined) {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate).getTime();
      if (isNaN(due)) return false;
      if (due > now + filter.dueWithinDays * DAY_MS) return false;
    }

    if (filter.overdue) {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate).getTime();
      if (isNaN(due) || due >= now) return false;
    }

    if (filter.minAgeDays !== undefined) {
      if (!t.createdAt) return false;
      const created = new Date(t.createdAt).getTime();
      if (isNaN(created)) return false;
      if (created > now - filter.minAgeDays * DAY_MS) return false;
    }

    return true;
  });
}