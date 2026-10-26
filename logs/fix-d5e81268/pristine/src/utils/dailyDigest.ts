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

export type DigestLang = 'en' | 'fr' | 'ar';

const DIGEST_COPY: Record<DigestLang, {
  locale: string;
  title: string;
  nothingScheduled: string;
  firstDue: string;
  quadrants: { do_first: string; schedule: string; delegate: string; eliminate: string };
}> = {
  en: {
    locale: 'en-US',
    title: '🌅 Morning Digest',
    nothingScheduled: 'Nothing scheduled. Enjoy the calm 🌿',
    firstDue: 'First due',
    quadrants: { do_first: 'Do First', schedule: 'Schedule', delegate: 'Delegate', eliminate: 'Eliminate' },
  },
  fr: {
    locale: 'fr-FR',
    title: '🌅 Résumé du matin',
    nothingScheduled: 'Rien de prévu. Profitez du calme 🌿',
    firstDue: 'Première échéance',
    quadrants: { do_first: 'À faire', schedule: 'Planifier', delegate: 'Déléguer', eliminate: 'Éliminer' },
  },
  ar: {
    locale: 'ar-EG',
    title: '🌅 ملخص الصباح',
    nothingScheduled: 'لا شيء مجدول. استمتع بالهدوء 🌿',
    firstDue: 'أول استحقاق',
    quadrants: { do_first: 'ابدأ به فوراً', schedule: 'جدولة وتخطيط', delegate: 'تفويض', eliminate: 'استبعاد وإلغاء' },
  },
};

export function getDigestTitle(lang: DigestLang): string {
  return (DIGEST_COPY[lang] ?? DIGEST_COPY.en).title;
}

/**
 * Builds the body text for the digest on a given day.
 * Example (en): "4 Do First · 2 Schedule. First due 9:30 AM."
 * Example (ar): "٤ ابدأ به فوراً · ٢ جدولة. أول استحقاق ٩:٣٠ ص."
 */
export function buildDigestBody(
  day: Date,
  tasks: Task[],
  language: DigestLang = 'en'
): string {
  const copy = DIGEST_COPY[language] ?? DIGEST_COPY.en;

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
    return copy.nothingScheduled;
  }

  const doFirst  = dueThatDay.filter((t) => t.quadrant === 'do_first').length;
  const schedule = dueThatDay.filter((t) => t.quadrant === 'schedule').length;
  const delegate = dueThatDay.filter((t) => t.quadrant === 'delegate').length;
  const eliminate = dueThatDay.filter((t) => t.quadrant === 'eliminate').length;

  const parts: string[] = [];
  if (doFirst  > 0) parts.push(`${doFirst} ${copy.quadrants.do_first}`);
  if (schedule > 0) parts.push(`${schedule} ${copy.quadrants.schedule}`);
  if (delegate > 0) parts.push(`${delegate} ${copy.quadrants.delegate}`);
  if (eliminate > 0) parts.push(`${eliminate} ${copy.quadrants.eliminate}`);

  const earliest = dueThatDay
    .map((t) => ({ t, d: new Date(t.dueDate) }))
    .sort((a, b) => a.d.getTime() - b.d.getTime())[0];

  let earliestTime = '';
  try {
    earliestTime = earliest.d.toLocaleTimeString(copy.locale, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    earliestTime = earliest.d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return `${parts.join(' · ')}. ${copy.firstDue} ${earliestTime}.`;
}

/**
 * Returns "today's" digest body — used to show a live preview in Settings.
 */
export function buildTodayPreview(tasks: Task[], language: DigestLang = 'en'): string {
  return buildDigestBody(new Date(), tasks, language);
}

export function getDigestNotificationIds(): number[] {
  return Array.from({ length: DIGEST_DAYS_AHEAD }, (_, i) => DIGEST_ID_BASE + i + 1);
}

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
    if (target.getTime() <= now + 2000) continue;
    out.push({ id: DIGEST_ID_BASE + i + 1, when: target });
  }
  return out;
}