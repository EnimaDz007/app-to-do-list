import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Task } from '../types';

/* ============================================================
   SOUND ENGINE — singleton AudioContext
   ============================================================ */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try { audioCtx = new Ctor(); } catch { return null; }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
  } catch { /* noop */ }
}

interface ToneSpec {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
}

function playTones(tones: ToneSpec[]): void {
  const ctx = getAudioContext();
  if (!ctx || tones.length === 0) return;
  const now = ctx.currentTime;
  for (const { freq, start, duration, type = 'sine', volume = 0.18 } of tones) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = now + start;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    } catch { /* noop */ }
  }
}

/* ============================================================
   SOUND OPTIONS
   ============================================================ */

export type SoundAlertId = 'none' | 'beep' | 'chime' | 'success' | 'alert';

export const SOUND_ALERT_OPTIONS: {
  id: SoundAlertId;
  name: string;
  tag: string;
  description: string;
}[] = [
  { id: 'none',    name: 'Silent',       tag: 'Off',     description: 'Visual banner only, no sound' },
  { id: 'beep',    name: 'Classic Beep', tag: 'Default', description: 'Short single tone' },
  { id: 'chime',   name: 'Soft Chime',   tag: 'Gentle',  description: 'Pleasant two-note chime' },
  { id: 'success', name: 'Success',      tag: 'Upbeat',  description: 'Rising three-note arpeggio' },
  { id: 'alert',   name: 'Urgent Alert', tag: 'Loud',    description: 'Double high-pitched alert' },
];

const SOUND_PATTERNS: Record<SoundAlertId, ToneSpec[]> = {
  none: [],
  beep: [{ freq: 880, start: 0, duration: 0.18, type: 'square', volume: 0.15 }],
  chime: [
    { freq: 660, start: 0,    duration: 0.35, type: 'sine', volume: 0.16 },
    { freq: 990, start: 0.16, duration: 0.5,  type: 'sine', volume: 0.14 },
  ],
  success: [
    { freq: 523.25, start: 0,    duration: 0.18, type: 'sine', volume: 0.16 },
    { freq: 659.25, start: 0.12, duration: 0.18, type: 'sine', volume: 0.16 },
    { freq: 783.99, start: 0.24, duration: 0.35, type: 'sine', volume: 0.16 },
  ],
  alert: [
    { freq: 1000, start: 0,    duration: 0.12, type: 'square', volume: 0.14 },
    { freq: 1000, start: 0.18, duration: 0.12, type: 'square', volume: 0.14 },
    { freq: 1200, start: 0.36, duration: 0.22, type: 'square', volume: 0.14 },
  ],
};

export type ChimeType = 'beep' | 'success' | 'error' | 'timer';

export function playAudioAlert(soundId: SoundAlertId): void {
  if (soundId === 'none') return;
  playTones(SOUND_PATTERNS[soundId] ?? SOUND_PATTERNS.beep);
}

export function previewAlertSound(soundId?: SoundAlertId | string): void {
  const id = (soundId as SoundAlertId) || getSelectedAlertSound();
  if (id === 'none') return;
  playAudioAlert(id);
}

export function playAudioChime(type: ChimeType = 'beep'): void {
  if (type === 'success') {
    playAudioAlert('success');
  } else if (type === 'error') {
    playAudioAlert('alert');
  } else if (type === 'timer') {
    playTones([
      { freq: 587.33, start: 0,    duration: 0.25, type: 'sine', volume: 0.18 },
      { freq: 880,    start: 0.18, duration: 0.30, type: 'sine', volume: 0.16 },
      { freq: 1174.66,start: 0.38, duration: 0.55, type: 'sine', volume: 0.15 },
    ]);
  } else {
    playAudioAlert('beep');
  }
}

/* ============================================================
   PERSISTED SOUND CHOICE
   ============================================================ */

const SOUND_STORAGE_KEY = 'task-priority-alert-sound';

export function getSelectedAlertSound(): SoundAlertId {
  try {
    const v = localStorage.getItem(SOUND_STORAGE_KEY);
    if (v && v in SOUND_PATTERNS) return v as SoundAlertId;
  } catch { /* noop */ }
  return 'chime';
}

export function setSelectedAlertSound(id: SoundAlertId): void {
  try { localStorage.setItem(SOUND_STORAGE_KEY, id); } catch { /* noop */ }
}

/* ============================================================
   NOTIFICATIONS — native-first, web fallback
   ============================================================ */

export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return true;
  return 'Notification' in window;
}

export function getNotificationPermissionStatus(): string {
  if (Capacitor.isNativePlatform()) {
    return typeof Notification !== 'undefined' ? Notification.permission : 'prompt';
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        perm = await LocalNotifications.requestPermissions();
      }
      return perm.display === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function sendBrowserNotification(
  title: string,
  options?: { body?: string }
): boolean {
  if (Capacitor.isNativePlatform()) {
    (async () => {
      try {
        let perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          perm = await LocalNotifications.requestPermissions();
          if (perm.display !== 'granted') return;
        }
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 1_000_000),
              title,
              body: options?.body ?? '',
              schedule: { at: new Date(Date.now() + 200) },
            },
          ],
        });
      } catch { /* noop */ }
    })();
    return true;
  }

  if (typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'granted') return false;
  try {
    new Notification(title, { body: options?.body });
    return true;
  } catch {
    return false;
  }
}

/* ============================================================
   TEST NOTIFICATION HELPERS
   ============================================================ */

/**
 * Schedule a test reminder that fires 5 seconds from now.
 * Optionally pass a task so the notification's `extra.taskId`
 * lets the app jump to it when tapped.
 */
export async function scheduleTestReminder(task?: Task | null): Promise<boolean> {
  const FIRE_IN_SECONDS = 5;
  const title = 'Task Priority · Test Reminder';
  const body = task
    ? `Tap to open "${task.title}" 🎯`
    : 'If you see this, notifications are working. 🎯';

  if (Capacitor.isNativePlatform()) {
    try {
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        perm = await LocalNotifications.requestPermissions();
      }
      if (perm.display !== 'granted') return false;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1_000_000),
            title,
            body,
            schedule: { at: new Date(Date.now() + FIRE_IN_SECONDS * 1000) },
            channelId: 'task-reminders-silent',
            actionTypeId: 'TASK_ACTIONS',
            extra: task
              ? { taskId: task.id, quadrant: task.quadrant, type: 'test' }
              : { type: 'test' },
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  if (typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'granted') {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return false;
    } catch {
      return false;
    }
  }
  try {
    new Notification(title, { body });
    return true;
  } catch {
    return false;
  }
}

export const scheduleTestNotification = scheduleTestReminder;

/* ============================================================
   NOTIFICATION ACTIONS
   ============================================================ */

export const TASK_ACTION_TYPE = 'TASK_ACTIONS';
export const ACTION_SNOOZE = 'SNOOZE';
export const ACTION_DONE = 'DONE';

export function registerNotificationActions(): void {
  if (!Capacitor.isNativePlatform()) return;
  // Action registration is done via `actionTypeId` on individual notifications.
  // This function exists as a safe no-op so App.tsx's useEffect calls don't break.
}

export async function snoozeTaskReminder(task: Task, minutes = 10): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 1_000_000),
          title: `⏰ Reminder: ${task.title}`,
          body: `Snoozed for ${minutes} minutes.`,
          schedule: { at: new Date(Date.now() + minutes * 60 * 1000) },
          channelId: 'task-reminders-silent',
          actionTypeId: TASK_ACTION_TYPE,
          extra: { taskId: task.id, quadrant: task.quadrant },
        },
      ],
    });
  } catch { /* noop */ }
}

/* ============================================================
   DUE-TASK HELPER
   ============================================================ */

export function getDueTasks(tasks: Task[]): Task[] {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const cutoff = endOfToday.getTime();

  return tasks.filter((t: any) => {
    if (t.completed || t.status === 'completed') return false;
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    if (isNaN(due.getTime())) return false;
    return due.getTime() <= cutoff;
  });
}