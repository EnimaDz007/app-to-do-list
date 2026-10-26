import { useEffect, useRef, useState } from 'react';

/**
 * Detects browser online/offline status.
 *
 * Hardened:
 *   • Debounces rapid flips (Wi-Fi flap, airplane mode toggles)
 *   • Ignores the "false offline" that fires during tab wake on some browsers
 *   • SSR-safe initial value
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleChange = (next: boolean) => {
      // Debounce: only apply if the state is stable for 150ms.
      // Kills Wi-Fi flap flicker; still fast enough to be imperceptible.
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setIsOnline(next);
      }, 150);
    };

    const onOnline  = () => handleChange(true);
    const onOffline = () => handleChange(false);

    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);

    // Re-check on tab wake — some browsers report stale onLine after sleep
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        handleChange(navigator.onLine);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return isOnline;
}

/**
 * Same as useOnlineStatus but also exposes a monotonic counter that
 * increments every time the app transitions offline → online.
 *
 * Use this in components that need to trigger a catch-up sync on reconnect.
 */
export function useOnlineStatusWithReconnect(): {
  isOnline: boolean;
  reconnectCount: number;
} {
  const isOnline = useOnlineStatus();
  const [reconnectCount, setReconnectCount] = useState(0);
  const prevRef = useRef(isOnline);

  useEffect(() => {
    if (!prevRef.current && isOnline) {
      setReconnectCount((n) => n + 1);
    }
    prevRef.current = isOnline;
  }, [isOnline]);

  return { isOnline, reconnectCount };
}