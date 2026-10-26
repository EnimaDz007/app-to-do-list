import React from 'react';
import { UIDesign } from '../hooks/useUIDesign';

interface ThemeTransitionOverlayProps {
  target: UIDesign | null;
}

const TOTAL_MS: Record<UIDesign, number> = {
  binder:     2200,
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
      {/* Blur layer */}
      <div
        className="absolute inset-0 tt-blur-layer"
        style={{
          animationDuration: `${total}ms`,
          WebkitBackdropFilter: 'blur(0px)',
          backdropFilter: 'blur(0px)',
        }}
      />

      {/* Violet vignette */}
      <div
        className="absolute inset-0 tt-vignette"
        style={{ animationDuration: `${total}ms` }}
      />

      {/* Rune sweep */}
      <div
        className="absolute -inset-y-1/3 left-[-60%] w-[220%] tt-rune-sweep"
        style={{
          animationDuration: `${total}ms`,
          background:
            'linear-gradient(100deg, transparent 0%, rgba(167,139,250,0) 30%, rgba(236,72,153,0.55) 50%, rgba(167,139,250,0) 70%, transparent 100%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Per-theme animation */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full">
          {renderAnimation(target)}
        </div>
      </div>

      <style>{`
        .tt-blur-layer { animation-name: ttBlurRamp; animation-timing-function: ease-in-out; animation-fill-mode: forwards; }
        @keyframes ttBlurRamp {
          0%   { backdrop-filter: blur(0px);  -webkit-backdrop-filter: blur(0px); }
          18%  { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
          72%  { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
          100% { backdrop-filter: blur(0px);  -webkit-backdrop-filter: blur(0px); }
        }

        .tt-vignette {
          animation-name: ttVignetteRamp; animation-timing-function: ease-in-out; animation-fill-mode: forwards;
          background: radial-gradient(circle at 50% 50%, rgba(139,92,246,0.18) 0%, rgba(15,23,42,0.42) 65%, rgba(15,23,42,0.62) 100%);
        }
        @keyframes ttVignetteRamp { 0% { opacity: 0; } 18% { opacity: 1; } 72% { opacity: 1; } 100% { opacity: 0; } }

        .tt-rune-sweep { animation-name: ttRuneSweep; animation-timing-function: cubic-bezier(0.15,0.6,0.4,1); animation-fill-mode: forwards; }
        @keyframes ttRuneSweep {
          0%   { transform: translateX(0) skewX(-14deg); opacity: 0; }
          25%  { opacity: 1; }
          65%  { opacity: 1; }
          100% { transform: translateX(140%) skewX(-14deg); opacity: 0; }
        }

        /* ═══════════════════ BINDER — BOOK OPEN ═══════════════════ */
        .bt-root { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .bt-veil { position: absolute; inset: 0; background: radial-gradient(ellipse 62% 52% at 50% 46%, rgba(120,58,14,0.42) 0%, rgba(24,8,3,0.72) 58%, rgba(0,0,0,0.86) 100%); animation: btVeil 2200ms ease-out forwards; }
        @keyframes btVeil { 0% { opacity: 0; } 12% { opacity: 1; } 84% { opacity: 1; } 100% { opacity: 0; } }

        .bt-halo { position: absolute; top: 50%; left: 50%; width: 62vmin; height: 62vmin; border-radius: 50%; background: radial-gradient(circle, rgba(255,225,150,0.85) 0%, rgba(224,166,74,0.35) 32%, transparent 68%); filter: blur(8px); opacity: 0; animation: btHalo 2200ms cubic-bezier(0.3,0.6,0.3,1) forwards; }
        @keyframes btHalo {
          0%   { opacity: 0;   transform: translate(-50%,-50%) scale(0.35); }
          26%  { opacity: 0.45;transform: translate(-50%,-50%) scale(0.6); }
          56%  { opacity: 0.95;transform: translate(-50%,-50%) scale(1); }
          100% { opacity: 0;   transform: translate(-50%,-50%) scale(1.5); }
        }

        .bt-book { position: absolute; top: 50%; left: 50%; width: min(46vmin, 280px); aspect-ratio: 5 / 6.6; perspective: 1500px; perspective-origin: 0% 50%; transform-style: preserve-3d; animation: btBookIn 2200ms cubic-bezier(0.35,0.05,0.25,1) forwards; }
        @keyframes btBookIn {
          0%   { opacity: 0; transform: translate(-50%,-44%) scale(0.8) rotateX(20deg) rotateZ(-5deg); }
          20%  { opacity: 1; transform: translate(-50%,-47%) scale(0.92) rotateX(9deg) rotateZ(-2deg); }
          38%  { opacity: 1; transform: translate(-50%,-50%) scale(1.03) rotateX(0deg) rotateZ(0deg); }
          48%  { opacity: 1; transform: translate(-50%,-50%) scale(1) rotateX(0deg) rotateZ(0deg); }
          86%  { opacity: 1; transform: translate(-50%,-50%) scale(1) rotateZ(0deg); }
          100% { opacity: 0; transform: translate(-50%,-53%) scale(1.08) rotateZ(0deg); }
        }

        .bt-leaf { position: absolute; inset: 0; border-radius: 3px 9px 9px 3px; overflow: hidden; background: radial-gradient(ellipse 70% 46% at 24% 12%, #fffdf4 0%, #faf3e2 42%, #efe6d2 100%); box-shadow: inset 0 0 0 1px rgba(170,152,112,0.5), inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 26px rgba(0,0,0,0.55); }
        .bt-leaf-rules { position: absolute; inset: 0; background-position: 0 30px; background-image: repeating-linear-gradient(0deg, transparent 0 15px, rgba(120,140,180,0.16) 15px 16px); }
        .bt-leaf-gutter { position: absolute; top: 0; bottom: 0; left: 0; width: 34px; background: linear-gradient(90deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.06) 42%, transparent 100%); }
        .bt-leaf-body { position: absolute; inset: 0; padding-left: 34px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; }

        .bt-seal { width: 42%; opacity: 0; animation: btSeal 780ms cubic-bezier(0.34,1.5,0.64,1) 1180ms forwards; }
        @keyframes btSeal { 0% { opacity: 0; transform: scale(0.55) rotate(-24deg); } 65% { opacity: 1; transform: scale(1.08) rotate(3deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }

        .bt-name { font-family: 'Cinzel', Georgia, serif; font-weight: 600; text-transform: uppercase; font-size: min(5.4vmin, 30px); background: linear-gradient(180deg, #fff6d6 0%, #f0d8a4 26%, #c8a25c 56%, #806633 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.45)); opacity: 0; animation: btName 850ms cubic-bezier(0.34,1.35,0.64,1) 1270ms forwards; }
        @keyframes btName { 0% { opacity: 0; letter-spacing: 16px; filter: blur(5px); } 70% { opacity: 1; letter-spacing: 6px; filter: blur(0); } 100% { opacity: 1; letter-spacing: 5px; filter: blur(0); } }

        .bt-tag { font-family: 'JetBrains Mono', monospace; font-size: min(1.5vmin, 9px); letter-spacing: 3px; text-transform: uppercase; color: rgba(122,92,48,0.8); opacity: 0; animation: btFade 600ms ease-out 1520ms forwards; }
        .bt-rule { width: 46%; height: 1px; opacity: 0; background: linear-gradient(90deg, transparent, rgba(200,162,92,0.9), transparent); animation: btFade 680ms ease-out 1440ms forwards; }
        @keyframes btFade { to { opacity: 1; } }

        .bt-cover { position: absolute; inset: 0; transform-origin: left center; transform-style: preserve-3d; transform: rotateY(0deg); animation: btCover 2200ms cubic-bezier(0.5,0.05,0.28,1) forwards; }
        @keyframes btCover { 0%, 40% { transform: rotateY(0deg); } 50% { transform: rotateY(-16deg); } 55% { transform: rotateY(-7deg); } 76% { transform: rotateY(-166deg); } 100% { transform: rotateY(-172deg); } }

        .bt-face { position: absolute; inset: 0; border-radius: 3px 9px 9px 3px; overflow: hidden; backface-visibility: hidden; -webkit-backface-visibility: hidden; background: linear-gradient(152deg, #b6404a 0%, #8e1d29 22%, #661320 52%, #3c0810 82%, #230409 100%); box-shadow: inset 0 3px 10px rgba(255,205,205,0.26), inset 0 -14px 34px rgba(0,0,0,0.7), inset 0 0 110px rgba(0,0,0,0.5), 0 26px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,0,0,0.9); }
        .bt-grain { position: absolute; inset: 0; mix-blend-mode: multiply; opacity: 0.8; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence baseFrequency='.68' numOctaves='3' seed='11'/%3E%3CfeColorMatrix values='0 0 0 0 .12 0 0 0 0 .01 0 0 0 0 .02 0 0 0 .8 0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)'/%3E%3C/svg%3E"); }
        .bt-shine { position: absolute; inset: 0; background: radial-gradient(ellipse 60% 46% at 32% 16%, rgba(255,198,198,0.28), transparent 66%); }
        .bt-spine { position: absolute; top: 0; bottom: 0; left: 0; width: 42px; background: linear-gradient(90deg, #060000 0%, rgba(0,0,0,0.72) 34%, rgba(0,0,0,0.14) 72%, transparent 100%); }
        .bt-stitch { position: absolute; top: 26px; bottom: 26px; left: 17px; width: 2px; background-image: repeating-linear-gradient(0deg, rgba(214,178,94,0.8) 0 7px, transparent 7px 14px); filter: drop-shadow(0 0 3px rgba(214,178,94,0.6)); }
        .bt-trim { position: absolute; inset: 11px; border: 1.6px solid rgba(214,178,94,0.62); border-radius: 5px 8px 8px 5px; box-shadow: inset 0 0 34px rgba(214,178,94,0.09); }
        .bt-trim2 { position: absolute; inset: 16px; border: 0.5px solid rgba(214,178,94,0.3); border-radius: 4px 7px 7px 4px; }
        .bt-corner { position: absolute; width: 22px; height: 22px; color: rgba(214,178,94,0.72); }
        .bt-emblem { position: absolute; top: 50%; left: 50%; width: 44%; transform: translate(-50%,-62%); opacity: 0.92; }
        .bt-lining { position: absolute; inset: 0; border-radius: 3px 9px 9px 3px; background: linear-gradient(152deg, #33161b 0%, #200a0c 58%, #0d0203 100%); transform: rotateY(180deg); backface-visibility: hidden; -webkit-backface-visibility: hidden; box-shadow: inset 0 0 54px rgba(0,0,0,0.9), inset 0 0 0 2px rgba(214,178,94,0.42); }

        .bt-flash { position: absolute; top: 50%; left: 50%; width: 20vmin; height: 20vmin; border-radius: 50%; background: radial-gradient(circle, rgba(255,246,214,0.95) 0%, rgba(240,190,100,0.4) 42%, transparent 72%); opacity: 0; animation: btFlash 2200ms cubic-bezier(0.2,0.7,0.3,1) forwards; }
        @keyframes btFlash { 0%, 44% { opacity: 0; transform: translate(-50%,-50%) scale(0.2); } 56% { opacity: 1; transform: translate(-50%,-50%) scale(1.4); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(8); } }

        .bt-spark { position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%; background: radial-gradient(circle, #fffbe0 0%, #f2d79a 42%, rgba(220,180,100,0.35) 72%, transparent 100%); box-shadow: 0 0 10px #e8cb8e, 0 0 22px rgba(232,203,142,0.65); opacity: 0; animation: btSpark 1200ms cubic-bezier(0.14,0.62,0.4,1) forwards; }
        @keyframes btSpark { 0% { opacity: 0; transform: translate(0,0) scale(0.25); } 18% { opacity: 1; transform: translate(calc(var(--x) * 0.14), calc(var(--y) * 0.14)) scale(1.25); } 100% { opacity: 0; transform: translate(var(--x), var(--y)) scale(0.35); } }

        .bt-mote { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: radial-gradient(circle, #fffbe0 0%, rgba(226,190,116,0.5) 62%, transparent 100%); box-shadow: 0 0 8px rgba(232,203,142,0.9); opacity: 0; animation: btMote 1450ms ease-out forwards; }
        @keyframes btMote { 0% { opacity: 0; transform: translateY(0) scale(0.55); } 28% { opacity: 0.9; transform: translateY(-3vmin) scale(0.9); } 100% { opacity: 0; transform: translateY(-20vmin) scale(0.25); } }

        /* ═══════════════════ CLASSIC ═══════════════════ */
        .tt-grid-line-v { animation: ttGridV 1800ms ease-out forwards; transform-origin: center; }
        @keyframes ttGridV { 0% { transform: scaleY(0); opacity: 0; } 30% { transform: scaleY(1); opacity: 1; } 70% { transform: scaleY(1); opacity: 1; } 100% { transform: scaleY(1); opacity: 0; } }
        .tt-grid-line-h { animation: ttGridH 1800ms ease-out forwards; transform-origin: center; }
        @keyframes ttGridH { 0% { transform: scaleX(0); opacity: 0; } 30% { transform: scaleX(1); opacity: 1; } 70% { transform: scaleX(1); opacity: 1; } 100% { transform: scaleX(1); opacity: 0; } }

        /* ═══════════════════ NEUMORPHIC ═══════════════════ */
        .tt-neu-wash { position: absolute; inset: 0; background: radial-gradient(circle at 30% 30%, rgba(245,243,255,0.85) 0%, rgba(224,231,255,0.65) 40%, rgba(199,210,254,0.5) 100%); opacity: 0; animation: neuWash 2200ms ease-in-out forwards; }
        @keyframes neuWash { 0% { opacity: 0; } 30% { opacity: 0.9; } 70% { opacity: 0.9; } 100% { opacity: 0; } }

        .tt-neu-pill { position: absolute; left: 50%; top: 50%; width: min(62vmin, 420px); height: min(62vmin, 420px); border-radius: 26vmin; background: linear-gradient(135deg, #FFFFFF 0%, #EDE9FE 55%, #DDD6FE 100%); transform: translate(-50%,-50%) scale(0.15); opacity: 0; animation: neuPill 2200ms cubic-bezier(0.34,1.56,0.64,1) forwards; will-change: transform, box-shadow, opacity; overflow: hidden; }
        @keyframes neuPill {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.15); box-shadow: inset -60px -60px 120px rgba(139,92,246,0.5), inset 60px 60px 120px rgba(255,255,255,0.95); }
          28%  { opacity: 1; transform: translate(-50%,-50%) scale(1.05); box-shadow: inset -20px -20px 60px rgba(139,92,246,0.22), inset 20px 20px 60px rgba(255,255,255,0.98), 26px 26px 70px rgba(139,92,246,0.38), -26px -26px 70px rgba(255,255,255,0.95); }
          48%  { opacity: 1; transform: translate(-50%,-50%) scale(1); box-shadow: inset -22px -22px 62px rgba(139,92,246,0.28), inset 22px 22px 62px rgba(255,255,255,0.98), 26px 26px 70px rgba(139,92,246,0.38), -26px -26px 70px rgba(255,255,255,0.95); }
          72%  { opacity: 1; transform: translate(-50%,-50%) scale(0.92); box-shadow: inset 55px 55px 130px rgba(139,92,246,0.55), inset -55px -55px 130px rgba(255,255,255,0.95); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(0.35); box-shadow: inset 90px 90px 180px rgba(139,92,246,0.55), inset -90px -90px 180px rgba(255,255,255,0.95); }
        }

        .tt-neu-inner-light { position: absolute; inset: 0; border-radius: inherit; animation: neuInnerLight 2200ms ease-in-out forwards; }
        @keyframes neuInnerLight {
          0%   { background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95) 0%, transparent 55%); }
          55%  { background: radial-gradient(circle at 70% 70%, rgba(196,181,253,0.75) 0%, transparent 55%); }
          100% { background: radial-gradient(circle at 70% 70%, rgba(255,255,255,0.9) 0%, transparent 55%); }
        }

        .tt-neu-satellite { position: absolute; width: clamp(48px, 8vmin, 72px); height: clamp(48px, 8vmin, 72px); border-radius: 20px; background: linear-gradient(135deg, #FFFFFF 0%, #EDE9FE 100%); transform: translate(-50%,-50%) scale(0); opacity: 0; animation: neuSatellite 2000ms cubic-bezier(0.34,1.56,0.64,1) forwards; will-change: transform, box-shadow, opacity; }
        @keyframes neuSatellite {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
          28%  { transform: translate(-50%,-50%) scale(1.15); opacity: 1; box-shadow: 8px 8px 20px rgba(139,92,246,0.35), -8px -8px 20px rgba(255,255,255,0.9); }
          45%  { transform: translate(-50%,-50%) scale(1); opacity: 1; box-shadow: 8px 8px 20px rgba(139,92,246,0.35), -8px -8px 20px rgba(255,255,255,0.9); }
          72%  { transform: translate(-50%,-50%) scale(0.95); opacity: 1; box-shadow: inset 12px 12px 26px rgba(139,92,246,0.5), inset -12px -12px 26px rgba(255,255,255,0.95); }
          100% { transform: translate(-50%,-50%) scale(0.5); opacity: 0; box-shadow: inset 20px 20px 40px rgba(139,92,246,0.5), inset -20px -20px 40px rgba(255,255,255,0.95); }
        }

        /* ═══════════════════ SHARED PUFF ═══════════════════ */
        .tt-puff { position: absolute; animation: ttPuff 1800ms cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes ttPuff {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
          30%  { transform: translate(-50%,-50%) scale(1.2); opacity: 0.9; }
          60%  { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(2.6); opacity: 0; }
        }

        /* ═══════════════════ STACKED ═══════════════════ */
        .tt-fall-card { position: absolute; animation: ttFallCard 1800ms cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes ttFallCard {
          0%   { transform: translate(-50%,-110vh) rotate(-8deg); opacity: 0; }
          50%  { transform: translate(-50%,0) rotate(0deg); opacity: 1; }
          78%  { transform: translate(-50%,0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%,20vh) rotate(8deg); opacity: 0; }
        }

        /* ═══════════════════ RADIAL ═══════════════════ */
        .tt-ring-expand { position: absolute; left: 50%; top: 50%; animation: ttRingExpand 1800ms cubic-bezier(0.2,0.8,0.4,1) forwards; }
        @keyframes ttRingExpand {
          0%   { transform: translate(-50%,-50%) scale(0.15); opacity: 0; }
          45%  { transform: translate(-50%,-50%) scale(1); opacity: 0.9; }
          80%  { transform: translate(-50%,-50%) scale(2); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
        }
        .tt-dot-fly { position: absolute; left: 50%; top: 50%; animation: ttDotFly 1800ms cubic-bezier(0.2,0.8,0.4,1) forwards; }
        @keyframes ttDotFly {
          0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 0; }
          25%  { opacity: 1; }
          60%  { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.2); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx2)), calc(-50% + var(--ty2))) scale(0.6); opacity: 0; }
        }

        /* ═══════════════════ TAROT ═══════════════════ */
        .tt-tarot-card { position: absolute; left: 50%; top: 50%; animation: ttTarotCard 1900ms cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes ttTarotCard {
          0%   { transform: translate(-50%, calc(-50% + 40vh)) rotate(0deg) scale(0.3); opacity: 0; }
          35%  { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--rot)) scale(1); opacity: 1; }
          72%  { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--rot)) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx2)), calc(-50% + var(--ty2))) rotate(var(--rot2)) scale(0.6); opacity: 0; }
        }

        /* ═══════════════════ VENDING ═══════════════════ */
        .tt-coin { position: absolute; left: 50%; font-size: clamp(22px, 5vmin, 32px); animation: ttCoin 1900ms cubic-bezier(0.6,0,0.4,1) forwards; }
        @keyframes ttCoin {
          0%   { transform: translate(-50%,-80vh) rotate(0deg); opacity: 0; }
          15%  { opacity: 1; }
          55%  { transform: translate(-50%,0) rotate(360deg); opacity: 1; }
          75%  { transform: translate(-50%,0) rotate(360deg) scale(1); opacity: 1; }
          100% { transform: translate(-50%,30px) rotate(400deg) scale(0.6); opacity: 0; }
        }
        .tt-box { position: absolute; left: 50%; top: 50%; animation: ttBoxSlide 1900ms cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes ttBoxSlide {
          0%   { transform: translate(-50%,-50%) scale(0.8); opacity: 0; }
          50%  { transform: translate(-50%,-50%) scale(0.8); opacity: 0; }
          68%  { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          85%  { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, calc(-50% + 45vh)) scale(0.85); opacity: 0; }
        }

        /* ═══════════════════ DETECTIVE ═══════════════════ */
        .tt-pin { position: absolute; animation: ttPin 1800ms ease-out forwards; }
        @keyframes ttPin {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
          30%  { transform: translate(-50%,-50%) scale(1.25); opacity: 1; }
          60%  { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
        }
        .tt-string { stroke-dasharray: 200; stroke-dashoffset: 200; animation: ttString 1800ms ease-out forwards; }
        @keyframes ttString {
          0%, 25% { stroke-dashoffset: 200; opacity: 0; }
          30%     { opacity: 1; }
          65%     { stroke-dashoffset: 0; opacity: 1; }
          100%    { stroke-dashoffset: 0; opacity: 0; }
        }

        /* ═══════════════════ KANBAN ═══════════════════ */
        .tt-col-slide { position: absolute; animation: ttColSlide 1800ms cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes ttColSlide {
          0%   { transform: translate(calc(-50% + var(--from)), -50%) scale(0.7); opacity: 0; }
          50%  { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          80%  { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(0.9); opacity: 0; }
        }
        .tt-kcard { position: absolute; animation: ttKCard 1800ms cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes ttKCard {
          0%   { transform: translate(-50%,-45vh) scale(0.6); opacity: 0; }
          55%  { transform: translate(-50%,0) scale(1.05); opacity: 1; }
          78%  { transform: translate(-50%,0) scale(1); opacity: 1; }
          100% { transform: translate(-50%,24px) scale(0.9); opacity: 0; }
        }

        /* ═══════════════════ HIVE ═══════════════════ */
        .tt-cross-bee { position: absolute; display: block; will-change: transform, opacity; filter: drop-shadow(0 0 12px rgba(245,158,11,0.95)) drop-shadow(0 0 26px rgba(245,158,11,0.55)); animation: crossBee var(--duration) cubic-bezier(0.45,0,0.55,1) forwards; }
        @keyframes crossBee {
          0%   { transform: translate(0, calc(-50% + 0)) rotate(calc(var(--dir) * 22deg)) scale(0.45); opacity: 0; }
          10%  { opacity: 1; }
          28%  { transform: translate(calc(var(--dir) * 28vw), calc(-50% + var(--wobble) * -1)) rotate(calc(var(--dir) * 14deg)) scale(1.15); opacity: 1; }
          48%  { transform: translate(calc(var(--dir) * 52vw), calc(-50% + var(--wobble))) rotate(calc(var(--dir) * -10deg)) scale(1.1); opacity: 1; }
          68%  { transform: translate(calc(var(--dir) * 78vw), calc(-50% + var(--wobble) * -0.6)) rotate(calc(var(--dir) * 8deg)) scale(1.05); opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translate(calc(var(--dir) * 135vw), calc(-50% + 0)) rotate(calc(var(--dir) * 32deg)) scale(0.9); opacity: 0; }
        }
        .tt-hive-trail { position: absolute; left: -10%; right: -10%; top: 5%; bottom: 5%; background: radial-gradient(ellipse at 50% 50%, rgba(245,158,11,0.48) 0%, rgba(252,211,77,0.18) 40%, transparent 72%); filter: blur(60px); opacity: 0; animation: hiveTrail 2400ms ease-out forwards; }
        @keyframes hiveTrail { 0% { opacity: 0; } 25% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }
      `}</style>
    </div>
  );
};

function renderAnimation(target: UIDesign): React.ReactNode {
  switch (target) {
    case 'binder':     return <BinderAnim />;
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

/* ═══════════════════ BINDER — BOOK OPEN ═══════════════════ */
const BinderAnim = () => (
  <div className="bt-root">
    <div className="bt-veil" />
    <div className="bt-halo" />

    <div className="bt-book">
      {/* Inside page */}
      <div className="bt-leaf">
        <div className="bt-leaf-rules" />
        <div className="bt-leaf-gutter" />
        <div className="bt-leaf-body">
          <svg className="bt-seal" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="btGoldA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff3cf" />
                <stop offset="45%" stopColor="#c8a25c" />
                <stop offset="100%" stopColor="#7d6330" />
              </linearGradient>
            </defs>
            <circle cx="65" cy="65" r="50" fill="none" stroke="url(#btGoldA)" strokeWidth="1.7" />
            <circle cx="65" cy="65" r="43" fill="none" stroke="url(#btGoldA)" strokeWidth="0.6" opacity="0.6" />
            <circle cx="65" cy="65" r="35" fill="none" stroke="url(#btGoldA)" strokeWidth="0.4" opacity="0.4" />
            {Array.from({ length: 28 }).map((_, i) => {
              const a = (i / 28) * Math.PI * 2;
              const major = i % 7 === 0;
              const r1 = major ? 43 : 45;
              return (
                <line
                  key={i}
                  x1={65 + Math.cos(a) * r1} y1={65 + Math.sin(a) * r1}
                  x2={65 + Math.cos(a) * 50} y2={65 + Math.sin(a) * 50}
                  stroke="url(#btGoldA)" strokeWidth={major ? 1.1 : 0.45}
                  opacity={major ? 0.9 : 0.5}
                />
              );
            })}
            <path d="M 48 67 L 60 79 L 84 52" fill="none" stroke="url(#btGoldA)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="bt-name">MerakiList</div>
          <div className="bt-tag">Task Priority · Est. 2026</div>
          <div className="bt-rule" />
        </div>
      </div>

      {/* Front cover — swings open around its LEFT edge */}
      <div className="bt-cover">
        <div className="bt-face">
          <div className="bt-grain" />
          <div className="bt-shine" />
          <div className="bt-spine" />
          <div className="bt-stitch" />
          <div className="bt-trim" />
          <div className="bt-trim2" />
          {[
            { top: 15, left: 15, t: 'none' },
            { top: 15, right: 15, t: 'scaleX(-1)' },
            { bottom: 15, left: 15, t: 'scaleY(-1)' },
            { bottom: 15, right: 15, t: 'scale(-1, -1)' },
          ].map((c, i) => (
            <svg
              key={i}
              className="bt-corner"
              viewBox="0 0 40 40"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                transform: c.t,
                ...(c.top !== undefined ? { top: c.top } : { bottom: c.bottom }),
                ...(c.left !== undefined ? { left: c.left } : { right: c.right }),
              } as React.CSSProperties}
            >
              <path d="M3 3 L20 3 M3 3 L3 20" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <circle cx="20" cy="3" r="1.7" fill="currentColor" />
              <circle cx="3" cy="20" r="1.7" fill="currentColor" />
              <path d="M9 9 L15 9 M9 9 L9 15" stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.55" />
            </svg>
          ))}
          <div className="bt-emblem">
            <svg viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="btGoldB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff3cf" />
                  <stop offset="45%" stopColor="#c8a25c" />
                  <stop offset="100%" stopColor="#7d6330" />
                </linearGradient>
              </defs>
              <circle cx="65" cy="65" r="46" fill="none" stroke="url(#btGoldB)" strokeWidth="2" opacity="0.95" />
              <circle cx="65" cy="65" r="38" fill="none" stroke="url(#btGoldB)" strokeWidth="0.8" opacity="0.65" />
              <path d="M 48 67 L 60 79 L 84 52" fill="none" stroke="url(#btGoldB)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="bt-lining" />
      </div>
    </div>

    {/* Light burst when the cover opens */}
    <div className="bt-flash" />

    {/* Gold sparks */}
    {Array.from({ length: 22 }).map((_, i) => {
      const a = (i / 22) * Math.PI * 2 + (i % 3) * 0.3;
      const d = 130 + (i % 5) * 62;
      return (
        <span
          key={`s${i}`}
          className="bt-spark"
          style={{
            ['--x' as any]: `${Math.cos(a) * d}px`,
            ['--y' as any]: `${Math.sin(a) * d}px`,
            animationDelay: `${1040 + (i % 7) * 46}ms`,
          }}
        />
      );
    })}

    {/* Rising motes */}
    {Array.from({ length: 14 }).map((_, i) => (
      <span
        key={`m${i}`}
        className="bt-mote"
        style={{
          left: `${34 + (i * 37) % 32}%`,
          top: `${58 + (i * 23) % 18}%`,
          animationDelay: `${760 + i * 68}ms`,
        }}
      />
    ))}
  </div>
);

/* ═══════════════════ CLASSIC ═══════════════════ */
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

/* ═══════════════════ NEUMORPHIC ═══════════════════ */
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

/* ═══════════════════ STACKED ═══════════════════ */
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

/* ═══════════════════ RADIAL ═══════════════════ */
const RadialAnim = () => {
  const dots = [
    { c: '#E11D48', tx: '0px',    ty: '-160px' },
    { c: '#4F46E5', tx: '160px',  ty: '0px'    },
    { c: '#059669', tx: '0px',    ty: '160px'  },
    { c: '#64748B', tx: '-160px', ty: '0px'    },
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

/* ═══════════════════ TAROT ═══════════════════ */
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

/* ═══════════════════ HIVE ═══════════════════ */
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

/* ═══════════════════ VENDING ═══════════════════ */
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

/* ═══════════════════ DETECTIVE ═══════════════════ */
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

/* ═══════════════════ KANBAN ═══════════════════ */
const KanbanAnim = () => {
  const cols = [
    { c: '#E11D48', x: 25, from: '-50vw' },
    { c: '#4F46E5', x: 50, from: '0vw'   },
    { c: '#059669', x: 75, from: '50vw'  },
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