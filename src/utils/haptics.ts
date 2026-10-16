// Web Audio & Haptic vibration feedback for mobile feel

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection';

/* ── Singleton AudioContext ──────────────────────────────
   Creating a new AudioContext per call leaks resources
   and browsers cap the number you can create (~6).
   Reuse one for the whole session. */
let sharedCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) {
    try {
      sharedCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

/* ── Throttle ────────────────────────────────────────────
   Rapid taps should not stack vibrations or clicks. */
let lastFireAt = 0;
const MIN_GAP_MS = 40;

export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (now - lastFireAt < MIN_GAP_MS) return;
  lastFireAt = now;

  /* ── Vibration API (Android Chrome / native WebView) ── */
  if ('vibrate' in navigator) {
    try {
      switch (type) {
        case 'light':     navigator.vibrate(12); break;
        case 'medium':    navigator.vibrate(25); break;
        case 'heavy':     navigator.vibrate([30, 40, 30]); break;
        case 'success':   navigator.vibrate([15, 50, 20]); break;
        case 'error':     navigator.vibrate([40, 30, 40, 30, 40]); break;
        case 'selection': navigator.vibrate(8); break;
      }
    } catch {
      // Vibration permission may be denied — ignore
    }
  }

  /* ── Web Audio click (reuses singleton context) ── */
  const ctx = getAudioCtx();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t = ctx.currentTime;

    if (type === 'success') {
      osc.frequency.setValueAtTime(523.25, t);         // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, t + 0.12); // G5
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.18);
    } else if (type === 'error') {
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.16);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.2);
    } else {
      const freq = type === 'heavy' ? 220 : type === 'selection' ? 480 : 380;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.03, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  } catch {
    // Audio context may be restricted until first user gesture
  }
}

/* Call once on first user interaction to warm up the AudioContext.
   Mobile browsers keep it suspended until a real gesture. */
export function unlockHaptics(): void {
  const ctx = getAudioCtx();
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