import React from 'react';
import { UIDesign } from '../hooks/useUIDesign';

interface ThemeTransitionOverlayProps {
  target: UIDesign | null;
}

const TOTAL_MS: Record<UIDesign, number> = {
  classic:    2000,
  neumorphic: 2200,
  stacked:    2000,
  radial:     2000,
  tarot:      2100,
  hive:       2400,
  vending:    2100,
  detective:  2000,
  kanban:     2100,
};

export const ThemeTransitionOverlay: React.FC<ThemeTransitionOverlayProps> = ({ target }) => {
  if (!target) return null;

  const total = TOTAL_MS[target] ?? 2000;

  return (
    <div
      className="fixed inset-0 z-[200] pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Blur layer — blurs everything behind the overlay */}
      <div
        className="absolute inset-0 tt-blur-layer"
        style={{
          animationDuration: `${total}ms`,
          WebkitBackdropFilter: 'blur(0px)',
          backdropFilter: 'blur(0px)',
        }}
      />

      {/* Violet vignette tint over the blurred background */}
      <div
        className="absolute inset-0 tt-vignette"
        style={{ animationDuration: `${total}ms` }}
      />

      {/* Shared diagonal rune sweep */}
      <div
        className="absolute -inset-y-1/3 left-[-60%] w-[220%] tt-rune-sweep"
        style={{
          animationDuration: `${total}ms`,
          background:
            'linear-gradient(100deg, transparent 0%, rgba(167,139,250,0) 30%, rgba(236,72,153,0.55) 50%, rgba(167,139,250,0) 70%, transparent 100%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Per-theme animation, centered on screen */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full">
          {renderAnimation(target)}
        </div>
      </div>

      <style>{`
        /* ── Blur ramp ── */
        .tt-blur-layer {
          animation-name: ttBlurRamp;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
        }
        @keyframes ttBlurRamp {
          0%   { backdrop-filter: blur(0px);  -webkit-backdrop-filter: blur(0px); }
          18%  { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
          72%  { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
          100% { backdrop-filter: blur(0px);  -webkit-backdrop-filter: blur(0px); }
        }

        .tt-vignette {
          animation-name: ttVignetteRamp;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
          background: radial-gradient(
            circle at 50% 50%,
            rgba(139, 92, 246, 0.18) 0%,
            rgba(15, 23, 42, 0.42) 65%,
            rgba(15, 23, 42, 0.62) 100%
          );
        }
        @keyframes ttVignetteRamp {
          0%   { opacity: 0; }
          18%  { opacity: 1; }
          72%  { opacity: 1; }
          100% { opacity: 0; }
        }

        .tt-rune-sweep {
          animation-name: ttRuneSweep;
          animation-timing-function: cubic-bezier(0.15, 0.6, 0.4, 1);
          animation-fill-mode: forwards;
        }
        @keyframes ttRuneSweep {
          0%   { transform: translateX(0) skewX(-14deg); opacity: 0; }
          25%  { opacity: 1; }
          65%  { opacity: 1; }
          100% { transform: translateX(140%) skewX(-14deg); opacity: 0; }
        }

        /* ═══════════════════ CLASSIC ═══════════════════ */
        .tt-grid-line-v {
          animation: ttGridV 1800ms ease-out forwards;
          transform-origin: center;
        }
        @keyframes ttGridV {
          0%   { transform: scaleY(0); opacity: 0; }
          30%  { transform: scaleY(1); opacity: 1; }
          70%  { transform: scaleY(1); opacity: 1; }
          100% { transform: scaleY(1); opacity: 0; }
        }
        .tt-grid-line-h {
          animation: ttGridH 1800ms ease-out forwards;
          transform-origin: center;
        }
        @keyframes ttGridH {
          0%   { transform: scaleX(0); opacity: 0; }
          30%  { transform: scaleX(1); opacity: 1; }
          70%  { transform: scaleX(1); opacity: 1; }
          100% { transform: scaleX(1); opacity: 0; }
        }

        /* ═══════════════════ NEUMORPHIC ═══════════════════ */
        .tt-neu-wash {
          position: absolute; inset: 0;
          background: radial-gradient(
            circle at 30% 30%,
            rgba(245,243,255,0.85) 0%,
            rgba(224,231,255,0.65) 40%,
            rgba(199,210,254,0.5) 100%
          );
          opacity: 0;
          animation: neuWash 2200ms ease-in-out forwards;
        }
        @keyframes neuWash {
          0%   { opacity: 0; }
          30%  { opacity: 0.9; }
          70%  { opacity: 0.9; }
          100% { opacity: 0; }
        }

        .tt-neu-pill {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(62vmin, 420px);
          height: min(62vmin, 420px);
          border-radius: 26vmin;
          background: linear-gradient(135deg, #FFFFFF 0%, #EDE9FE 55%, #DDD6FE 100%);
          transform: translate(-50%, -50%) scale(0.15);
          opacity: 0;
          animation: neuPill 2200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          will-change: transform, box-shadow, opacity;
          overflow: hidden;
        }
        @keyframes neuPill {
          0% {
            opacity: 0; transform: translate(-50%, -50%) scale(0.15);
            box-shadow: inset -60px -60px 120px rgba(139,92,246,0.5), inset 60px 60px 120px rgba(255,255,255,0.95);
          }
          28% {
            opacity: 1; transform: translate(-50%, -50%) scale(1.05);
            box-shadow: inset -20px -20px 60px rgba(139,92,246,0.22), inset 20px 20px 60px rgba(255,255,255,0.98), 26px 26px 70px rgba(139,92,246,0.38), -26px -26px 70px rgba(255,255,255,0.95);
          }
          48% {
            opacity: 1; transform: translate(-50%, -50%) scale(1);
            box-shadow: inset -22px -22px 62px rgba(139,92,246,0.28), inset 22px 22px 62px rgba(255,255,255,0.98), 26px 26px 70px rgba(139,92,246,0.38), -26px -26px 70px rgba(255,255,255,0.95);
          }
          72% {
            opacity: 1; transform: translate(-50%, -50%) scale(0.92);
            box-shadow: inset 55px 55px 130px rgba(139,92,246,0.55), inset -55px -55px 130px rgba(255,255,255,0.95);
          }
          100% {
            opacity: 0; transform: translate(-50%, -50%) scale(0.35);
            box-shadow: inset 90px 90px 180px rgba(139,92,246,0.55), inset -90px -90px 180px rgba(255,255,255,0.95);
          }
        }

        .tt-neu-inner-light {
          position: absolute; inset: 0; border-radius: inherit;
          animation: neuInnerLight 2200ms ease-in-out forwards;
        }
        @keyframes neuInnerLight {
          0%   { background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95) 0%, transparent 55%); }
          55%  { background: radial-gradient(circle at 70% 70%, rgba(196,181,253,0.75) 0%, transparent 55%); }
          100% { background: radial-gradient(circle at 70% 70%, rgba(255,255,255,0.9) 0%, transparent 55%); }
        }

        .tt-neu-satellite {
          position: absolute;
          width: clamp(48px, 8vmin, 72px);
          height: clamp(48px, 8vmin, 72px);
          border-radius: 20px;
          background: linear-gradient(135deg, #FFFFFF 0%, #EDE9FE 100%);
          transform: translate(-50%, -50%) scale(0);
          opacity: 0;
          animation: neuSatellite 2000ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          will-change: transform, box-shadow, opacity;
        }
        @keyframes neuSatellite {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          28% {
            transform: translate(-50%, -50%) scale(1.15); opacity: 1;
            box-shadow: 8px 8px 20px rgba(139,92,246,0.35), -8px -8px 20px rgba(255,255,255,0.9);
          }
          45% {
            transform: translate(-50%, -50%) scale(1); opacity: 1;
            box-shadow: 8px 8px 20px rgba(139,92,246,0.35), -8px -8px 20px rgba(255,255,255,0.9);
          }
          72% {
            transform: translate(-50%, -50%) scale(0.95); opacity: 1;
            box-shadow: inset 12px 12px 26px rgba(139,92,246,0.5), inset -12px -12px 26px rgba(255,255,255,0.95);
          }
          100% {
            transform: translate(-50%, -50%) scale(0.5); opacity: 0;
            box-shadow: inset 20px 20px 40px rgba(139,92,246,0.5), inset -20px -20px 40px rgba(255,255,255,0.95);
          }
        }

        /* ═══════════════════ SHARED PUFF ═══════════════════ */
        .tt-puff {
          position: absolute;
          animation: ttPuff 1800ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes ttPuff {
          0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          30%  { transform: translate(-50%, -50%) scale(1.2); opacity: 0.9; }
          60%  { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
        }

        /* ═══════════════════ STACKED ═══════════════════ */
        .tt-fall-card {
          position: absolute;
          animation: ttFallCard 1800ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes ttFallCard {
          0%   { transform: translate(-50%, -110vh) rotate(-8deg); opacity: 0; }
          50%  { transform: translate(-50%, 0) rotate(0deg);       opacity: 1; }
          78%  { transform: translate(-50%, 0) rotate(0deg);       opacity: 1; }
          100% { transform: translate(-50%, 20vh) rotate(8deg);    opacity: 0; }
        }

        /* ═══════════════════ RADIAL ═══════════════════ */
        .tt-ring-expand {
          position: absolute;
          left: 50%; top: 50%;
          animation: ttRingExpand 1800ms cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
        }
        @keyframes ttRingExpand {
          0%   { transform: translate(-50%, -50%) scale(0.15); opacity: 0; }
          45%  { transform: translate(-50%, -50%) scale(1);    opacity: 0.9; }
          80%  { transform: translate(-50%, -50%) scale(2);    opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(2.8);  opacity: 0; }
        }

        .tt-dot-fly {
          position: absolute;
          left: 50%; top: 50%;
          animation: ttDotFly 1800ms cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
        }
        @keyframes ttDotFly {
          0%   { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
          25%  { opacity: 1; }
          60%  { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.2); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx2)), calc(-50% + var(--ty2))) scale(0.6); opacity: 0; }
        }

        /* ═══════════════════ TAROT ═══════════════════ */
        .tt-tarot-card {
          position: absolute;
          left: 50%; top: 50%;
          animation: ttTarotCard 1900ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes ttTarotCard {
          0%   { transform: translate(-50%, calc(-50% + 40vh)) rotate(0deg) scale(0.3); opacity: 0; }
          35%  {
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--rot)) scale(1);
            opacity: 1;
          }
          72%  {
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--rot)) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--tx2)), calc(-50% + var(--ty2))) rotate(var(--rot2)) scale(0.6);
            opacity: 0;
          }
        }

        /* ═══════════════════ VENDING ═══════════════════ */
        .tt-coin {
          position: absolute;
          left: 50%;
          font-size: clamp(22px, 5vmin, 32px);
          animation: ttCoin 1900ms cubic-bezier(0.6, 0, 0.4, 1) forwards;
        }
        @keyframes ttCoin {
          0%   { transform: translate(-50%, -80vh) rotate(0deg); opacity: 0; }
          15%  { opacity: 1; }
          55%  { transform: translate(-50%, 0) rotate(360deg); opacity: 1; }
          75%  { transform: translate(-50%, 0) rotate(360deg) scale(1); opacity: 1; }
          100% { transform: translate(-50%, 30px) rotate(400deg) scale(0.6); opacity: 0; }
        }

        .tt-box {
          position: absolute;
          left: 50%; top: 50%;
          animation: ttBoxSlide 1900ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes ttBoxSlide {
          0%   { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          50%  { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          68%  { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
          85%  { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
          100% { transform: translate(-50%, calc(-50% + 45vh)) scale(0.85); opacity: 0; }
        }

        /* ═══════════════════ DETECTIVE ═══════════════════ */
        .tt-pin {
          position: absolute;
          animation: ttPin 1800ms ease-out forwards;
        }
        @keyframes ttPin {
          0%   { transform: translate(-50%, -50%) scale(0);    opacity: 0; }
          30%  { transform: translate(-50%, -50%) scale(1.25); opacity: 1; }
          60%  { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1);    opacity: 0; }
        }

        .tt-string {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: ttString 1800ms ease-out forwards;
        }
        @keyframes ttString {
          0%, 25% { stroke-dashoffset: 200; opacity: 0; }
          30%     { opacity: 1; }
          65%     { stroke-dashoffset: 0; opacity: 1; }
          100%    { stroke-dashoffset: 0; opacity: 0; }
        }

        /* ═══════════════════ KANBAN ═══════════════════ */
        .tt-col-slide {
          position: absolute;
          animation: ttColSlide 1800ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes ttColSlide {
          0%   { transform: translate(calc(-50% + var(--from)), -50%) scale(0.7); opacity: 0; }
          50%  { transform: translate(-50%, -50%) scale(1);                        opacity: 1; }
          80%  { transform: translate(-50%, -50%) scale(1);                        opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.9);                      opacity: 0; }
        }

        .tt-kcard {
          position: absolute;
          animation: ttKCard 1800ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes ttKCard {
          0%   { transform: translate(-50%, -45vh) scale(0.6); opacity: 0; }
          55%  { transform: translate(-50%, 0) scale(1.05);    opacity: 1; }
          78%  { transform: translate(-50%, 0) scale(1);       opacity: 1; }
          100% { transform: translate(-50%, 24px) scale(0.9);  opacity: 0; }
        }

        /* ═══════════════════ HIVE ═══════════════════ */
        .tt-cross-bee {
          position: absolute;
          display: block;
          will-change: transform, opacity;
          filter: drop-shadow(0 0 12px rgba(245,158,11,0.95))
                  drop-shadow(0 0 26px rgba(245,158,11,0.55));
          animation: crossBee var(--duration) cubic-bezier(0.45, 0, 0.55, 1) forwards;
        }
        @keyframes crossBee {
          0% {
            transform: translate(0, calc(-50% + 0)) rotate(calc(var(--dir) * 22deg)) scale(0.45);
            opacity: 0;
          }
          10% { opacity: 1; }
          28% {
            transform: translate(calc(var(--dir) * 28vw), calc(-50% + var(--wobble) * -1)) rotate(calc(var(--dir) * 14deg)) scale(1.15);
            opacity: 1;
          }
          48% {
            transform: translate(calc(var(--dir) * 52vw), calc(-50% + var(--wobble))) rotate(calc(var(--dir) * -10deg)) scale(1.1);
            opacity: 1;
          }
          68% {
            transform: translate(calc(var(--dir) * 78vw), calc(-50% + var(--wobble) * -0.6)) rotate(calc(var(--dir) * 8deg)) scale(1.05);
            opacity: 1;
          }
          88% { opacity: 1; }
          100% {
            transform: translate(calc(var(--dir) * 135vw), calc(-50% + 0)) rotate(calc(var(--dir) * 32deg)) scale(0.9);
            opacity: 0;
          }
        }

        .tt-hive-trail {
          position: absolute;
          left: -10%; right: -10%; top: 5%; bottom: 5%;
          background: radial-gradient(
            ellipse at 50% 50%,
            rgba(245,158,11,0.48) 0%,
            rgba(252,211,77,0.18) 40%,
            transparent 72%
          );
          filter: blur(60px);
          opacity: 0;
          animation: hiveTrail 2400ms ease-out forwards;
        }
        @keyframes hiveTrail {
          0%   { opacity: 0; }
          25%  { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

function renderAnimation(target: UIDesign): React.ReactNode {
  switch (target) {
    case 'classic':    return <ClassicAnim />;
    case 'neumorphic': return <NeumorphicAnim />;
    case 'stacked':    return <StackedAnim />;
    case 'radial':     return <RadialAnim />;
    case 'tarot':      return <TarotAnim />;
    case 'hive':       return <HiveAnim />;
    case 'vending':    return <VendingAnim />;
    case 'detective':  return <DetectiveAnim />;
    case 'kanban':     return <KanbanAnim />;
    default:           return null;
  }
}

const ClassicAnim = () => (
  <>
    {[25, 50, 75].map((x) => (
      <div
        key={`v-${x}`}
        className="absolute top-0 bottom-0 w-[2px] tt-grid-line-v"
        style={{
          left: `${x}%`,
          background: 'linear-gradient(to bottom, transparent, #A78BFA, transparent)',
        }}
      />
    ))}
    {[25, 50, 75].map((y) => (
      <div
        key={`h-${y}`}
        className="absolute left-0 right-0 h-[2px] tt-grid-line-h"
        style={{
          top: `${y}%`,
          background: 'linear-gradient(to right, transparent, #A78BFA, transparent)',
        }}
      />
    ))}
    {[
      { c: '#E11D48', x: 24, y: 24 },
      { c: '#4F46E5', x: 76, y: 24 },
      { c: '#059669', x: 24, y: 76 },
      { c: '#64748B', x: 76, y: 76 },
    ].map((q, i) => (
      <div
        key={i}
        className="tt-puff"
        style={{
          left: `${q.x}%`,
          top: `${q.y}%`,
          width: 'clamp(60px, 14vmin, 120px)',
          height: 'clamp(60px, 14vmin, 120px)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${q.c}AA, transparent 70%)`,
          animationDelay: `${i * 100}ms`,
        }}
      />
    ))}
  </>
);

const NeumorphicAnim = () => {
  const satellites = [
    { x: 24, y: 26 },
    { x: 76, y: 26 },
    { x: 24, y: 74 },
    { x: 76, y: 74 },
  ];
  return (
    <>
      <div className="tt-neu-wash" />
      <div className="tt-neu-pill">
        <div className="tt-neu-inner-light" />
      </div>
      {satellites.map((s, i) => (
        <div
          key={i}
          className="tt-neu-satellite"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            animationDelay: `${250 + i * 90}ms`,
          }}
        />
      ))}
    </>
  );
};

const StackedAnim = () => {
  const colors = ['#E11D48', '#4F46E5', '#059669', '#64748B', '#8B5CF6', '#F59E0B'];
  return (
    <>
      {colors.map((c, i) => (
        <div
          key={i}
          className="tt-fall-card"
          style={{
            left: '50%',
            top: '50%',
            width: 'clamp(80px, 20vmin, 170px)',
            height: 'clamp(55px, 14vmin, 115px)',
            borderRadius: '18px',
            background: `linear-gradient(135deg, ${c}F0, ${c}90)`,
            boxShadow: `0 24px 60px ${c}66, inset 0 1px 0 rgba(255,255,255,0.4)`,
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </>
  );
};

const RadialAnim = () => {
  const dots = [
    { c: '#E11D48', tx: '0px',     ty: '-160px' },
    { c: '#4F46E5', tx: '160px',   ty: '0px'    },
    { c: '#059669', tx: '0px',     ty: '160px'  },
    { c: '#64748B', tx: '-160px',  ty: '0px'    },
  ];
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="tt-ring-expand"
          style={{
            width: 'min(60vmin, 380px)',
            height: 'min(60vmin, 380px)',
            border: `${3 - i}px dashed rgba(139,92,246,${0.6 - i * 0.15})`,
            borderRadius: '50%',
            animationDelay: `${i * 130}ms`,
          }}
        />
      ))}
      {dots.map((d, i) => (
        <div
          key={i}
          className="tt-dot-fly"
          style={{
            width: 'clamp(24px, 5vmin, 40px)',
            height: 'clamp(24px, 5vmin, 40px)',
            borderRadius: '50%',
            background: d.c,
            boxShadow: `0 0 24px ${d.c}AA`,
            ['--tx' as any]: d.tx,
            ['--ty' as any]: d.ty,
            ['--tx2' as any]: d.tx.replace('160', '200').replace('-160', '-200'),
            ['--ty2' as any]: d.ty.replace('160', '200').replace('-160', '-200'),
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
      <div
        className="tt-puff"
        style={{
          left: '50%',
          top: '50%',
          width: 'clamp(70px, 16vmin, 120px)',
          height: 'clamp(70px, 16vmin, 120px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #8B5CF6, #6D28D9)',
          boxShadow: '0 0 60px rgba(139,92,246,0.9)',
        }}
      />
    </>
  );
};

const TarotAnim = () => {
  const cards = [
    { tx: '-140px', ty: '-60px',  rot: '-22deg' },
    { tx: '-70px',  ty: '-90px',  rot: '-11deg' },
    { tx: '0px',    ty: '-110px', rot: '0deg'   },
    { tx: '70px',   ty: '-90px',  rot: '11deg'  },
    { tx: '140px',  ty: '-60px',  rot: '22deg'  },
  ];
  return (
    <>
      {cards.map((c, i) => (
        <div
          key={i}
          className="tt-tarot-card"
          style={{
            width: 'clamp(55px, 13vmin, 95px)',
            height: 'clamp(85px, 19vmin, 140px)',
            borderRadius: '10px',
            background: 'linear-gradient(160deg, #1E1B4B, #4C1D95)',
            border: '2px solid #A78BFA',
            boxShadow: '0 20px 50px rgba(139,92,246,0.6), inset 0 0 30px rgba(167,139,250,0.25)',
            ['--tx' as any]: c.tx,
            ['--ty' as any]: c.ty,
            ['--rot' as any]: c.rot,
            ['--tx2' as any]: c.tx.replace(/\d+/, (n) => String(parseInt(n) * 2)),
            ['--ty2' as any]: '-260px',
            ['--rot2' as any]: c.rot.replace(/\d+/, (n) => String(parseInt(n) * 3)),
            animationDelay: `${i * 80}ms`,
          }}
        >
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ color: '#C4B5FD', fontSize: 'clamp(18px, 4vmin, 28px)' }}
          >
            ✦
          </div>
        </div>
      ))}
    </>
  );
};

const HiveAnim = () => {
  const LANE_COUNT = 8;
  const PER_LANE = 2;

  const bees = Array.from({ length: LANE_COUNT * PER_LANE }).map((_, i) => {
    const fromLeft = i % 2 === 0;
    const lane = Math.floor(i / PER_LANE);
    const y = 10 + lane * (80 / (LANE_COUNT - 1));
    const delay = lane * 70 + (fromLeft ? 0 : 35);
    const duration = 1100;
    const wobble = 8 + (i % 3) * 6;
    const scale = 0.9 + (i % 4) * 0.12;
    return { fromLeft, y, delay, duration, wobble, scale };
  });

  return (
    <>
      <div className="tt-hive-trail" />
      {bees.map((b, i) => (
        <span
          key={i}
          className="tt-cross-bee"
          style={{
            left: b.fromLeft ? '-10%' : '110%',
            top: `${b.y}%`,
            fontSize: `${Math.round(32 * b.scale)}px`,
            lineHeight: 1,
            ['--dir' as any]: b.fromLeft ? 1 : -1,
            ['--duration' as any]: `${b.duration}ms`,
            ['--wobble' as any]: `${b.wobble}px`,
            animationDelay: `${b.delay}ms`,
          }}
        >
          🐝
        </span>
      ))}
    </>
  );
};

const VendingAnim = () => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <span
        key={`coin-${i}`}
        className="tt-coin"
        style={{ top: '50%', animationDelay: `${i * 140}ms` }}
      >
        🪙
      </span>
    ))}
    <div
      className="tt-box"
      style={{
        width: 'clamp(70px, 20vmin, 150px)',
        height: 'clamp(55px, 14vmin, 100px)',
        borderRadius: '14px',
        background: 'linear-gradient(140deg, #F59E0B, #DC2626)',
        boxShadow: '0 20px 50px rgba(220,38,38,0.5), inset 0 1px 0 rgba(255,255,255,0.35)',
      }}
    />
  </>
);

const DetectiveAnim = () => {
  const pins = [
    { x: 25, y: 30 },
    { x: 50, y: 20 },
    { x: 75, y: 32 },
    { x: 32, y: 72 },
    { x: 58, y: 80 },
    { x: 78, y: 68 },
  ];
  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {pins.map((p, i) => {
          const next = pins[(i + 1) % pins.length];
          return (
            <line
              key={`l-${i}`}
              x1={p.x}
              y1={p.y}
              x2={next.x}
              y2={next.y}
              stroke="#DC2626"
              strokeWidth="0.35"
              strokeLinecap="round"
              className="tt-string"
              style={{ animationDelay: `${350 + i * 100}ms` }}
            />
          );
        })}
      </svg>
      {pins.map((p, i) => (
        <span
          key={`pin-${i}`}
          className="tt-pin"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: 'clamp(18px, 4vmin, 26px)',
            height: 'clamp(18px, 4vmin, 26px)',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #F87171, #B91C1C)',
            boxShadow: '0 0 20px rgba(220,38,38,0.9)',
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </>
  );
};

const KanbanAnim = () => {
  const cols = [
    { c: '#E11D48', x: 25, from: '-50vw' },
    { c: '#4F46E5', x: 50, from: '0vw' },
    { c: '#059669', x: 75, from: '50vw' },
  ];
  return (
    <>
      {cols.map((col, i) => (
        <div
          key={`col-${i}`}
          className="tt-col-slide"
          style={{
            left: `${col.x}%`,
            top: '50%',
            width: 'clamp(60px, 18vmin, 130px)',
            height: 'min(60vh, 500px)',
            borderRadius: '16px',
            background: `linear-gradient(180deg, ${col.c}30, ${col.c}10)`,
            border: `2px dashed ${col.c}AA`,
            ['--from' as any]: col.from,
            animationDelay: `${i * 70}ms`,
          }}
        />
      ))}
      {Array.from({ length: 6 }).map((_, i) => {
        const col = cols[i % 3];
        return (
          <div
            key={`card-${i}`}
            className="tt-kcard"
            style={{
              left: `${col.x}%`,
              top: `${30 + Math.floor(i / 3) * 22}%`,
              width: 'clamp(45px, 14vmin, 100px)',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #FFFFFF, #EDE9FE)',
              boxShadow: `0 8px 20px ${col.c}55`,
              animationDelay: `${250 + i * 100}ms`,
            }}
          />
        );
      })}
    </>
  );
};