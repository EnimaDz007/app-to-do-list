import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Task, QuadrantId } from '../types';

export type EscalationIntensity = 'off' | 'gentle' | 'normal' | 'aggressive';

export interface EscalationConfig {
  intensity: EscalationIntensity;
}

export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  intensity: 'normal',
};

export const NAG_CHANNEL_ID = 'task-nags';

/**
 * Delay (in minutes) AFTER the task's due time when each nag fires.
 * The array length = number of nags scheduled per quadrant.
 */
const NAG_DELAYS_BY_QUADRANT: Record<EscalationIntensity, Record<QuadrantId, number[]>> = {
  off: {
    do_first:  [],
    schedule:  [],
    delegate:  [],
    eliminate: [],
  },
  gentle: {
    do_first:  [15, 30, 45, 60],
    schedule:  [120, 240],
    delegate:  [],
    eliminate: [],
  },
  normal: {
    do_first:  [5, 10, 15, 20, 25, 30],
    schedule:  [60, 120, 180],
    delegate:  [60],
    eliminate: [],
  },
  aggressive: {
    do_first:  [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    schedule:  [30, 60, 90, 120],
    delegate:  [30, 60],
    eliminate: [],
  },
};

export const MAX_NAGS_PER_TASK = 20;

export function getNagDelaysMinutes(
  quadrant: QuadrantId,
  intensity: EscalationIntensity
): number[] {
  if (intensity === 'off') return [];
  return NAG_DELAYS_BY_QUADRANT[intensity][quadrant] || [];
}

function hashTaskId(taskId: string): number {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = ((hash << 5) - hash + taskId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministic nag notification ID.
 * Reserved range: 100,000,000 – 110,000,099
 * (avoids digests at 810001-810007 and task reminders at 0-2B, still fits int32)
 */
export function nagNotificationId(taskId: string, index: number): number {
  const bucket = hashTaskId(taskId) % 100000;
  return 100_000_000 + bucket * 100 + index;
}

export function getAllNagIds(taskId: string): number[] {
  const ids: number[] = [];
  for (let i = 0; i < MAX_NAGS_PER_TASK; i++) {
    ids.push(nagNotificationId(taskId, i));
  }
  return ids;
}

/**
 * Schedules the nag ladder for a single task.
 * @returns the number of notifications scheduled
 */
export async function scheduleNagsForTask(
  task: Task,
  intensity: EscalationIntensity
): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;
  if (!task.dueDate) return 0;
  if (task.status === 'completed') return 0;
  if (task.archivedAt) return 0;

  const delays = getNagDelaysMinutes(task.quadrant, intensity);
  if (delays.length === 0) return 0;

  const dueTime = new Date(task.dueDate).getTime();
  if (isNaN(dueTime)) return 0;

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return 0;
  } catch {
    return 0;
  }

  const now = Date.now();
  const notifications = delays
    .map((delayMin, index) => {
      const fireAt = dueTime + delayMin * 60_000;
      if (fireAt <= now + 5000) return null;
      return {
        id: nagNotificationId(task.id, index),
        title: `⏰ Still pending: ${task.title}`,
        body: `Due ${delayMin} min ago — tap the checkbox or use "Mark Done" to stop.`,
        schedule: { at: new Date(fireAt) },
        channelId: NAG_CHANNEL_ID,
        extra: { taskId: task.id, quadrant: task.quadrant, isNag: true },
      };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  if (notifications.length === 0) return 0;

  try {
    await LocalNotifications.schedule({ notifications });
    return notifications.length;
  } catch (err) {
    console.warn('Failed to schedule nags:', err);
    return 0;
  }
}

export async function cancelNagsForTask(taskId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({
      notifications: getAllNagIds(taskId).map((id) => ({ id })),
    });
  } catch {
    /* noop */
  }
}