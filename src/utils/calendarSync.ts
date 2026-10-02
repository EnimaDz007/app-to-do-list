import { Task, QuadrantId, TaskCategory } from '../types';

/**
 * Simple .ics (iCalendar) generator and parser.
 * Exports non-completed tasks with a dueDate as VEVENTs.
 * Imports any VEVENTs and converts them to Task objects.
 */

const DEFAULT_EVENT_MINUTES = 30;
const MAX_TITLE_LENGTH = 120;

// ---------- ICS helpers ----------

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatICSDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

function escapeICS(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function unescapeICS(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && i + 1 < s.length) {
      const next = s[i + 1];
      if (next === 'n' || next === 'N') { out += '\n'; i++; continue; }
      if (next === '\\') { out += '\\'; i++; continue; }
      if (next === ',') { out += ','; i++; continue; }
      if (next === ';') { out += ';'; i++; continue; }
    }
    out += c;
  }
  return out;
}

// ---------- Export ----------

export interface ExportedEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  category?: string;
}

export function tasksToEvents(tasks: Task[]): ExportedEvent[] {
  const out: ExportedEvent[] = [];
  for (const task of tasks) {
    if (task.status === 'completed') continue;
    if (task.archivedAt) continue;
    if (!task.dueDate) continue;
    const start = new Date(task.dueDate);
    if (isNaN(start.getTime())) continue;
    const minutes = Math.max(5, task.estimatedMinutes || DEFAULT_EVENT_MINUTES);
    const end = new Date(start.getTime() + minutes * 60_000);
    out.push({
      id: task.id,
      title: task.title,
      description: task.description || undefined,
      start,
      end,
      category: task.quadrant,
    });
  }
  return out;
}

export function generateICS(tasks: Task[], calendarName = 'Task Priority'): string {
  const events = tasksToEvents(tasks);
  const stamp = formatICSDate(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Task Priority//Mobile//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
  ];

  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeICS(ev.id)}@taskpriority`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${formatICSDate(ev.start)}`);
    lines.push(`DTEND:${formatICSDate(ev.end)}`);
    lines.push(`SUMMARY:${escapeICS(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeICS(ev.description)}`);
    if (ev.category) lines.push(`CATEGORIES:${escapeICS(ev.category)}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export function downloadICS(content: string, filename = 'task-priority.ics'): void {
  try {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (err) {
    console.warn('ICS download failed:', err);
  }
}

// ---------- Import ----------

export interface ImportedEvent {
  uid: string;
  summary: string;
  description: string;
  start: Date | null;
  end: Date | null;
}

function parseICSDateValue(value: string): Date | null {
  // Supports:
  //   20240101T140000Z  (UTC)
  //   20240101T140000   (floating / local)
  //   20240101          (all-day)
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z?)$/);
  if (!m) return null;
  const [, yStr, moStr, dStr, hStr, miStr, sStr, z] = m;
  const y = parseInt(yStr, 10);
  const mo = parseInt(moStr, 10) - 1;
  const d = parseInt(dStr, 10);
  const h = hStr ? parseInt(hStr, 10) : 9; // default 9am for all-day
  const mi = miStr ? parseInt(miStr, 10) : 0;
  const s = sStr ? parseInt(sStr, 10) : 0;

  if (z === 'Z') {
    return new Date(Date.UTC(y, mo, d, h, mi, s));
  }
  return new Date(y, mo, d, h, mi, s);
}

export function parseICS(content: string): ImportedEvent[] {
  // Unfold wrapped lines: a line beginning with space/tab continues the previous
  const unfolded = content
    .replace(/\r\n[ \t]/g, '')
    .replace(/\n[ \t]/g, '')
    .replace(/\r[ \t]/g, '');

  const lines = unfolded.split(/\r\n|\n|\r/);
  const events: ImportedEvent[] = [];
  let current: Partial<ImportedEvent> | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') {
      current = { uid: '', summary: '', description: '', start: null, end: null };
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current && (current.summary || current.start)) {
        events.push({
          uid: current.uid || '',
          summary: current.summary || 'Untitled event',
          description: current.description || '',
          start: current.start || null,
          end: current.end || null,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const keyPart = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    const key = keyPart.split(';')[0].toUpperCase();

    if (key === 'UID') current.uid = unescapeICS(value);
    else if (key === 'SUMMARY') current.summary = unescapeICS(value);
    else if (key === 'DESCRIPTION') current.description = unescapeICS(value);
    else if (key === 'DTSTART') current.start = parseICSDateValue(value);
    else if (key === 'DTEND') current.end = parseICSDateValue(value);
  }

  return events;
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Converts ICS events to Task objects.
 * Skips events without a start date, or that duplicate existing tasks
 * (matching title + start time to within 1 minute).
 */
export function eventsToTasks(
  events: ImportedEvent[],
  existingTasks: Task[]
): Task[] {
  const existingKeys = new Set<string>();
  for (const t of existingTasks) {
    if (!t.dueDate) continue;
    const d = new Date(t.dueDate);
    if (isNaN(d.getTime())) continue;
    existingKeys.add(`${t.title.trim().toLowerCase()}::${Math.floor(d.getTime() / 60_000)}`);
  }

  const out: Task[] = [];

  for (const ev of events) {
    if (!ev.start) continue;
    const startKey = Math.floor(ev.start.getTime() / 60_000);
    const titleKey = `${ev.summary.trim().toLowerCase()}::${startKey}`;
    if (existingKeys.has(titleKey)) continue;

    // Compute duration from start/end, fallback to default
    let minutes = DEFAULT_EVENT_MINUTES;
    if (ev.end && !isNaN(ev.end.getTime()) && ev.end.getTime() > ev.start.getTime()) {
      minutes = Math.round((ev.end.getTime() - ev.start.getTime()) / 60_000);
      minutes = Math.max(5, Math.min(480, minutes));
    }

    // Trim very long titles
    const title = ev.summary.length > MAX_TITLE_LENGTH
      ? ev.summary.slice(0, MAX_TITLE_LENGTH - 1) + '…'
      : ev.summary;

    const quadrant: QuadrantId = 'schedule';
    const category: TaskCategory = 'Personal';

    const task: Task = {
      id: `task-ics-${Date.now()}-${shortId()}`,
      title,
      description: ev.description || '',
      quadrant,
      category,
      priority: 'high',
      status: 'todo',
      estimatedMinutes: minutes,
      dueDate: ev.start.toISOString(),
      impactScore: 3,
      effortScore: 2,
      createdAt: new Date().toISOString(),
    };

    out.push(task);
    // Add to seen set so duplicate events in the same file get deduped too
    existingKeys.add(titleKey);
  }

  return out;
}