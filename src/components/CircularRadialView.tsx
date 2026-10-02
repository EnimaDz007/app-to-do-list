import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Task, QuadrantId } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SwipeableTaskItem } from './SwipeableTaskItem';

interface CircularRadialViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onQuadrantSelect?: (q: QuadrantId) => void;
}

const QUADS: {
  id: QuadrantId;
  emoji: string;
  color: string;
  angle: number;
}[] = [
  { id: 'do_first',  emoji: '🔥', color: '#E11D48', angle: -90 },
  { id: 'schedule',  emoji: '📅', color: '#4F46E5', angle: 0   },
  { id: 'delegate',  emoji: '👥', color: '#059669', angle: 90  },
  { id: 'eliminate', emoji: '🗑️', color: '#475569', angle: 180 },
];

type LocalLang = 'en' | 'fr' | 'ar';

const LOCAL_COPY: Record<LocalLang, { chip: string; orbitA: string; orbitB: string }> = {
  en: { chip: '◈ MATRIX',       orbitA: 'Your',  orbitB: 'Orbit' },
  fr: { chip: '◈ MATRICE',      orbitA: 'Votre', orbitB: 'Orbite' },
  ar: { chip: '◈ المصفوفة',     orbitA: 'مدارك', orbitB: '' },
};

/* ─────────────────────────────────────────────────────────────
   Light-mode surface palette (soft lavender / pink / sky wash)
   ───────────────────────────────────────────────────────────── */
const LIGHT_BG_GRADIENT =
  'linear-gradient(180deg, #FAF7FF 0%, #F3EEFF 45%, #FDF5FF 100%)';

export const CircularRadialView: React.FC<CircularRadialViewProps> = ({
  tasks,
  onToggleStatus,
  onDeleteTask,
  onQuadrantSelect,
}) => {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const local = LOCAL_COPY[lang] ?? LOCAL_COPY.en;

  const [openQuadrant, setOpenQuadrant] = useState<QuadrantId | null>(null);

  const isLow =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('perf-low');

  const BG = isDark ? '#0F172A' : LIGHT_BG_GRADIENT;
  const TEXT = isDark ? '#F1F5F9' : '#1E1B4B';                 // deep indigo instead of pure black
  const TEXT_MUT = isDark ? '#94A3B8' : '#6D6A8A';             // muted indigo-grey
  const RING = isDark ? 'rgba(167, 139, 250, 0.2)' : 'rgba(139, 92, 246, 0.45)';
  const RING_INNER = isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.3)';

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const tasksFor = (q: QuadrantId) => tasks.filter((t) => t.quadrant === q);
  const countFor = (q: QuadrantId) => tasksFor(q).length;

  const handleOpen = (q: QuadrantId) => {
    setOpenQuadrant(q);
    if (onQuadrantSelect) onQuadrantSelect(q);
  };

  const currentTasks = openQuadrant ? tasksFor(openQuadrant) : [];
  const currentQuad = openQuadrant ? QUADS.find((q) => q.id === openQuadrant) : null;

  const SIZE = 340;
  const CENTER = SIZE / 2;
  const ORBIT_RADIUS = 130;
  const orbitDuration = isLow ? '60s' : '40s';

  return (
    <div
      className="w-full"
      style={{
        background: BG,
        color: TEXT,
        minHeight: '100dvh',
        padding: '24px 20px 0',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
        position: 'relative',
        isolation: 'isolate',
      }}
    >
      <SparklesBackground isDark={isDark} isLow={isLow} />

      <style>{`
        @keyframes orbit-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbit-counter { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes twinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes twinkleSoft { 0%, 100% { opacity: 0.15; transform: scale(0.85); } 50% { opacity: 0.7; transform: scale(1.1); } }
        @keyframes driftSlow {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(6px, -8px); }
        }
        @keyframes blobFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(20px, -30px) scale(1.08); }
        }
        @keyframes blobFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-25px, 25px) scale(1.1); }
        }
        @keyframes centerPulse {
          0%, 100% { box-shadow: 0 10px 40px rgba(139, 92, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 10px 70px rgba(139, 92, 246, 0.95), 0 0 120px rgba(139, 92, 246, 0.6); }
        }
        @keyframes badgePop { 0%, 100% { transform: scale(1); } 10% { transform: scale(1.3); } 20% { transform: scale(1); } }
        @keyframes ringGlow { 0%, 100% { border-color: rgba(167, 139, 250, 0.25); } 50% { border-color: rgba(236, 72, 153, 0.65); } }
        @keyframes cometTrail { 0% { top: 10%; left: 10%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 80%; left: 90%; opacity: 0; } }
        @keyframes sparkleTwinkle { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.4); } }
        @keyframes lightHalo {
          0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 0.85; transform: translate(-50%, -50%) scale(1.06); }
        }
        .orbit-wrapper { animation: orbit-rotate ${orbitDuration} linear infinite; will-change: transform; }
        .orbit-counter { animation: orbit-counter ${orbitDuration} linear infinite; will-change: transform; }
        ${!isLow ? `
          .center-premium { animation: centerPulse 3s ease-in-out infinite; }
          .ring-premium   { animation: ringGlow 4s ease-in-out infinite; }
          .badge-premium  { animation: badgePop 2s ease-in-out infinite; }
        ` : ''}
        @media (prefers-reduced-motion: reduce) {
          .orbit-wrapper, .orbit-counter { animation: none; }
          .center-premium, .ring-premium, .badge-premium { animation: none; }
        }
      `}</style>

      {/* Light-mode decorative blobs — soft pastel clouds */}
      {!isDark && !isLow && (
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-15%',
              width: 320,
              height: 320,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(196,181,253,0.55) 0%, rgba(196,181,253,0) 70%)',
              filter: 'blur(40px)',
              animation: 'blobFloat1 14s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '35%',
              right: '-20%',
              width: 340,
              height: 340,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(249,168,212,0.5) 0%, rgba(249,168,212,0) 70%)',
              filter: 'blur(45px)',
              animation: 'blobFloat2 16s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-15%',
              left: '10%',
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(186,230,253,0.5) 0%, rgba(186,230,253,0) 70%)',
              filter: 'blur(40px)',
              animation: 'blobFloat1 18s ease-in-out infinite reverse',
            }}
          />
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>

      <div className="text-center mb-6">
        <div
          className="inline-block px-3 py-1 rounded-full mb-2"
          style={{
            border: `1px solid ${isDark ? '#A855F7' : '#DDD6FE'}`,
            background: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(250,245,255,0.85)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="text-[9px] font-extrabold tracking-[3px] uppercase" style={{ color: '#8B5CF6' }}>
            {local.chip}
          </span>
        </div>
        <h1 className="text-[24px] font-black tracking-tight leading-none" style={{ color: TEXT }}>
          {local.orbitA} <span style={{ color: '#8B5CF6' }}>{local.orbitB}</span>
        </h1>
      </div>

      <div className="flex justify-center items-center w-full">
        <div style={{ position: 'relative', width: SIZE, height: SIZE, maxWidth: '100%' }}>

          {/* Light-mode halo behind the rings */}
          {!isDark && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '120%',
                height: '120%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(167,139,250,0.28) 0%, rgba(196,181,253,0.14) 40%, transparent 70%)',
                filter: 'blur(24px)',
                pointerEvents: 'none',
                zIndex: 0,
                animation: isLow ? 'none' : 'lightHalo 6s ease-in-out infinite',
              }}
            />
          )}

          {!isLow && (
            <div
              style={{
                position: 'absolute',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isDark ? 'white' : '#A78BFA',
                boxShadow: isDark
                  ? '0 0 10px white, 0 0 20px #C4B5FD'
                  : '0 0 8px #C4B5FD, 0 0 16px #DDD6FE',
                animation: 'cometTrail 8s linear infinite',
                zIndex: 4,
              }}
            />
          )}

          {!isLow && (
            <>
              <div style={{ position: 'absolute', top: '20%', left: '30%', width: 4, height: 4, borderRadius: '50%', background: isDark ? '#C4B5FD' : '#A78BFA', boxShadow: isDark ? '0 0 8px #C4B5FD' : '0 0 6px #DDD6FE', animation: 'sparkleTwinkle 1.5s ease-in-out infinite', zIndex: 4 }} />
              <div style={{ position: 'absolute', top: '70%', left: '60%', width: 4, height: 4, borderRadius: '50%', background: isDark ? '#C4B5FD' : '#C4B5FD', boxShadow: isDark ? '0 0 8px #C4B5FD' : '0 0 6px #DDD6FE', animation: 'sparkleTwinkle 2s ease-in-out infinite 0.5s', zIndex: 4 }} />
              <div style={{ position: 'absolute', top: '40%', left: '80%', width: 4, height: 4, borderRadius: '50%', background: isDark ? '#C4B5FD' : '#F9A8D4', boxShadow: isDark ? '0 0 8px #C4B5FD' : '0 0 6px #FBCFE8', animation: 'sparkleTwinkle 1.8s ease-in-out infinite 1s', zIndex: 4 }} />
              <div style={{ position: 'absolute', top: '55%', left: '15%', width: 3, height: 3, borderRadius: '50%', background: isDark ? '#DDD6FE' : '#BAE6FD', boxShadow: isDark ? '0 0 6px #DDD6FE' : '0 0 6px #BFDBFE', animation: 'sparkleTwinkle 2.2s ease-in-out infinite 0.8s', zIndex: 4 }} />
            </>
          )}

          <div className={!isLow ? 'ring-premium' : ''} style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px dashed ${RING}` }} />
          <div style={{ position: 'absolute', inset: '12%', borderRadius: '50%', border: `1px dashed ${RING_INNER}` }} />
          <div style={{ position: 'absolute', inset: '24%', borderRadius: '50%', border: `1px dotted ${RING_INNER}` }} />

          <div className="orbit-wrapper" style={{ position: 'absolute', inset: 0 }}>
            {QUADS.map((q, idx) => {
              const count = countFor(q.id);
              const angleRad = (q.angle * Math.PI) / 180;
              const x = CENTER + ORBIT_RADIUS * Math.cos(angleRad);
              const y = CENTER + ORBIT_RADIUS * Math.sin(angleRad);
              const label = t(`quad_${q.id}`);

              return (
                <div
                  key={q.id}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="orbit-counter">
                    <button
                      onClick={() => handleOpen(q.id)}
                      style={{
                        width: 84,
                        height: 84,
                        borderRadius: '50%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isDark
                          ? 'linear-gradient(135deg, #1E293B, #0F172A)'
                          : 'linear-gradient(135deg, #FFFFFF, #FAF7FF)',
                        border: `3px solid ${q.color}55`,
                        boxShadow: isDark
                          ? `0 8px 24px rgba(0,0,0,0.5), 0 0 0 4px ${q.color}15`
                          : `0 14px 34px ${q.color}28, 0 0 0 4px ${q.color}12`,
                        cursor: 'pointer',
                        position: 'relative',
                        padding: 0,
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: 22, lineHeight: 1 }}>{q.emoji}</span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: q.color,
                          marginTop: 3,
                          letterSpacing: -0.2,
                          textAlign: 'center',
                          lineHeight: 1.1,
                        }}
                      >
                        {label}
                      </span>

                      <div
                        className={!isLow ? 'badge-premium' : ''}
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          minWidth: 24,
                          height: 24,
                          padding: '0 6px',
                          borderRadius: '50%',
                          background: q.color,
                          color: 'white',
                          fontSize: 11,
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isLow ? 'none' : `0 4px 12px ${q.color}88`,
                          border: isDark ? '2px solid #0F172A' : '2px solid white',
                          animationDelay: `${idx * 0.3}s`,
                        }}
                      >
                        {count}
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className={!isLow ? 'center-premium' : ''}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 116,
              height: 116,
              marginLeft: -58,
              marginTop: -58,
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDark
                ? 'linear-gradient(135deg, #312E81, #6D28D9)'
                : 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
              boxShadow: isLow
                ? 'none'
                : isDark
                  ? '0 10px 40px rgba(139, 92, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.3)'
                  : '0 20px 60px rgba(124, 58, 237, 0.4), 0 0 40px rgba(139, 92, 246, 0.2)',
              zIndex: 10,
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: 2,
                color: 'rgba(255,255,255,0.85)',
                textTransform: 'uppercase',
              }}
            >
              {t('total')}
            </span>
            <span style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, color: 'white', letterSpacing: -2 }}>
              {total}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              {pct}% {t('done_btn')}
            </span>
          </div>
        </div>
      </div>

      </div>

      <AnimatePresence>
        {openQuadrant && currentQuad && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setOpenQuadrant(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[80vh] rounded-3xl flex flex-col overflow-hidden"
              style={{
                background: isDark ? '#1E293B' : 'white',
                boxShadow: '0 30px 80px rgba(15, 23, 42, 0.4)',
              }}
            >
              <div
                className="flex items-center justify-between p-6 pb-4 shrink-0"
                style={{ borderBottom: `1px solid ${isDark ? '#334155' : '#F1F5F9'}` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                    style={{ background: isDark ? '#0F172A' : `${currentQuad.color}15` }}
                  >
                    {currentQuad.emoji}
                  </div>
                  <div>
                    <div
                      className="text-base font-black"
                      style={{ color: isDark ? '#F1F5F9' : currentQuad.color }}
                    >
                      {t(`quad_${currentQuad.id}`)}
                    </div>
                    <div className="text-xs font-semibold" style={{ color: TEXT_MUT }}>
                      {currentTasks.length} {t('tasks_count')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setOpenQuadrant(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: isDark ? '#0F172A' : '#F1F5F9', border: 'none', cursor: 'pointer' }}
                >
                  <X size={16} strokeWidth={2.5} style={{ color: currentQuad.color }} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pt-4">
                {currentTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3 opacity-30">{currentQuad.emoji}</div>
                    <p className="text-sm italic" style={{ color: TEXT_MUT }}>
                      {t('no_tasks_yet')}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {currentTasks.map((task) => (
                      <SwipeableTaskItem
                        key={task.id}
                        task={task}
                        categoryColor={currentQuad.color}
                        categoryLight={currentQuad.color}
                        categoryPale={isDark ? '#0F172A' : `${currentQuad.color}11`}
                        categoryGradient={currentQuad.color}
                        onComplete={(id) => onToggleStatus(id)}
                        onDelete={(id) => onDeleteTask && onDeleteTask(id)}
                        onTogglePin={() => {}}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div
                className="p-4 shrink-0"
                style={{ borderTop: `1px solid ${isDark ? '#334155' : '#F1F5F9'}` }}
              >
                <button
                  onClick={() => setOpenQuadrant(null)}
                  className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                  style={{ background: currentQuad.color, border: 'none', cursor: 'pointer' }}
                >
                  {t('done_btn')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SparklesBackground — handles both dark and light themes.
   ───────────────────────────────────────────────────────────── */

const LightPalette = ['#C4B5FD', '#DDD6FE', '#F9A8D4', '#FBCFE8', '#BAE6FD', '#BFDBFE'];

const SparklesBackground: React.FC<{ isDark: boolean; isLow: boolean }> = ({ isDark, isLow }) => {
  const starCount  = isLow ? (isDark ? 10 : 14) : (isDark ? 60 : 70);
  const sparkCount = isLow ? 0 : 6;

  const stars = useMemo(() => {
    return Array.from({ length: starCount }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: isDark
        ? Math.random() * 2 + 0.8
        : Math.random() * 2.4 + 1.2,
      delay: Math.random() * 4,
      duration: Math.random() * 2.5 + 1.5,
      baseOpacity: isDark
        ? Math.random() * 0.5 + 0.4
        : Math.random() * 0.3 + 0.4,
      color: isDark ? '#FFFFFF' : LightPalette[i % LightPalette.length],
    }));
    // eslint-disable-next-line
  }, [starCount, isDark]);

  const sparkles = useMemo(() => {
    return Array.from({ length: sparkCount }, (_, i) => ({
      id: i,
      top: Math.random() * 90 + 5,
      left: Math.random() * 90 + 5,
      size: Math.random() * 8 + 8,
      delay: Math.random() * 3,
      duration: Math.random() * 2 + 2,
      color: ['#A78BFA', '#F9A8D4', '#BAE6FD'][i % 3],
    }));
    // eslint-disable-next-line
  }, [sparkCount]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {stars.map((star) => (
        <div
          key={star.id}
          style={{
            position: 'absolute',
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            background: star.color,
            opacity: star.baseOpacity,
            animation: isDark
              ? `twinkle ${star.duration}s ease-in-out infinite`
              : `twinkleSoft ${star.duration}s ease-in-out infinite, driftSlow ${star.duration + 3}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {sparkles.map((s) => (
        <div
          key={`sp-${s.id}`}
          style={{
            position: 'absolute',
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            color: s.color,
            fontSize: s.size,
            lineHeight: 1,
            animation: `twinkleSoft ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
            opacity: 0.7,
          }}
        >
          ✦
        </div>
      ))}
    </div>
  );
};