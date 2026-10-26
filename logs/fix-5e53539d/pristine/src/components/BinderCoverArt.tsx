// ─────────────────────────────────────────────────────────────
//  FILE: src/components/BinderCoverArt.tsx
//
//  ORIGINAL artwork — hand-authored SVG. No stock image, no
//  traced source, no third-party asset. You own it outright.
//
//  Red leather, gold-tooled:
//    · pebbled leather ground        · gold-tooled botanical motif
//    · gold-stamped debossed panel   · spine + hinge groove
//    · raking light, warm falloff
//
//  The wordmark + seal are rendered in HTML on top (BinderView),
//  so they stay crisp at any size.
// ─────────────────────────────────────────────────────────────

import React from 'react';

/* ── A ginkgo-fan flower: radiating veins inside a bowed outline ── */
export const FanFlower = ({
  cx, cy, r, veins = 17, rot = 0, color, w = 1, o = 1,
}: { cx: number; cy: number; r: number; veins?: number; rot?: number; color: string; w?: number; o?: number }) => {
  const tips = Array.from({ length: veins }).map((_, i) => {
    const a = ((-72 + (144 / (veins - 1)) * i) * Math.PI) / 180;
    return { x: Math.sin(a) * r, y: -Math.cos(a) * r };
  });
  const left = tips[0];
  const right = tips[tips.length - 1];

  return (
    <g
      transform={`translate(${cx} ${cy}) rotate(${rot})`}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={o}
    >
      <path d={`M ${left.x} ${left.y} Q 0 ${-r * 1.24} ${right.x} ${right.y}`} />
      {tips.map((p, i) => <path key={i} d={`M 0 0 L ${p.x} ${p.y}`} opacity="0.9" />)}
      {tips.filter((_, i) => i % 2 === 0).map((p, i) => (
        <path key={`h${i}`} d={`M 0 0 L ${p.x * 0.54} ${p.y * 0.54}`} opacity="0.45" />
      ))}
      <path d={`M 0 0 L 0 ${r * 0.3}`} opacity="0.85" />
    </g>
  );
};

export const BinderCoverArt: React.FC = () => (
  <svg
    viewBox="0 0 400 560"
    preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
  >
    <defs>
      {/* ── red leather ground ── */}
      <linearGradient id="cvBase" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%"   stopColor="#AC2E36" />
        <stop offset="40%"  stopColor="#8C1D26" />
        <stop offset="100%" stopColor="#540D16" />
      </linearGradient>

      {/* ── pebbled leather grain ── */}
      <filter id="cvGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="9" />
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.55 0.55 0.55 0 0" />
      </filter>

      {/* ── spine: dark at the hinge, catching light in the middle ── */}
      <linearGradient id="cvSpine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stopColor="#38070F" />
        <stop offset="38%"  stopColor="#6E1119" />
        <stop offset="74%"  stopColor="#4A0A12" />
        <stop offset="100%" stopColor="#26040A" />
      </linearGradient>

      {/* ── gold tooling ── */}
      <linearGradient id="cvGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#F2DEA9" />
        <stop offset="48%"  stopColor="#C9A85F" />
        <stop offset="100%" stopColor="#8A713F" />
      </linearGradient>

      {/* ── raking light from top-left + corner falloff ── */}
      <linearGradient id="cvLight" x1="0" y1="0" x2="0.55" y2="1">
        <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.17" />
        <stop offset="34%"  stopColor="#FFFFFF" stopOpacity="0.02" />
        <stop offset="70%"  stopColor="#000000" stopOpacity="0.10" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.26" />
      </linearGradient>
      <radialGradient id="cvVig" cx="42%" cy="38%" r="78%">
        <stop offset="56%"  stopColor="#000000" stopOpacity="0" />
        <stop offset="100%" stopColor="#1A0407" stopOpacity="0.44" />
      </radialGradient>
    </defs>

    {/* ═══ LEATHER GROUND ═══ */}
    <rect width="400" height="560" fill="url(#cvBase)" />
    <rect width="400" height="560" filter="url(#cvGrain)" opacity="0.32" style={{ mixBlendMode: 'multiply' }} />

    {/* ═══ GOLD-TOOLED BOTANICAL MOTIF ═══ */}
    <g opacity="0.58">
      {/* deeper-tooled shadow fields for depth */}
      <ellipse cx="58"  cy="66"  rx="142" ry="138" fill="#3A0710" opacity="0.52" />
      <ellipse cx="200" cy="504" rx="152" ry="122" fill="#3A0710" opacity="0.44" />
      <ellipse cx="352" cy="172" rx="88"  ry="96"  fill="#3A0710" opacity="0.30" />

      <FanFlower cx={42}  cy={126} r={128} rot={-22} color="#D9B86A" w={1.0}  veins={21} o={0.88} />
      <FanFlower cx={352} cy={296} r={114} rot={30}  color="#D9B86A" w={1.0}  veins={19} o={0.82} />
      <FanFlower cx={22}  cy={512} r={118} rot={26}  color="#B08E4A" w={1.05} veins={19} o={0.62} />
      <FanFlower cx={282} cy={562} r={108} rot={-12} color="#B08E4A" w={1.05} veins={17} o={0.66} />
    </g>

    {/* ═══ SPINE + HINGE GROOVE ═══ */}
    <rect x="0" y="0" width="46" height="560" fill="url(#cvSpine)" />
    <rect x="46" y="0" width="2.5" height="560" fill="#1E0308" opacity="0.7" />
    <rect x="48.5" y="0" width="1.2" height="560" fill="#E0B96F" opacity="0.20" />
    <rect x="0" y="0"   width="46" height="4" fill="#1A0307" opacity="0.5" />
    <rect x="0" y="556" width="46" height="4" fill="#1A0307" opacity="0.5" />

    {/* ═══ GOLD-STAMPED PANEL (pressed into the leather) ═══ */}
    <rect x="104" y="198" width="192" height="156" fill="#2A050B" fillOpacity="0.32" />
    {/* engraved shadow on top/left, catch-light on bottom/right */}
    <path d="M104 354 V198 H296" fill="none" stroke="#1C0206" strokeOpacity="0.60" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M104 354 H296 V198" fill="none" stroke="#F2DCAA" strokeOpacity="0.20" strokeWidth="1.1" strokeLinejoin="round" />
    {/* the gold rules themselves */}
    <rect x="104" y="198" width="192" height="156" fill="none" stroke="url(#cvGold)" strokeWidth="1.6" opacity="0.92" />
    <rect x="113" y="207" width="174" height="138" fill="none" stroke="url(#cvGold)" strokeWidth="0.6" opacity="0.46" />

    {/* ═══ LIGHT PASS ═══ */}
    <rect width="400" height="560" fill="url(#cvLight)" />
    <rect width="400" height="560" fill="url(#cvVig)" />

    {/* top-edge catch-light */}
    <rect x="46" y="0" width="354" height="1.6" fill="#FFFFFF" opacity="0.13" />
  </svg>
);
