import { Task } from '../types';

export interface DailyDigestConfig {
  enabled: boolean;
  time: string; // 'HH:MM' in 24h format
}

export const DEFAULT_DIGEST_CONFIG: DailyDigestConfig = {
  enabled: false,
  time: '08:00',
};

// Notifications 810001 through 810007 are reserved for daily digests.
export const DIGEST_ID_BASE = 810000;
export const DIGEST_DAYS_AHEAD = 7;

/**
 * Builds the body text for the digest on a given day.
 * Example: "4 Do First · 2 Schedule. First due 9:30 AM."
 */
export function buildDigestBody(day: Date, tasks: Task[]): string {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const dueThatDay = tasks.filter((t) => {
    if (t.status === 'completed') return false;
    if (t.archivedAt) return false;
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate).getTime();
    if (isNaN(d)) return false;
    return d >= dayStart.getTime() && d <= dayEnd.getTime();
  });

  if (dueThatDay.length === 0) {
    return 'Nothing scheduled. Enjoy the calm 🌿';
  }

  const doFirst  = dueThatDay.filter((t) => t.quadrant === 'do_first').length;
  const schedule = dueThatDay.filter((t) => t.quadrant === 'schedule').length;
  const delegate = dueThatDay.filter((t) => t.quadrant === 'delegate').length;
  const eliminate = dueThatDay.filter((t) => t.quadrant === 'eliminate').length;

  const parts: string[] = [];
  if (doFirst  > 0) parts.push(`${doFirst} Do First`);
  if (schedule > 0) parts.push(`${schedule} Schedule`);
  if (delegate > 0) parts.push(`${delegate} Delegate`);
  if (eliminate > 0) parts.push(`${eliminate} Eliminate`);

  const earliest = dueThatDay
    .map((t) => ({ t, d: new Date(t.dueDate) }))
    .sort((a, b) => a.d.getTime() - b.d.getTime())[0];

  const earliestTime = earliest.d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${parts.join(' · ')}. First due ${earliestTime}.`;
}

/**
 * Returns "today's" digest body — used to show a live preview in Settings.
 */
export function buildTodayPreview(tasks: Task[]): string {
  return buildDigestBody(new Date(), tasks);
}

/**
 * Returns the array of notification IDs used for digests (so we can cancel them).
 */
export function getDigestNotificationIds(): number[] {
  return Array.from({ length: DIGEST_DAYS_AHEAD }, (_, i) => DIGEST_ID_BASE + i + 1);
}

/**
 * Returns a list of { id, when } for the next N days at the given time.
 * Skips any occurrence that's already in the past.
 */
export function computeDigestSchedule(time: string): { id: number; when: Date }[] {
  const [hStr, mStr] = time.split(':');
  const hour = parseInt(hStr, 10);
  const minute = parseInt(mStr, 10);
  if (isNaN(hour) || isNaN(minute)) return [];

  const out: { id: number; when: Date }[] = [];
  const now = Date.now();

  for (let i = 0; i < DIGEST_DAYS_AHEAD; i++) {
    const target = new Date();
    target.setDate(target.getDate() + i);
    target.setHours(hour, minute, 0, 0);
    if (target.getTime() <= now + 2000) continue; // already past
    out.push({ id: DIGEST_ID_BASE + i + 1, when: target });
  }
  return out;
}