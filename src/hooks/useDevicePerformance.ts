import { useEffect } from 'react';

export type DeviceTier = 'low' | 'mid' | 'high';

export function detectDeviceTier(): DeviceTier {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'mid';
  }

  let score = 0;
  const cores = (navigator as any).hardwareConcurrency || 2;
  if (cores >= 8) score += 3;
  else if (cores >= 6) score += 2;
  else if (cores >= 4) score += 1;

  const memory = (navigator as any).deviceMemory;
  if (typeof memory === 'number') {
    if (memory >= 6) score += 3;
    else if (memory >= 4) score += 2;
    else if (memory >= 2) score += 1;
  }

  const screenArea = window.screen.width * window.screen.height;
  if (screenArea >= 1080 * 1920) score += 2;
  else if (screenArea >= 720 * 1280) score += 1;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    score -= 1;
  }

  if (score >= 7) return 'high';
  if (score >= 4) return 'mid';
  return 'low';
}

export function useDevicePerformance() {
  useEffect(() => {
    let tier = detectDeviceTier();
    
    // 🚨 FIX: Never allow budget phones to fall into the 'low' tier. 
    // 'low' completely disables all CSS animations globally in your app.
    // By forcing 'mid', we guarantee the orbit spins and theme transitions play.
    if (tier === 'low') {
      tier = 'mid';
    }

    const root = document.documentElement;
    root.classList.remove('perf-low', 'perf-mid', 'perf-high');
    root.classList.add(`perf-${tier}`);
    
    console.log(`⚡ Animations locked ON. Device tier set to: ${tier}`);

    // 🚨 FIX: We removed the FPS measurement loop entirely.
    // Your phone will now stay in 'mid' mode, which is smooth and allows animations.

  }, []);
}