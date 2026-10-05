// ─────────────────────────────────────────────────────────────
//  FILE: src/components/BinderInsideCover.tsx
//
//  ORIGINAL artwork — hand-authored SVG. No stock image, no
//  third-party asset. You own it outright.
//
//  The inner face of the front cover, seen when the binder opens:
//    · pebbled leather ground          · gold double-rule border
//    · hand-tooled corner flourishes   · blind-tooled botanical echo
//    · inside stamp: rosette + name    · leather document pocket
//      with V-notch, gold rule, saddle stitching and cast shadow
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { FanFlower } from './BinderCoverArt';

/* ── 16-petal tooled rosette ── */
const Rosette = ({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) => (
  <g transform={`translate(${cx} ${cy})`} fill="none" stroke={color} strokeWidth="0.95" strokeLinecap="round">
    {Array.from({ length: 8 }).map((_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      return <path key={i} d={`M 0 0 Q ${x * 0.5 - y * 0.34} ${y * 0.5 + x * 0.34} ${x} ${y}`} opacity="0.85" />;
    })}
    {Array.from({ length: 8 }).map((_, i) => {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      return <path key={`b${i}`} d={`M 0 0 Q ${x * 0.5 + y * 0.34} ${y * 0.5 - x * 0.34} ${x} ${y}`} opacity="0.5" />;
    })}
    <circle r={r * 0.3} />
    <circle r={r * 0.13} fill={color} stroke="none" />
  </g>
);

/* ── gold corner flourish (mirrored for each corner) ── */
const Corner = ({ x, y, sx, sy }: { x: number; y: number; sx: number; sy: number }) => (
  <g transform={`translate(${x} ${y}) scale(${sx} ${sy})`} fill="none" stroke="url(#icGold)" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
    <path d="M0 32 Q0 0 32 0" />
    <path d="M7 26 Q7 9 26 7" opacity="0.62" />
    <path d="M0 32 Q15 31 21 23" opacity="0.45" />
    <path d="M11 11 Q17 11 19 17" opacity="0.4" />
    <circle cx="14" cy="14" r="2.5" fill="url(#icGold)" stroke="none" opacity="0.9" />
  </g>
);

const POCKET_EDGE = 'M 46 366 L 176 366 L 200 392 L 224 366 L 354 366';
const POCKET_BODY = `${POCKET_EDGE} L 354 508 Q 354 524 338 524 L 62 524 Q 46 524 46 508 Z`;
const POCKET_STITCH = 'M 54 374 L 174 374 L 200 399 L 226 374 L 346 374 L 346 504 Q 346 516 334 516 L 66 516 Q 54 516 54 504 Z';

export const BinderInsideCover: React.FC = () => (
  <svg
    viewBox="0 0 400 560"
    preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
  >
    <defs>
      {/* ── inner leather ground — deeper than the outside ── */}
      <linearGradient id="icBase" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%"   stopColor="#56201F" />
        <stop offset="42%"  stopColor="#3E1414" />
        <stop offset="100%" stopColor="#260A0B" />
      </linearGradient>

      {/* ── pebbled grain ── */}
      <filter id="icGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="17" />
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.55 0.55 0.55 0 0" />
      </filter>

      {/* ── gold ── */}
      <linearGradient id="icGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#F0DCA6" />
        <stop offset="46%"  stopColor="#C9A85F" />
        <stop offset="100%" stopColor="#8A713F" />
      </linearGradient>

      {/* ── pocket leather + its cast shadow ── */}
      <linearGradient id="icPocket" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%"   stopColor="#5C2422" />
        <stop offset="52%"  stopColor="#431717" />
        <stop offset="100%" stopColor="#2C0D0E" />
      </linearGradient>
      <linearGradient id="icPocketShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#000000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
      </linearGradient>

      {/* ── pocket clip (so the grain follows the pocket shape) ── */}
      <clipPath id="icPocketClip">
        <path d={POCKET_BODY} />
      </clipPath>

      {/* ── hinge highlight + falloff ── */}
      <linearGradient id="icHinge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stopColor="#FFE6C0" stopOpacity="0.10" />
        <stop offset="26%"  stopColor="#FFE6C0" stopOpacity="0.02" />
        <stop offset="60%"  stopColor="#000000" stopOpacity="0.10" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.30" />
      </linearGradient>
      <radialGradient id="icVig" cx="46%" cy="40%" r="76%">
        <stop offset="54%"  stopColor="#000000" stopOpacity="0" />
        <stop offset="100%" stopColor="#180405" stopOpacity="0.5" />
      </radialGradient>
    </defs>

    {/* ═══ LEATHER GROUND ═══ */}
    <rect width="400" height="560" fill="url(#icBase)" />
    <rect width="400" height="560" filter="url(#icGrain)" opacity="0.30" style={{ mixBlendMode: 'multiply' }} />

    {/* ═══ BLIND-TOOLED BOTANICAL ECHO (barely there, like a real lining) ═══ */}
    <g opacity="0.15">
      <FanFlower cx={72}  cy={252} r={150} rot={-18} color="#D9B86A" w={1.1} veins={23} o={0.9} />
      <FanFlower cx={352} cy={470} r={132} rot={28}  color="#D9B86A" w={1.1} veins={21} o={0.8} />
    </g>

    {/* ═══ GOLD DOUBLE-RULE BORDER + CORNER FLOURISHES ═══ */}
    <rect x="14" y="14" width="372" height="532" fill="none" stroke="url(#icGold)" strokeWidth="1.5" opacity="0.72" />
    <rect x="21" y="21" width="358" height="518" fill="none" stroke="url(#icGold)" strokeWidth="0.5" opacity="0.34" />
    <Corner x={21}  y={21}  sx={1}  sy={1}  />
    <Corner x={379} y={21}  sx={-1} sy={1}  />
    <Corner x={21}  y={539} sx={1}  sy={-1} />
    <Corner x={379} y={539} sx={-1} sy={-1} />

    {/* ═══ INSIDE STAMP ═══ */}
    <Rosette cx={200} cy={78} r={27} color="url(#icGold)" />
    <text
      x="200" y="132" textAnchor="middle"
      fontFamily="Cinzel, Georgia, serif" fontSize="9" fontWeight="600"
      letterSpacing="4.5" fill="url(#icGold)" opacity="0.9"
    >
      MERAKILIST
    </text>
    <rect x="150" y="142" width="100" height="0.8" fill="url(#icGold)" opacity="0.45" />
    <text
      x="200" y="160" textAnchor="middle"
      fontFamily="'JetBrains Mono', monospace" fontSize="6.2"
      letterSpacing="2.6" fill="url(#icGold)" opacity="0.55"
    >
      TASK PRIORITY · EST. 2026
    </text>

    {/* ═══ ORNAMENTAL DIVIDER ═══ */}
    <g opacity="0.5">
      <path d="M 126 268 H 176" stroke="url(#icGold)" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M 224 268 H 274" stroke="url(#icGold)" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M 200 260 L 208 268 L 200 276 L 192 268 Z" fill="url(#icGold)" />
      <circle cx="182" cy="268" r="1.6" fill="url(#icGold)" />
      <circle cx="218" cy="268" r="1.6" fill="url(#icGold)" />
    </g>

    {/* ═══ CAST SHADOW ABOVE THE POCKET ═══ */}
    <rect x="42" y="330" width="316" height="38" fill="url(#icPocketShade)" />

    {/* ═══ LEATHER DOCUMENT POCKET ═══ */}
    <path d={POCKET_BODY} fill="url(#icPocket)" />
    <g clipPath="url(#icPocketClip)">
      <rect x="0" y="0" width="400" height="560" filter="url(#icGrain)" opacity="0.30" style={{ mixBlendMode: 'multiply' }} />
    </g>
    {/* top-edge catch-light, gold rule, and a second lip line below */}
    <path d={POCKET_EDGE} fill="none" stroke="#FFE9C4" strokeWidth="0.6" opacity="0.16" transform="translate(0 -1.2)" />
    <path d={POCKET_EDGE} fill="none" stroke="url(#icGold)" strokeWidth="1.7" strokeLinejoin="round" opacity="0.88" />
    <path d={POCKET_EDGE} fill="none" stroke="#FFE9C4" strokeWidth="0.5" strokeLinejoin="round" opacity="0.22" transform="translate(0 1.4)" />
    {/* saddle stitching */}
    <path d={POCKET_STITCH} fill="none" stroke="#E7CD94" strokeWidth="0.85" strokeDasharray="5 4" opacity="0.5" strokeLinecap="round" />

    {/* ═══ POCKET STAMP ═══ */}
    <g opacity="0.62">
      <Rosette cx={200} cy={450} r={17} color="url(#icGold)" />
      <path d="M 158 492 H 182 M 218 492 H 242" stroke="url(#icGold)" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M 200 487 L 205 492 L 200 497 L 195 492 Z" fill="url(#icGold)" />
    </g>

    {/* ═══ HINGE HIGHLIGHT + FALLOFF ═══ */}
    <rect width="400" height="560" fill="url(#icHinge)" />
    <rect width="400" height="560" fill="url(#icVig)" />
  </svg>
);
