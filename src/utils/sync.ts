// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/sync.ts
//  Two-way sync for tasks, habits, check-ins, and milestones.
//  Pull changes since last sync, merge by updatedAt (LWW),
//  push local changes back. All 4 types in one round trip.
// ─────────────────────────────────────────────────────────────

import { Task, Habit, HabitCheckIn, Milestone } from '../types';

const SERVER_URL = 'https://task-priority-server-pir6.onrender.com';

const lastSyncKey = (userId: string) => `taskflow_lastSync_${userId}`;

export function getLastSyncAt(userId: string): string {
  try {
    return localStorage.getItem(lastSyncKey(userId)) || '1970-01-01T00:00:00.000Z';
  } catch {
    return '1970-01-01T00:00:00.000Z';
  }
}

export function setLastSyncAt(userId: string, iso: string): void {
  try { localStorage.setItem(lastSyncKey(userId), iso); } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────
//  Generic merge — works for any type that has id + updatedAt
// ─────────────────────────────────────────────────────────────

type Syncable = { id: string; updatedAt?: string };

/** Merge remote into local by id. LWW on updatedAt. */
function mergeById<T extends Syncable>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const t of local) byId.set(t.id, t);

  for (const r of remote) {
    const existing = byId.get(r.id);
    if (!existing) {
      byId.set(r.id, r);
      continue;
    }
    const lt = new Date(existing.updatedAt || 0).getTime();
    const rt = new Date(r.updatedAt || 0).getTime();
    if (rt > lt) byId.set(r.id, r);
  }

  return Array.from(byId.values());
}

/** Determine which local items need to be pushed (new or newer than remote). */
function pickToPush<T extends Syncable>(local: T[], remote: T[]): T[] {
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const toPush: T[] = [];

  for (const l of local) {
    const r = remoteById.get(l.id);
    if (!r) {
      toPush.push(l);
      continue;
    }
    const lt = new Date(l.updatedAt || 0).getTime();
    const rt = new Date(r.updatedAt || 0).getTime();
    if (lt > rt) toPush.push(l);
  }

  return toPush;
}

// ─────────────────────────────────────────────────────────────
//  Full sync — tasks + habits + checkIns + milestones
// ─────────────────────────────────────────────────────────────

export type SyncAllInput = {
  tasks: Task[];
  habits: Habit[];
  checkIns: HabitCheckIn[];
  milestones: Milestone[];
};

export type SyncAllResult = {
  tasks: Task[];
  habits: Habit[];
  checkIns: HabitCheckIn[];
  milestones: Milestone[];
  serverTime: string;
  pushed: number;
  pulled: number;
};

export async function syncAll(
  userId: string,
  local: SyncAllInput
): Promise<SyncAllResult | null> {
  if (!userId) return null;
  const since = getLastSyncAt(userId);

  // ── 1. PULL remote changes ──
  let remoteTasks: Task[] = [];
  let remoteHabits: Habit[] = [];
  let remoteCheckIns: HabitCheckIn[] = [];
  let remoteMilestones: Milestone[] = [];
  let serverTime = new Date().toISOString();

  try {
    const res = await fetch(
      `${SERVER_URL}/api/sync/${encodeURIComponent(userId)}/full?since=${encodeURIComponent(since)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;

    remoteTasks = (data.tasks || []) as Task[];
    remoteHabits = (data.habits || []) as Habit[];
    remoteCheckIns = (data.checkIns || []) as HabitCheckIn[];
    remoteMilestones = (data.milestones || []) as Milestone[];
    serverTime = data.serverTime || serverTime;
  } catch {
    return null; // offline — leave local as-is
  }

  // ── 2. MERGE each type (LWW) ──
  const mergedTasks = mergeById(local.tasks, remoteTasks);
  const mergedHabits = mergeById(local.habits, remoteHabits);
  const mergedCheckIns = mergeById(local.checkIns, remoteCheckIns);
  const mergedMilestones = mergeById(local.milestones, remoteMilestones);

  // ── 3. Determine what to push (per type) ──
  const tasksToPush = pickToPush(local.tasks, remoteTasks);
  const habitsToPush = pickToPush(local.habits, remoteHabits);
  const checkInsToPush = pickToPush(local.checkIns, remoteCheckIns);
  const milestonesToPush = pickToPush(local.milestones, remoteMilestones);

  const totalPush =
    tasksToPush.length + habitsToPush.length +
    checkInsToPush.length + milestonesToPush.length;

  // ── 4. PUSH (single batch call, or skip if nothing to push) ──
  let pushed = 0;
  if (totalPush > 0) {
    try {
      const res = await fetch(`${SERVER_URL}/api/sync/${encodeURIComponent(userId)}/full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasksToPush,
          habits: habitsToPush,
          checkIns: checkInsToPush,
          milestones: milestonesToPush,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        pushed = data.applied || totalPush;
      }
    } catch {
      /* offline — will retry next sync */
    }
  }

  // ── 5. Save last sync time ──
  setLastSyncAt(userId, serverTime);

  // ── 6. Return merged (tombstones included; caller filters for UI) ──
  const pulled = remoteTasks.length + remoteHabits.length + remoteCheckIns.length + remoteMilestones.length;
  return {
    tasks: mergedTasks,
    habits: mergedHabits,
    checkIns: mergedCheckIns,
    milestones: mergedMilestones,
    serverTime,
    pushed,
    pulled,
  };
}

// ─────────────────────────────────────────────────────────────
//  Legacy: tasks-only sync (kept so nothing else breaks)
// ─────────────────────────────────────────────────────────────

type LegacySyncResult = {
  merged: Task[];
  serverTime: string;
  pushed: number;
  pulled: number;
};

export async function syncTasks(userId: string, localTasks: Task[]): Promise<LegacySyncResult | null> {
  if (!userId) return null;
  const result = await syncAll(userId, {
    tasks: localTasks,
    habits: [],
    checkIns: [],
    milestones: [],
  });
  if (!result) return null;
  return {
    merged: result.tasks,
    serverTime: result.serverTime,
    pushed: result.pushed,
    pulled: result.pulled,
  };
}