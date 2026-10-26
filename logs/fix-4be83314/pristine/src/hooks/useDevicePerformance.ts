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

// 🚀 Real FPS measurement
function measureFPS(duration = 800): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    function tick() {
      frames++;
      const elapsed = performance.now() - start;
      if (elapsed < duration) {
        requestAnimationFrame(tick);
      } else {
        resolve((frames * 1000) / elapsed);
      }
    }
    requestAnimationFrame(tick);
  });
}

export function useDevicePerformance() {
  useEffect(() => {
    // Step 1: Quick tier guess from hardware
    let tier = detectDeviceTier();
    const root = document.documentElement;
    root.classList.remove('perf-low', 'perf-mid', 'perf-high');
    root.classList.add(`perf-${tier}`);
    console.log('⚡ Initial tier (hardware guess):', tier);

    // Step 2: Measure actual FPS after app loads
    setTimeout(async () => {
      const fps = await measureFPS(1000);
      console.log('⚡ Measured FPS:', Math.round(fps));

      // If FPS is low, downgrade the tier
      if (fps < 30 && tier !== 'low') {
        tier = 'low';
        root.classList.remove('perf-mid', 'perf-high');
        root.classList.add('perf-low');
        console.log('⚡ FPS too low — downgraded to: low');
      } else if (fps < 45 && tier === 'high') {
        tier = 'mid';
        root.classList.remove('perf-high');
        root.classList.add('perf-mid');
        console.log('⚡ FPS moderate — downgraded to: mid');
      }
    }, 1500);
  }, []);
}
