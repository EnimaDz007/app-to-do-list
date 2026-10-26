// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/sync.ts
//  Two-way sync — authenticated with Clerk session token.
//  Pull changes since last sync, merge by updatedAt (LWW),
//  push local changes back. All 5 types in one round trip.
//
//  Edge-case hardening:
//    • fetch timeout via AbortController
//    • 5xx / network retry with exponential backoff
//    • cursor only advances on full success (no silent data loss)
//    • partial failures surfaced via `error` on the result
// ─────────────────────────────────────────────────────────────

import { Task, Habit, HabitCheckIn, Milestone, Project } from '../types';

const SERVER_URL = 'https://task-priority-server-pir6.onrender.com';

const PULL_TIMEOUT_MS  = 25_000;  // Render cold start can take ~30s; 25s + retries covers it
const PUSH_TIMEOUT_MS  = 25_000;
const MAX_ATTEMPTS     = 3;
const BASE_BACKOFF_MS  = 500;

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
//  Fetch with timeout + retry on 5xx / network errors.
//  Does NOT retry on 4xx (client error — token, payload, etc.).
// ─────────────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function retryableFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  maxAttempts = MAX_ATTEMPTS,
): Promise<{ ok: true; res: Response } | { ok: false; status?: number; error: string }> {
  let lastError = 'unknown';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs);

      // 2xx / 3xx / 4xx → return as-is (caller decides). Only retry 5xx.
      if (res.status < 500) return { ok: true, res };

      lastError = `HTTP ${res.status}`;
    } catch (err) {
      // AbortError = timeout. TypeError = network failure.
      lastError = err instanceof Error ? err.message : 'network error';
    }

    // Exponential backoff before next attempt (skip after last)
    if (attempt < maxAttempts) {
      const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return { ok: false, error: lastError };
}

// ─────────────────────────────────────────────────────────────
//  Generic merge — works for any type that has id + updatedAt
// ─────────────────────────────────────────────────────────────

type Syncable = { id: string; updatedAt?: string };

/** Merge remote into local by id. LWW on updatedAt. Tie → prefer remote (cross-device convergence). */
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
    // On tie, prefer remote. Guarantees all devices converge to same value.
    if (rt >= lt) byId.set(r.id, r);
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
//  Full sync — tasks + habits + checkIns + milestones + projects
// ─────────────────────────────────────────────────────────────

export type SyncAllInput = {
  tasks: Task[];
  habits: Habit[];
  checkIns: HabitCheckIn[];
  milestones: Milestone[];
  projects: Project[];
};

export type SyncAllResult = {
  tasks: Task[];
  habits: Habit[];
  checkIns: HabitCheckIn[];
  milestones: Milestone[];
  projects: Project[];
  serverTime: string;
  pushed: number;
  pulled: number;
  /** Set when the round trip was partial (e.g. push failed). Cursor NOT advanced. */
  error?: string;
};

type TokenGetter = () => Promise<string | null>;

/** Build an Authorization header from the Clerk session token. */
async function authHeaders(getToken?: TokenGetter): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!getToken) return headers;
  try {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch { /* no token available — request will 401 */ }
  return headers;
}

export async function syncAll(
  userId: string,
  local: SyncAllInput,
  getToken?: TokenGetter,
): Promise<SyncAllResult | null> {
  if (!userId) return null;
  const since = getLastSyncAt(userId);
  const headers = await authHeaders(getToken);

  // ── 1. PULL remote changes ──
  let remoteTasks: Task[] = [];
  let remoteHabits: Habit[] = [];
  let remoteCheckIns: HabitCheckIn[] = [];
  let remoteMilestones: Milestone[] = [];
  let remoteProjects: Project[] = [];
  let serverTime = new Date().toISOString();

  const pullUrl =
    `${SERVER_URL}/api/sync/${encodeURIComponent(userId)}/full` +
    `?since=${encodeURIComponent(since)}`;

  const pullResult = await retryableFetch(pullUrl, { headers }, PULL_TIMEOUT_MS);

  if (!pullResult.ok) {
    console.warn(`⚠️ Sync pull failed after retries: ${pullResult.error}`);
    return null; // offline / server down — leave local untouched
  }

  const pullRes = pullResult.res;
  if (!pullRes.ok) {
    console.warn(`⚠️ Sync pull HTTP ${pullRes.status}`);
    return null;
  }

  try {
    const data = await pullRes.json();
    if (!data.success) return null;

    remoteTasks      = (data.tasks      || []) as Task[];
    remoteHabits     = (data.habits     || []) as Habit[];
    remoteCheckIns   = (data.checkIns   || []) as HabitCheckIn[];
    remoteMilestones = (data.milestones || []) as Milestone[];
    remoteProjects   = (data.projects   || []) as Project[];
    serverTime       = data.serverTime || serverTime;
  } catch (err) {
    console.warn('⚠️ Sync pull JSON parse error:', err);
    return null;
  }

  // ── 2. MERGE each type (LWW) ──
  const mergedTasks      = mergeById(local.tasks,      remoteTasks);
  const mergedHabits     = mergeById(local.habits,     remoteHabits);
  const mergedCheckIns   = mergeById(local.checkIns,   remoteCheckIns);
  const mergedMilestones = mergeById(local.milestones, remoteMilestones);
  const mergedProjects   = mergeById(local.projects,   remoteProjects);

  // ── 3. Determine what to push ──
  const tasksToPush      = pickToPush(local.tasks,      remoteTasks);
  const habitsToPush     = pickToPush(local.habits,     remoteHabits);
  const checkInsToPush   = pickToPush(local.checkIns,   remoteCheckIns);
  const milestonesToPush = pickToPush(local.milestones, remoteMilestones);
  const projectsToPush   = pickToPush(local.projects,   remoteProjects);

  const totalPush =
    tasksToPush.length + habitsToPush.length +
    checkInsToPush.length + milestonesToPush.length + projectsToPush.length;

  // ── 4. PUSH (skip when nothing to push — trivially succeeds) ──
  let pushed = 0;
  let pushError: string | undefined;

  if (totalPush > 0) {
    const pushUrl = `${SERVER_URL}/api/sync/${encodeURIComponent(userId)}/full`;
    const pushResult = await retryableFetch(
      pushUrl,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tasks: tasksToPush,
          habits: habitsToPush,
          checkIns: checkInsToPush,
          milestones: milestonesToPush,
          projects: projectsToPush,
        }),
      },
      PUSH_TIMEOUT_MS,
    );

    if (!pushResult.ok) {
      pushError = `push failed: ${pushResult.error}`;
      console.warn(`⚠️ Sync push failed after retries: ${pushResult.error}`);
    } else if (!pushResult.res.ok) {
      pushError = `push HTTP ${pushResult.res.status}`;
      console.warn(`⚠️ Sync push HTTP ${pushResult.res.status}`);
    } else {
      try {
        const data = await pushResult.res.json();
        pushed = data.applied ?? totalPush;
      } catch {
        pushed = totalPush;
      }
    }
  }

  // ── 5. Advance cursor ONLY on full success. ──
  // Advancing on partial success silently drops local changes:
  // next pull's `since` would skip past the un-pushed items.
  if (!pushError) {
    setLastSyncAt(userId, serverTime);
  } else {
    console.warn('⚠️ Cursor not advanced — local changes remain queued for next sync');
  }

  // ── 6. Return merged + optional error flag ──
  const pulled =
    remoteTasks.length + remoteHabits.length + remoteCheckIns.length +
    remoteMilestones.length + remoteProjects.length;

  return {
    tasks: mergedTasks,
    habits: mergedHabits,
    checkIns: mergedCheckIns,
    milestones: mergedMilestones,
    projects: mergedProjects,
    serverTime,
    pushed,
    pulled,
    ...(pushError ? { error: pushError } : {}),
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

export async function syncTasks(
  userId: string,
  localTasks: Task[],
  getToken?: TokenGetter,
): Promise<LegacySyncResult | null> {
  if (!userId) return null;
  const result = await syncAll(userId, {
    tasks: localTasks,
    habits: [],
    checkIns: [],
    milestones: [],
    projects: [],
  }, getToken);
  if (!result) return null;
  return {
    merged: result.tasks,
    serverTime: result.serverTime,
    pushed: result.pushed,
    pulled: result.pulled,
  };
}