import type { Template, Subtask, Task, QuadrantId, PriorityLevel } from '../types';

/* ─────────────────────────────────────────────
   ID generator (mirrors subtaskHelpers)
   ───────────────────────────────────────────── */
const makeId = () =>
  `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const makeSubtaskId = () =>
  `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/* ─────────────────────────────────────────────
   Deep-clone a subtask tree with brand-new IDs.
   Template IDs must NOT be reused, or two tasks created from the
   same template would share node IDs (breaks toggling).
   ───────────────────────────────────────────── */
export function cloneSubtaskTree(tree: Subtask[]): Subtask[] {
  return tree.map((node) => ({
    id: makeSubtaskId(),
    title: node.title,
    done: false,
    subtasks: node.subtasks?.length ? cloneSubtaskTree(node.subtasks) : undefined,
  }));
}

/* ─────────────────────────────────────────────
   Count total nodes in a subtask tree (for UI badges)
   ───────────────────────────────────────────── */
export function countTemplateSubtasks(tree: Subtask[]): number {
  let n = 0;
  const walk = (nodes: Subtask[]) => {
    for (const node of nodes) {
      n += 1;
      if (node.subtasks?.length) walk(node.subtasks);
    }
  };
  walk(tree);
  return n;
}

/* ─────────────────────────────────────────────
   Build a brand-new Task from a template
   ───────────────────────────────────────────── */
export function applyTemplate(
  template: Template,
  overrides: Partial<Task> = {}
): Omit<Task, 'id' | 'createdAt'> {
  const quadrant: QuadrantId = template.preset.quadrant ?? 'do_first';
  const priorityFromQuadrant: Record<QuadrantId, PriorityLevel> = {
    do_first: 'urgent',
    schedule: 'high',
    delegate: 'medium',
    eliminate: 'low',
  };

  return {
    title: template.name,
    description: template.description ?? '',
    quadrant,
    priority: template.preset.priority ?? priorityFromQuadrant[quadrant],
    category: template.preset.category ?? 'Personal',
    status: 'todo',
    estimatedMinutes: template.preset.estimatedMinutes ?? 30,
    dueDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    impactScore: template.preset.impactScore ?? 3,
    effortScore: template.preset.effortScore ?? 3,
    contexts: template.preset.contexts,
    subtasks: cloneSubtaskTree(template.subtasks),
    ...overrides,
  };
}

/* ─────────────────────────────────────────────
   Create a new Template FROM an existing task
   ───────────────────────────────────────────── */
export function makeTemplateFromTask(task: Task, name?: string, emoji = '📋'): Template {
  return {
    id: makeId(),
    name: name ?? task.title,
    emoji,
    description: task.description || undefined,
    isBuiltIn: false,
    createdAt: new Date().toISOString(),
    preset: {
      category: task.category,
      quadrant: task.quadrant,
      estimatedMinutes: task.estimatedMinutes,
      impactScore: task.impactScore,
      effortScore: task.effortScore,
      contexts: task.contexts,
      priority: task.priority,
    },
    // Clone without IDs so this template is independent from the source task
    subtasks: cloneSubtaskTree(task.subtasks ?? []).map(stripDoneFlag),
  };
}

/** Recursively force done=false (templates are always pristine). */
function stripDoneFlag(node: Subtask): Subtask {
  return {
    ...node,
    done: false,
    subtasks: node.subtasks?.map(stripDoneFlag),
  };
}

/* ─────────────────────────────────────────────
   localStorage persistence
   ───────────────────────────────────────────── */
export const TEMPLATES_STORAGE_KEY = 'taskflow_templates';

export function loadTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTemplates(templates: Template[]): void {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch {
    /* noop */
  }
}