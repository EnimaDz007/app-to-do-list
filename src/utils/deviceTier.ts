export type DeviceTier = 'low' | 'mid' | 'high';

export const getDeviceTier = (): DeviceTier => {
  if (typeof navigator === 'undefined') return 'high';

  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as any).deviceMemory || 4; // GB, Chrome-only
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Low-end: weak CPU + low RAM (like Samsung M11)
  if (cores <= 4 && memory <= 2) return 'low';
  if (cores <= 4 && isMobile) return 'low';

  // Mid-range: moderate specs
  if (cores <= 6 || memory <= 4) return 'mid';

  // High-end: everything else
  return 'high';
};

// Multipliers for particle counts
export const getParticleMultiplier = (tier: DeviceTier): number => {
  switch (tier) {
    case 'low': return 0.3;   // 70% fewer particles
    case 'mid': return 0.6;   // 40% fewer
    case 'high': return 1.0;  // full effects
  }
};

// Helper to compute particle count
export const particleCount = (baseCount: number, tier: DeviceTier): number => {
  return Math.max(3, Math.round(baseCount * getParticleMultiplier(tier)));
};
