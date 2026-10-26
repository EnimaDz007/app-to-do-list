// ─────────────────────────────────────────────────────────────
//  FILE: src/components/Logo.tsx
//  The official MerakiList logo — Amber on Black.
//  Scales from 16px favicon to 256px hero without losing detail.
// ─────────────────────────────────────────────────────────────

import React, { useId } from 'react';

interface LogoProps {
  /** Pixel size. Default 128. Works from 16 to 512. */
  size?: number;
  /** Show the rounded black tile background. Default true. Set false for flat logos (sign-in hero). */
  tile?: boolean;
  /** CSS classes to apply to the SVG. */
  className?: string;
  /** Accessible label. Default 'MerakiList'. */
  ariaLabel?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 128,
  tile = true,
  className,
  ariaLabel = 'MerakiList',
}) => {
  // useId ensures gradient/filter IDs are unique per instance,
  // so multiple <Logo /> on the same page don't collide.
  const uid = useId().replace(/:/g, '');
  const bgId = `logo-bg-${uid}`;
  const mId = `logo-m-${uid}`;
  const amberId = `logo-amber-${uid}`;
  const embossId = `logo-emboss-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#18181b" />
          <stop offset="100%" stopColor="#05050a" />
        </linearGradient>
        <linearGradient id={mId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dcdce5" />
        </linearGradient>
        <linearGradient id={amberId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
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

      {tile && <rect width="128" height="128" rx="30" fill={`url(#${bgId})`} />}

      {/* M monogram with embossed bevel */}
      <path
        d="M 40 64 L 40 26 L 54 42 L 68 26 L 68 40 L 82 24"
        stroke={`url(#${mId})`}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={tile ? `url(#${embossId})` : undefined}
      />

      {/* Amber diamond at check tip */}
      <path d="M 82 19.5 L 86.5 24 L 82 28.5 L 77.5 24 Z" fill={`url(#${amberId})`} />
      <path d="M 82 22 L 84 24 L 82 26 L 80 24 Z" fill="#fffbe8" />

      {/* 3 task bars: done · in progress · todo */}
      <rect x="28" y="80" width="4" height="4" rx="1" fill={`url(#${amberId})`} />
      <rect x="36" y="80" width="64" height="4" rx="2" fill={`url(#${amberId})`} opacity="0.9" />
      <rect x="28" y="92" width="4" height="4" rx="1" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" />
      <rect x="36" y="92" width="64" height="4" rx="2" fill="#ffffff" opacity="0.35" />
      <rect x="28" y="104" width="4" height="4" rx="1" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" />
      <rect x="36" y="104" width="40" height="4" rx="2" fill="#ffffff" opacity="0.18" />
    </svg>
  );
};