import { useEffect, useRef } from 'react';

/**
 * Fires `onSync` on a slow interval, only while the tab is visible.
 *
 * Why this exists: the app used to fire sync every 60s regardless of
 * whether the tab was visible. Idle background tabs burned through the
 * Firestore free-tier quota (50k reads/day) in a few hours.
 *
 * Behavior:
 *   • Syncs once immediately when the tab becomes visible again
 *   • Then every `intervalMs` while visible
 *   • Pauses completely when hidden (browser tab switching, phone lock, etc.)
 *   • Also fires on `online` event (reconnect after WiFi drop)
 */
export function useSyncScheduler(
  enabled: boolean,
  onSync: () => void | Promise<void>,
  intervalMs = 5 * 60 * 1000, // 5 minutes
) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled) return;

    const fire = () => {
      try { void onSyncRef.current(); } catch { /* noop */ }
    };

    // Fire once on mount (the app just loaded / user just signed in)
    fire();

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(fire, intervalMs);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    // Only run when tab is visible
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fire();     // catch up immediately on return
        start();
      } else {
        stop();
      }
    };

    // Network reconnect → sync immediately
    const onOnline = () => fire();

    if (document.visibilityState === 'visible') start();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  }, [enabled, intervalMs]);
}