// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/sync.ts
//  Two-way task sync: pull changes since last sync, merge by
//  updatedAt (last-write-wins), push local changes back.
// ─────────────────────────────────────────────────────────────

import { Task } from '../types';

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

type SyncResult = {
  merged: Task[];
  serverTime: string;
  pushed: number;
  pulled: number;
};

/**
 * Pull remote changes since lastSyncAt, merge with local (LWW on updatedAt),
 * push local tasks the server doesn't know about or that are newer.
 *
 * Returns the merged task list — caller should setState with it.
 */
export async function syncTasks(userId: string, localTasks: Task[]): Promise<SyncResult | null> {
  if (!userId) return null;
  const since = getLastSyncAt(userId);

  // ── 1. PULL remote changes ──
  let remoteTasks: Task[] = [];
  let serverTime = new Date().toISOString();
  try {
    const res = await fetch(
      `${SERVER_URL}/api/sync/${encodeURIComponent(userId)}?since=${encodeURIComponent(since)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    remoteTasks = (data.tasks || []) as Task[];
    serverTime = data.serverTime || serverTime;
  } catch {
    return null; // offline — leave local as-is
  }

  // ── 2. MERGE by id, LWW on updatedAt ──
  const byId = new Map<string, Task>();
  for (const t of localTasks) byId.set(t.id, t);

  for (const r of remoteTasks) {
    const existing = byId.get(r.id);
    if (!existing) {
      byId.set(r.id, r);
      continue;
    }
    const lt = new Date(existing.updatedAt || 0).getTime();
    const rt = new Date(r.updatedAt || 0).getTime();
    if (rt > lt) byId.set(r.id, r);
  }

  // ── 3. Determine what to push ──
  const remoteById = new Map(remoteTasks.map((r) => [r.id, r]));
  const toPush: Task[] = [];

  for (const local of localTasks) {
    const remote = remoteById.get(local.id);
    if (!remote) {
      toPush.push(local); // server has never seen this id
      continue;
    }
    const lt = new Date(local.updatedAt || 0).getTime();
    const rt = new Date(remote.updatedAt || 0).getTime();
    if (lt > rt) toPush.push(local); // local is newer
  }

  // ── 4. PUSH in chunks of 200 ──
  let pushed = 0;
  if (toPush.length > 0) {
    const CHUNK = 200;
    for (let i = 0; i < toPush.length; i += CHUNK) {
      const slice = toPush.slice(i, i + CHUNK);
      try {
        const res = await fetch(`${SERVER_URL}/api/sync/${encodeURIComponent(userId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: slice }),
        });
        if (res.ok) {
          const data = await res.json();
          pushed += data.applied || slice.length;
        }
      } catch {
        /* offline — will retry next sync */
      }
    }
  }

  // ── 5. Save last sync time ──
  setLastSyncAt(userId, serverTime);

  // ── 6. Return merged (tombstones included; caller filters for UI) ──
  const merged = [...byId.values()];
  return { merged, serverTime, pushed, pulled: remoteTasks.length };
}