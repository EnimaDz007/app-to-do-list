// ─────────────────────────────────────────────────────────────
//  FILE: src/utils/reminderScheduler.ts
//  Schedules + cancels custom user-defined reminders on native
//  platforms, and forwards them to the backend so push notifications
//  fire even when the app is closed.
// ─────────────────────────────────────────────────────────────

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Task, TaskReminder } from '../types';

const SERVER_URL = 'https://task-priority-server-pir6.onrender.com';

/** IDs reserved for custom reminders start at hash + 100 (max 20 per task). */
const REMINDER_ID_OFFSET = 100;
const MAX_REMINDERS_PER_TASK = 10;

export const REMINDER_PRESETS: { label: string; minutes: number }[] = [
  { label: 'At due time',   minutes: 0 },
  { label: '15 min before', minutes: 15 },
  { label: '30 min before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '2 hours before',minutes: 120 },
  { label: '1 day before',  minutes: 1440 },
  { label: '1 week before', minutes: 10080 },
];

/**
 * FIX: clamp to 1,000,000 so `hashTaskId(taskId) + 100 + index`
 * never exceeds int32 range on Android (max 2,147,483,647).
 * Previously Math.abs(hash) could be up to 2,147,483,647 — combined
 * with offsets this could silently overflow.
 */
function hashTaskId(taskId: string): number {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = ((hash << 5) - hash) + taskId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 1_000_000;
}

/** Human-friendly label for a minutes-before offset. */
export function formatReminderOffset(minutes: number): string {
  if (minutes === 0) return 'At due time';
  if (minutes < 60) return `${minutes} min before`;
  if (minutes < 1440) {
    const h = minutes / 60;
    return `${h % 1 === 0 ? h : h.toFixed(1)}h before`;
  }
  const d = minutes / 1440;
  return `${d % 1 === 0 ? d : d.toFixed(1)}d before`;
}

/**
 * Build a TaskReminder from a "minutes before" offset + the task's due date.
 * Returns null if the resulting fire time is already in the past.
 */
export function makeReminder(
  minutesBefore: number,
  dueDateIso: string
): TaskReminder | null {
  const due = new Date(dueDateIso).getTime();
  if (isNaN(due)) return null;
  const fireAt = due - minutesBefore * 60 * 1000;
  if (fireAt <= Date.now()) return null;
  return {
    id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fireAt: new Date(fireAt).toISOString(),
    minutesBefore,
  };
}

/**
 * Recompute fireAt for a reminder when the task's dueDate changes.
 * Preserves the same id and minutesBefore.
 */
export function recomputeReminder(
  reminder: TaskReminder,
  newDueDateIso: string
): TaskReminder {
  const due = new Date(newDueDateIso).getTime();
  const fireAt = due - reminder.minutesBefore * 60 * 1000;
  return {
    ...reminder,
    fireAt: new Date(fireAt).toISOString(),
  };
}

/**
 * Fire body for a given reminder — different message for "at due time"
 * vs "X before".
 */
function reminderBody(task: Task, reminder: TaskReminder): string {
  if (reminder.minutesBefore === 0) {
    return 'This task is due now.';
  }
  return `Due in ${formatReminderOffset(reminder.minutesBefore).replace(' before', '')}.`;
}

/**
 * Schedule every active reminder for a task.
 * - Cancels previous notifications for this task first (safe re-schedule)
 * - Filters out reminders already in the past
 * - Sends the full reminder list to the server for backup push
 */
export async function scheduleTaskReminders(
  task: Task,
  userId: string
): Promise<void> {
  if (!task.reminders || task.reminders.length === 0) {
    return;
  }
  if (task.status === 'completed') return;
  if (task.deletedAt) return;

  const now = Date.now();
  const upcoming = task.reminders
    .filter((r) => new Date(r.fireAt).getTime() > now)
    .slice(0, MAX_REMINDERS_PER_TASK);

  // 1. Always cancel previous ones for this task
  await cancelTaskReminders(task.id);

  // 2. Schedule new local notifications (native only — the web falls back
  //    to the backend's push notifications via the /api/schedule-reminder call)
  if (Capacitor.isNativePlatform() && upcoming.length > 0) {
    try {
      const base = hashTaskId(task.id) + REMINDER_ID_OFFSET;
      const notifications = upcoming.map((r, i) => ({
        id: base + i,
        title: `⏰ ${task.title}`,
        body: reminderBody(task, r),
        schedule: { at: new Date(r.fireAt) },
        channelId: 'task-reminders-silent',
        extra: {
          taskId: task.id,
          quadrant: task.quadrant,
          reminderId: r.id,
        },
      }));
      await LocalNotifications.schedule({ notifications });
      console.log(`⏰ Scheduled ${notifications.length} custom reminder(s) for "${task.title}"`);
    } catch (err) {
      console.warn('Failed to schedule custom reminders:', err);
    }
  }

  // 3. Send to backend so push works when the app is closed
  try {
    await fetch(`${SERVER_URL}/api/schedule-reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: userId,
        title: task.title,
        dueTime: task.dueDate,
        taskId: task.id,
        recurrence: task.recurrence,
        reminders: upcoming,
        fullTask: task,
      }),
    });
  } catch (err) {
    console.warn('Backend reminder backup skipped:', err);
  }
}

/**
 * Cancel all custom reminder notifications for a task.
 * Also tells the server to drop them.
 */
export async function cancelTaskReminders(taskId: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base = hashTaskId(taskId) + REMINDER_ID_OFFSET;
      const ids = Array.from({ length: MAX_REMINDERS_PER_TASK }, (_, i) => base + i);
      await LocalNotifications.cancel({
        notifications: ids.map((id) => ({ id })),
      });
    } catch {
      /* noop */
    }
  }
}