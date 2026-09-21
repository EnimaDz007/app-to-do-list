/**
 * Browser Notification & Audio Chime Utilities (Native JavaScript Web Audio API)
 */

import { Task } from '../types';

export type SoundAlertId = 'crystal' | 'modern' | 'triumph' | 'marimba' | 'radar' | 'classic';

export interface SoundAlertOption {
  id: SoundAlertId;
  name: string;
  description: string;
  tag: string;
}

export const SOUND_ALERT_OPTIONS: SoundAlertOption[] = [
  {
    id: 'crystal',
    name: 'Crystal Bell',
    description: 'Serene, crystalline chime with pure overtones',
    tag: 'Calm & Zen',
  },
  {
    id: 'modern',
    name: 'Modern Ding',
    description: 'Crisp, snappy high-frequency pop for fast tasks',
    tag: 'Minimal',
  },
  {
    id: 'triumph',
    name: 'Ascending Triumph',
    description: 'Warm multi-note chord celebrating completion',
    tag: 'Reward',
  },
  {
    id: 'marimba',
    name: 'Warm Marimba',
    description: 'Acoustic double wood-tap resonance',
    tag: 'Acoustic',
  },
  {
    id: 'radar',
    name: 'Pulse Radar',
    description: 'Dual futuristic smartwatch electronic ping',
    tag: 'Digital',
  },
  {
    id: 'classic',
    name: 'Classic Desk Bell',
    description: 'Traditional two-tone harmonic bell ring',
    tag: 'Classic',
  },
];

const SOUND_STORAGE_KEY = 'taskflow_selected_sound_alert';

/**
 * Gets currently active alert sound preference
 */
export function getSelectedAlertSound(): SoundAlertId {
  try {
    const saved = localStorage.getItem(SOUND_STORAGE_KEY) as SoundAlertId;
    if (saved && SOUND_ALERT_OPTIONS.some((o) => o.id === saved)) {
      return saved;
    }
  } catch {
    // fallback if localStorage unavailable
  }
  return 'crystal';
}

/**
 * Saves alert sound preference to localStorage
 */
export function setSelectedAlertSound(soundId: SoundAlertId): void {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, soundId);
  } catch {
    // ignore
  }
}

/**
 * Plays a rich synthesizer alert sound using Web Audio API
 */
export function playAudioAlert(soundId?: SoundAlertId, volume = 0.18): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    const targetSound = soundId || getSelectedAlertSound();

    switch (targetSound) {
      case 'crystal': {
        // Serene Crystal Bell (A5 + overtone A6 + gentle 5th E6)
        const notes = [
          { freq: 880, gain: volume, decay: 0.6 },
          { freq: 1760, gain: volume * 0.45, decay: 0.4 },
          { freq: 1318.5, gain: volume * 0.25, decay: 0.5 },
        ];
        notes.forEach(({ freq, gain: g, decay }) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gainNode.gain.setValueAtTime(g, now);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + decay + 0.05);
        });
        break;
      }

      case 'modern': {
        // Modern crisp ding / snappy sweep
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
        gainNode.gain.setValueAtTime(volume * 1.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      case 'triumph': {
        // Ascending major chord (C5, E5, G5, C6)
        const chord = [523.25, 659.25, 783.99, 1046.5];
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          const start = now + idx * 0.07;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          gainNode.gain.setValueAtTime(volume * 0.85, start);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.38);
        });
        break;
      }

      case 'marimba': {
        // Warm acoustic marimba double-tap (wood attack + warm tone)
        const strikes = [
          { f: 440, delay: 0 },
          { f: 554.37, delay: 0.1 },
        ];
        strikes.forEach(({ f, delay }) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          const start = now + delay;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, start);
          gainNode.gain.setValueAtTime(volume * 1.2, start);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.28);
        });
        break;
      }

      case 'radar': {
        // Dual smartwatch electronic ping
        const pings = [
          { freq: 950, start: now, dur: 0.07 },
          { freq: 1250, start: now + 0.09, dur: 0.12 },
        ];
        pings.forEach(({ freq, start, dur }) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gainNode.gain.setValueAtTime(volume * 0.9, start);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, start + dur);
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + dur + 0.02);
        });
        break;
      }

      case 'classic': {
        // Classic Desk Bell (Two harmonizing tones with long resonance)
        const freqs = [1046.5, 783.99]; // C6 then G5
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          const start = now + idx * 0.12;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gainNode.gain.setValueAtTime(volume, start);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.52);
        });
        break;
      }
    }
  } catch {
    // AudioContext may be blocked before first user gesture
  }
}

/**
 * Plays a pleasant audio cue when activating or releasing the push-to-talk microphone
 */
export function playVoiceCue(mode: 'start' | 'stop' | 'success'): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    if (mode === 'start') {
      // Crisp subtle double chirp (440Hz -> 880Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (mode === 'stop') {
      // Soft gentle tone (880Hz -> 520Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.09);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (mode === 'success') {
      // Warm chord confirmation
      [659.25, 880].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.05);
        gain.gain.setValueAtTime(0.12, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.22);
      });
    }
  } catch {
    // AudioContext blocked
  }
}

/**
 * Backward compatibility wrapper that triggers audio alert
 */
export function playAudioChime(type: 'beep' | 'success' | 'timer' = 'beep'): void {
  if (type === 'success') {
    playAudioAlert('triumph');
  } else if (type === 'timer') {
    playAudioAlert(undefined);
  } else {
    playAudioAlert(undefined);
  }
}

/**
 * Checks if browser notifications are supported
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Request permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return 'denied';
  }
}

/**
 * Show a browser notification
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): boolean {
  if (!isNotificationSupported()) return false;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/apple-touch-icon.png',
        ...options,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Scans active tasks and returns those due today or overdue
 */
export function getDueTasks(tasks: Task[]): Task[] {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  return tasks.filter((t) => {
    if (t.status === 'completed') return false;
    if (!t.dueDate) return false;
    return t.dueDate <= todayStr;
  });
}
