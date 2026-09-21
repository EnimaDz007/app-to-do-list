/**
 * Data Import & Export Utilities (CSV & JSON) using Native JavaScript APIs
 */

import { Task, PriorityLevel, TaskCategory, TaskStatus, QuadrantId } from '../types';

/**
 * Triggers a file download in the browser
 */
function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export tasks as formatted JSON
 */
export function exportTasksToJSON(tasks: Task[]): void {
  const data = {
    app: 'Task Priority Mobile App',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    totalTasks: tasks.length,
    tasks,
  };
  const jsonString = JSON.stringify(data, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadBlob(jsonString, `taskflow-backup-${dateStr}.json`, 'application/json');
}

/**
 * Export tasks as RFC 4180 CSV
 */
export function exportTasksToCSV(tasks: Task[]): void {
  const headers = [
    'ID',
    'Title',
    'Description',
    'Quadrant',
    'Priority',
    'Category',
    'Status',
    'EstimatedMinutes',
    'DueDate',
    'ImpactScore',
    'EffortScore',
    'CreatedAt',
    'CompletedAt',
  ];

  const escapeCSV = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = tasks.map((t) => [
    escapeCSV(t.id),
    escapeCSV(t.title),
    escapeCSV(t.description),
    escapeCSV(t.quadrant),
    escapeCSV(t.priority),
    escapeCSV(t.category),
    escapeCSV(t.status),
    escapeCSV(t.estimatedMinutes),
    escapeCSV(t.dueDate),
    escapeCSV(t.impactScore),
    escapeCSV(t.effortScore),
    escapeCSV(t.createdAt),
    escapeCSV(t.completedAt || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadBlob(csvContent, `taskflow-tasks-${dateStr}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Import tasks from a JSON File
 */
export async function importTasksFromJSON(file: File): Promise<Task[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  let rawList: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && Array.isArray(parsed.tasks)) {
    rawList = parsed.tasks;
  } else {
    throw new Error('Invalid JSON structure: Expected an array of tasks or an object with a "tasks" property.');
  }

  const validQuadrants: QuadrantId[] = ['do_first', 'schedule', 'delegate', 'eliminate'];
  const validPriorities: PriorityLevel[] = ['urgent', 'high', 'medium', 'low'];
  const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'completed'];

  const validatedTasks: Task[] = rawList.map((item, index) => {
    const raw = item as Partial<Task>;
    if (!raw.title) {
      throw new Error(`Task at index ${index} is missing a title.`);
    }

    return {
      id: raw.id || `imported-${Date.now()}-${index}`,
      title: String(raw.title),
      description: String(raw.description || ''),
      priority: validPriorities.includes(raw.priority as PriorityLevel) ? (raw.priority as PriorityLevel) : 'medium',
      category: (raw.category as TaskCategory) || 'Engineering',
      status: validStatuses.includes(raw.status as TaskStatus) ? (raw.status as TaskStatus) : 'todo',
      quadrant: validQuadrants.includes(raw.quadrant as QuadrantId) ? (raw.quadrant as QuadrantId) : 'do_first',
      estimatedMinutes: Number(raw.estimatedMinutes) || 30,
      dueDate: raw.dueDate || new Date().toISOString().split('T')[0],
      impactScore: Math.min(5, Math.max(1, Number(raw.impactScore) || 3)),
      effortScore: Math.min(5, Math.max(1, Number(raw.effortScore) || 3)),
      createdAt: raw.createdAt || new Date().toISOString(),
      completedAt: raw.completedAt,
    };
  });

  return validatedTasks;
}

/**
 * Import tasks from a CSV File
 */
export async function importTasksFromCSV(file: File): Promise<Task[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV file contains no data rows.');
  }

  // Simple CSV line parser supporting quoted fields
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const header = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
  const rows = lines.slice(1);

  const getCol = (cells: string[], name: string): string => {
    const idx = header.findIndex((h) => h.includes(name));
    return idx !== -1 && cells[idx] !== undefined ? cells[idx] : '';
  };

  const tasks: Task[] = [];
  rows.forEach((line, index) => {
    const cells = parseLine(line);
    const title = getCol(cells, 'title');
    if (!title) return;

    const quadrantRaw = getCol(cells, 'quadrant').toLowerCase();
    const quadrant: QuadrantId =
      quadrantRaw.includes('sched')
        ? 'schedule'
        : quadrantRaw.includes('del')
        ? 'delegate'
        : quadrantRaw.includes('elim')
        ? 'eliminate'
        : 'do_first';

    const statusRaw = getCol(cells, 'status').toLowerCase();
    const status: TaskStatus = statusRaw.includes('prog')
      ? 'in_progress'
      : statusRaw.includes('comp') || statusRaw.includes('done')
      ? 'completed'
      : 'todo';

    tasks.push({
      id: getCol(cells, 'id') || `csv-${Date.now()}-${index}`,
      title,
      description: getCol(cells, 'desc'),
      priority: (getCol(cells, 'priority').toLowerCase() as PriorityLevel) || 'medium',
      category: (getCol(cells, 'cat') as TaskCategory) || 'Engineering',
      status,
      quadrant,
      estimatedMinutes: parseInt(getCol(cells, 'estimate') || getCol(cells, 'min'), 10) || 30,
      dueDate: getCol(cells, 'due') || new Date().toISOString().split('T')[0],
      impactScore: parseInt(getCol(cells, 'impact'), 10) || 3,
      effortScore: parseInt(getCol(cells, 'effort'), 10) || 3,
      createdAt: getCol(cells, 'creat') || new Date().toISOString(),
      completedAt: getCol(cells, 'comp'),
    });
  });

  return tasks;
}
