import { Task, TaskCategory, PriorityLevel, QuadrantId } from '../types';
import { exportFile } from './fileExport';

/* ============================================================
   EXPORT
   ============================================================ */

export async function exportTasksToJSON(tasks: Task[]): Promise<boolean> {
  try {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: tasks.length,
      tasks,
    };
    const content = JSON.stringify(payload, null, 2);
    const stamp = new Date().toISOString().slice(0, 10);
    return await exportFile(
      `task-priority-${stamp}.json`,
      content,
      'application/json'
    );
  } catch (err) {
    console.warn('JSON export failed:', err);
    return false;
  }
}

export async function exportTasksToCSV(tasks: Task[]): Promise<boolean> {
  try {
    const headers = [
      'id', 'title', 'description', 'quadrant', 'category', 'priority',
      'status', 'estimatedMinutes', 'dueDate', 'impactScore', 'effortScore',
      'createdAt', 'completedAt', 'contexts',
    ];

    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [headers.join(',')];
    for (const t of tasks) {
      const row = [
        t.id,
        t.title,
        t.description,
        t.quadrant,
        t.category,
        t.priority,
        t.status,
        t.estimatedMinutes,
        t.dueDate,
        t.impactScore,
        t.effortScore,
        t.createdAt,
        t.completedAt || '',
        (t.contexts || []).join('|'),
      ];
      lines.push(row.map(escapeCSV).join(','));
    }

    const content = lines.join('\n');
    const stamp = new Date().toISOString().slice(0, 10);
    return await exportFile(
      `task-priority-${stamp}.csv`,
      content,
      'text/csv'
    );
  } catch (err) {
    console.warn('CSV export failed:', err);
    return false;
  }
}

/* ============================================================
   IMPORT
   ============================================================ */

export async function importTasksFromJSON(file: File): Promise<Task[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  // Support both { version, tasks: [...] } and raw [...]
  const rawTasks: any[] = Array.isArray(parsed) ? parsed : parsed.tasks || [];

  return rawTasks.map(normalizeTask).filter(Boolean) as Task[];
}

export async function importTasksFromCSV(file: File): Promise<Task[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseCSVLine = (line: string): string[] => {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') {
          out.push(current);
          current = '';
        } else current += ch;
      }
    }
    out.push(current);
    return out;
  };

  const headers = parseCSVLine(lines[0]);
  const tasks: Task[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

    const normalized = normalizeTask({
      id: row.id,
      title: row.title,
      description: row.description,
      quadrant: row.quadrant,
      category: row.category,
      priority: row.priority,
      status: row.status,
      estimatedMinutes: row.estimatedMinutes,
      dueDate: row.dueDate,
      impactScore: row.impactScore,
      effortScore: row.effortScore,
      createdAt: row.createdAt,
      completedAt: row.completedAt || undefined,
      contexts: row.contexts ? row.contexts.split('|').filter(Boolean) : [],
    });

    if (normalized) tasks.push(normalized);
  }

  return tasks;
}

/* ============================================================
   HELPERS
   ============================================================ */

function normalizeTask(raw: any): Task | null {
  if (!raw || !raw.title) return null;

  const validQuadrants: QuadrantId[] = ['do_first', 'schedule', 'delegate', 'eliminate'];
  const validCategories: TaskCategory[] = ['Engineering', 'Operations', 'Product', 'Design', 'Client', 'Marketing', 'Personal'];
  const validPriorities: PriorityLevel[] = ['urgent', 'high', 'medium', 'low'];

  const quadrant = validQuadrants.includes(raw.quadrant) ? raw.quadrant : 'do_first';
  const category = validCategories.includes(raw.category) ? raw.category : 'Personal';
  const priority = validPriorities.includes(raw.priority) ? raw.priority : 'high';

  return {
    id: raw.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: String(raw.title).slice(0, 200),
    description: String(raw.description || ''),
    quadrant,
    category,
    priority,
    status: raw.status === 'completed' ? 'completed' : 'todo',
    estimatedMinutes: Number(raw.estimatedMinutes) || 30,
    dueDate: raw.dueDate || new Date().toISOString(),
    impactScore: Number(raw.impactScore) || 3,
    effortScore: Number(raw.effortScore) || 3,
    createdAt: raw.createdAt || new Date().toISOString(),
    completedAt: raw.completedAt || undefined,
    archivedAt: raw.archivedAt || undefined,
    contexts: Array.isArray(raw.contexts) ? raw.contexts.filter((c: any) => typeof c === 'string') : undefined,
    recurrence: raw.recurrence || undefined,
    pinned: !!raw.pinned,
    subtasks: Array.isArray(raw.subtasks) ? raw.subtasks : undefined,
    delegateId: raw.delegateId || undefined,
    delegateStatus: raw.delegateStatus || undefined,
    delegateCompletedBy: raw.delegateCompletedBy || undefined,
    delegateCompletedAt: raw.delegateCompletedAt || undefined,
  };
}