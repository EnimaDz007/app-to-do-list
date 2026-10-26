import { useTheme } from '../context/ThemeContext';

/**
 * 🎨 Shared design color palette
 * Auto-adapts to light/dark mode + perf tier
 *
 * Usage in ANY design component:
 *   const c = useDesignColors();
 *   style={{ background: c.bg, color: c.text, boxShadow: c.shadowSoft }}
 */
export function useDesignColors() {
  const { isDark } = useTheme();

  // Check perf tier (set by useDevicePerformance)
  const isLow =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('perf-low');

  if (isDark) {
    return {
      isDark,
      isLow,
      // Backgrounds
      bg: '#1E293B',
      bgCard: '#243449',
      bgInset: '#1A2638',
      // Text
      text: '#F1F5F9',
      textMuted: '#94A3B8',
      textSoft: '#64748B',
      // Borders
      border: '#334155',
      borderSoft: '#1E293B',
      // Shadows
      shadowDark: '#0F172A',
      shadowLight: '#334155',
      shadowSoft: isLow
        ? 'none'
        : '0 4px 14px rgba(0, 0, 0, 0.3)',
      shadowHard: isLow
        ? 'none'
        : '0 8px 24px rgba(0, 0, 0, 0.4)',
      // Special
      overlay: 'rgba(0, 0, 0, 0.6)',
      glass: 'rgba(30, 41, 59, 0.85)',
      ring: 'rgba(148, 163, 184, 0.2)',
    };
  }

  // Light mode
  return {
    isDark,
    isLow,
    bg: '#EDF1F7',
    bgCard: '#FFFFFF',
    bgInset: '#E3E8EF',
    text: '#1E293B',
    textMuted: '#94A3B8',
    textSoft: '#64748B',
    border: '#E2E8F0',
    borderSoft: '#F1F5F9',
    shadowDark: '#C8CED8',
    shadowLight: '#FFFFFF',
    shadowSoft: isLow
      ? 'none'
      : '0 4px 14px rgba(15, 23, 42, 0.06)',
    shadowHard: isLow
      ? 'none'
      : '0 8px 24px rgba(15, 23, 42, 0.08)',
    overlay: 'rgba(15, 23, 42, 0.4)',
    glass: 'rgba(255, 255, 255, 0.85)',
    ring: 'rgba(15, 23, 42, 0.08)',
  };
}
