// ─────────────────────────────────────────────────────────────
//  FILE: src/components/AppLogo.tsx
//  MerakiList brand mark — List M (Amber on Black).
//  M monogram + amber diamond at the check tip + 3 task bars:
//  done (amber) · in progress · todo.
//  Works from 16px favicon up to 256px hero without losing detail.
// ─────────────────────────────────────────────────────────────

import React, { useId } from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 44, className = '' }) => {
  // Unique IDs per component instance so multiple logos never clash.
  const uid = useId().replace(/:/g, '');
  const bgId = `ml-bg-${uid}`;
  const mId = `ml-m-${uid}`;
  const amberId = `ml-amber-${uid}`;
  const embossId = `ml-emboss-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="MerakiList"
      role="img"
      style={{ display: 'block' }}
    >
      <defs>
        {/* Tile background — near-black vertical gradient */}
        <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#18181b" />
          <stop offset="100%" stopColor="#05050a" />
        </linearGradient>

        {/* M monogram — silver gradient */}
        <linearGradient id={mId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dcdce5" />
        </linearGradient>

        {/* Amber accent — light → mid → dark */}
        <linearGradient id={amberId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>

        {/* Emboss filter — subtle 3D bevel on the M */}
        <filter id={embossId}>
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.7" result="blur" />
          <feSpecularLighting
            in="blur"
            surfaceScale="2"
            specularConstant="0.8"
            specularExponent="22"
            lightingColor="#ffffff"
            result="spec"
          >
            <fePointLight x="30" y="15" z="60" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="spec-in" />
          <feComposite
            in="SourceGraphic"
            in2="spec-in"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="0.35"
            k4="0"
          />
        </filter>
      </defs>

      {/* ── Rounded tile background ── */}
      <rect width="128" height="128" rx="30" fill={`url(#${bgId})`} />

      {/* ── M monogram ── */}
      <path
        d="M 40 64 L 40 26 L 54 42 L 68 26 L 68 40 L 82 24"
        stroke={`url(#${mId})`}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={`url(#${embossId})`}
      />

      {/* ── Amber diamond at the check tip ── */}
      <path d="M 82 19.5 L 86.5 24 L 82 28.5 L 77.5 24 Z" fill={`url(#${amberId})`} />
      <path d="M 82 22 L 84 24 L 82 26 L 80 24 Z" fill="#fffbe8" />

      {/* ── 3 task bars: done · in progress · todo ── */}
      {/* Done — amber, filled, with checkbox dot */}
      <rect x="28" y="80" width="4" height="4" rx="1" fill={`url(#${amberId})`} />
      <rect x="36" y="80" width="64" height="4" rx="2" fill={`url(#${amberId})`} opacity="0.9" />

      {/* In progress — white 35%, empty checkbox */}
      <rect x="28" y="92" width="4" height="4" rx="1" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" />
      <rect x="36" y="92" width="64" height="4" rx="2" fill="#ffffff" opacity="0.35" />

      {/* Todo — white 18%, empty checkbox, shorter */}
      <rect x="28" y="104" width="4" height="4" rx="1" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" />
      <rect x="36" y="104" width="40" height="4" rx="2" fill="#ffffff" opacity="0.18" />
    </svg>
  );
};