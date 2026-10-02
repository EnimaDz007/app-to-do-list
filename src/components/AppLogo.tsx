import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
}

/**
 * Task Priority brand mark — Midnight Aurora style.
 * Four quadrant blocks arranged like the Eisenhower matrix,
 * with the Do First quadrant highlighted in rose and a
 * sparkle at the center. Works at any size, no image file needed.
 */
export const AppLogo: React.FC<AppLogoProps> = ({ size = 44, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Task Priority"
    >
      <defs>
        {/* Background gradient — matches widget */}
        <linearGradient id="tpLogoBg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="45%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>

        {/* Do First quadrant — rose */}
        <linearGradient id="tpQ1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>

        {/* Schedule quadrant — indigo */}
        <linearGradient id="tpQ2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        {/* Delegate quadrant — emerald */}
        <linearGradient id="tpQ3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Eliminate quadrant — slate */}
        <linearGradient id="tpQ4" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>

        {/* Sparkle glow */}
        <radialGradient id="tpSparkle" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="60%" stopColor="#FEF3C7" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0" />
        </radialGradient>

        {/* Outer ring */}
        <linearGradient id="tpRing" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect width="44" height="44" rx="13" fill="url(#tpLogoBg)" />

      {/* Subtle outer border ring */}
      <rect
        x="0.75"
        y="0.75"
        width="42.5"
        height="42.5"
        rx="12.25"
        fill="none"
        stroke="url(#tpRing)"
        strokeWidth="1.5"
      />

      {/* Inner quadrant circle guides */}
      <circle
        cx="22"
        cy="22"
        r="13.5"
        fill="none"
        stroke="white"
        strokeOpacity="0.08"
        strokeWidth="0.6"
      />
      <circle
        cx="22"
        cy="22"
        r="9"
        fill="none"
        stroke="white"
        strokeOpacity="0.06"
        strokeWidth="0.5"
      />

      {/* ── The 4 quadrants ── */}
      {/* Do First (top-left) — brighter, hero */}
      <rect x="11" y="11" width="9" height="9" rx="2.5" fill="url(#tpQ1)" />
      <rect x="11" y="11" width="9" height="9" rx="2.5" fill="white" fillOpacity="0.08" />

      {/* Schedule (top-right) */}
      <rect x="24" y="11" width="9" height="9" rx="2.5" fill="url(#tpQ2)" opacity="0.9" />

      {/* Delegate (bottom-left) */}
      <rect x="11" y="24" width="9" height="9" rx="2.5" fill="url(#tpQ3)" opacity="0.9" />

      {/* Eliminate (bottom-right) */}
      <rect x="24" y="24" width="9" height="9" rx="2.5" fill="url(#tpQ4)" opacity="0.55" />

      {/* ── Center sparkle ── */}
      <circle cx="22" cy="22" r="5" fill="url(#tpSparkle)" />
      <path
        d="M22 18.5 L22.9 21.1 L25.5 22 L22.9 22.9 L22 25.5 L21.1 22.9 L18.5 22 L21.1 21.1 Z"
        fill="#FFFFFF"
        opacity="0.95"
      />
    </svg>
  );
};