// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/fullBackup.ts
//  Full-account backup: exports ALL user data (not just tasks).
//  Version-tagged so future migrations can be applied on restore.
// ─────────────────────────────────────────────────────────────

import { Task, Habit, HabitCheckIn, Milestone, Project, Template } from '../types';
import { DailyDigestConfig } from './dailyDigest';
import { EscalationConfig } from './escalatingNags';

export const FULL_BACKUP_VERSION = 1;

export interface FullBackupData {
  tasks: Task[];
  habits: Habit[];
  checkIns: HabitCheckIn[];
  milestones: Milestone[];
  projects: Project[];
  customTemplates: Template[];
  dailyDigest: DailyDigestConfig;
  escalation: EscalationConfig;
}

export interface FullBackup {
  version: number;
  exportedAt: string;
  appName: string;
  data: FullBackupData;
}

/**
 * Build a full backup object from the current app state.
 * Caller passes all in-memory data; we just stamp and wrap it.
 */
export function buildFullBackup(data: FullBackupData): FullBackup {
  return {
    version: FULL_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'Task Priority',
    data,
  };
}

/**
 * Trigger a browser download of the given backup.
 * Filename: taskflow-backup-YYYY-MM-DD.json
 */
export function downloadFullBackup(backup: FullBackup): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const filename = `taskflow-backup-${date}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Read a File and parse it as a full backup.
 * Throws with a friendly message on any problem.
 */
export async function readFullBackupFile(file: File): Promise<FullBackup> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('INVALID_JSON');
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('INVALID_SHAPE');
  if (typeof parsed.version !== 'number') throw new Error('MISSING_VERSION');
  if (!parsed.data || typeof parsed.data !== 'object') throw new Error('MISSING_DATA');

  const data = parsed.data;
  // Defensive: ensure each array field is actually an array (or default to [])
  const normalizeArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);

  return {
    version: parsed.version,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    appName: typeof parsed.appName === 'string' ? parsed.appName : 'Task Priority',
    data: {
      tasks: normalizeArray<Task>(data.tasks),
      habits: normalizeArray<Habit>(data.habits),
      checkIns: normalizeArray<HabitCheckIn>(data.checkIns),
      milestones: normalizeArray<Milestone>(data.milestones),
      projects: normalizeArray<Project>(data.projects),
      customTemplates: normalizeArray<Template>(data.customTemplates),
      dailyDigest: data.dailyDigest && typeof data.dailyDigest === 'object'
        ? data.dailyDigest
        : { enabled: false, time: '08:00' },
      escalation: data.escalation && typeof data.escalation === 'object'
        ? data.escalation
        : { intensity: 'normal' },
    },
  };
}

/** Human summary of a backup, for the confirm modal. */
export function summarizeBackup(backup: FullBackup): {
  tasks: number; habits: number; checkIns: number; milestones: number;
  projects: number; templates: number;
} {
  return {
    tasks: backup.data.tasks.length,
    habits: backup.data.habits.length,
    checkIns: backup.data.checkIns.length,
    milestones: backup.data.milestones.length,
    projects: backup.data.projects.length,
    templates: backup.data.customTemplates.length,
  };
}