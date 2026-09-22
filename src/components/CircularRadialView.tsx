import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Task, QuadrantId } from '../types';
import { useTheme } from '../context/ThemeContext';
import { SwipeableTaskItem } from './SwipeableTaskItem';

interface CircularRadialViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onQuadrantSelect?: (q: QuadrantId) => void;
}

const QUADS: {
  id: QuadrantId;
  name: string;
  emoji: string;
  color: string;
  angle: number;
}[] = [
  { id: 'do_first',  name: 'Do First',  emoji: '🔥', color: '#E11D48', angle: -90 },
  { id: 'schedule',  name: 'Schedule',  emoji: '📅', color: '#4F46E5', angle: 0   },
  { id: 'delegate',  name: 'Delegate',  emoji: '👥', color: '#059669', angle: 90  },
  { id: 'eliminate', name: 'Eliminate', emoji: '🗑️', color: '#475569', angle: 180 },
];

export const CircularRadialView: React.FC<CircularRadialViewProps> = ({
  tasks,
  onToggleStatus,
  onDeleteTask,
  onQuadrantSelect,
}) => {
  const { isDark } = useTheme();
  const [openQuadrant, setOpenQuadrant] = useState<QuadrantId | null>(null);

  // ✅ Detect device tier
  const isLow =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('perf-low');

  const BG = isDark ? '#0F172A' : '#FFFFFF';
  const TEXT = isDark ? '#F1F5F9' : '#0F172A';
  const TEXT_MUT = isDark ? '#94A3B8' : '#64748B';
  const RING = isDark ? 'rgba(167, 139, 250, 0.2)' : 'rgba(167, 139, 250, 0.4)';
  const RING_INNER = isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.25)';

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

  // Low-tier: slower orbit (60s), mid/high: faster (40s)
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
      {isDark && <StarsBackground isLow={isLow} />}

      {/* ============ CSS KEYFRAMES (GPU-accelerated) ============ */}
      <style>{`
        @keyframes orbit-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes orbit-counter {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 1; }
        }
        @keyframes centerPulse {
          0%, 100% {
            box-shadow:
              0 10px 40px rgba(139, 92, 246, 0.5),
              0 0 60px rgba(139, 92, 246, 0.3);
          }
          50% {
            box-shadow:
              0 10px 70px rgba(139, 92, 246, 0.95),
              0 0 120px rgba(139, 92, 246, 0.6);
          }
        }
        @keyframes badgePop {
          0%, 100% { transform: scale(1); }
          10%      { transform: scale(1.3); }
          20%      { transform: scale(1); }
        }
        @keyframes ringGlow {
          0%, 100% { border-color: rgba(167, 139, 250, 0.25); }
          50%      { border-color: rgba(236, 72, 153, 0.65); }
        }
        @keyframes cometTrail {
          0%   { top: 10%; left: 10%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 80%; left: 90%; opacity: 0; }
        }
        @keyframes sparkleTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%      { opacity: 1; transform: scale(1.4); }
        }

        .orbit-wrapper {
          animation: orbit-rotate ${orbitDuration} linear infinite;
          will-change: transform;
        }
        .orbit-counter {
          animation: orbit-counter ${orbitDuration} linear infinite;
          will-change: transform;
        }

        /* ✅ PREMIUM EFFECTS — mid/high only */
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

      {/* Header */}
      <div className="text-center mb-6">
        <div
          className="inline-block px-3 py-1 rounded-full mb-2"
          style={{
            border: `1px solid ${isDark ? '#A855F7' : '#DDD6FE'}`,
            background: isDark ? 'rgba(168, 85, 247, 0.15)' : '#FAF5FF',
          }}
        >
          <span className="text-[9px] font-extrabold tracking-[3px] uppercase" style={{ color: '#A855F7' }}>
            ◈ MATRIX
          </span>
        </div>
        <h1 className="text-[24px] font-black tracking-tight leading-none" style={{ color: TEXT }}>
          Your <span style={{ color: '#8B5CF6' }}>Orbit</span>
        </h1>
      </div>

      {/* Solar System Container */}
      <div className="flex justify-center items-center w-full">
        <div style={{ position: 'relative', width: SIZE, height: SIZE, maxWidth: '100%' }}>

          {/* ✅ Comet (mid/high only) */}
          {!isLow && (
            <div
              style={{
                position: 'absolute',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'white',
                boxShadow: '0 0 10px white, 0 0 20px #C4B5FD',
                animation: 'cometTrail 8s linear infinite',
                zIndex: 4,
              }}
            />
          )}

          {/* ✅ Sparkles (mid/high only) */}
          {!isLow && (
            <>
              <div style={{ position: 'absolute', top: '20%', left: '30%', width: 4, height: 4, borderRadius: '50%', background: '#C4B5FD', boxShadow: '0 0 8px #C4B5FD', animation: 'sparkleTwinkle 1.5s ease-in-out infinite', zIndex: 4 }} />
              <div style={{ position: 'absolute', top: '70%', left: '60%', width: 4, height: 4, borderRadius: '50%', background: '#C4B5FD', boxShadow: '0 0 8px #C4B5FD', animation: 'sparkleTwinkle 2s ease-in-out infinite 0.5s', zIndex: 4 }} />
              <div style={{ position: 'absolute', top: '40%', left: '80%', width: 4, height: 4, borderRadius: '50%', background: '#C4B5FD', boxShadow: '0 0 8px #C4B5FD', animation: 'sparkleTwinkle 1.8s ease-in-out infinite 1s', zIndex: 4 }} />
            </>
          )}

          {/* Rings */}
          <div
            className={!isLow ? 'ring-premium' : ''}
            style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px dashed ${RING}` }}
          />
          <div style={{ position: 'absolute', inset: '12%', borderRadius: '50%', border: `1px dashed ${RING_INNER}` }} />
          <div style={{ position: 'absolute', inset: '24%', borderRadius: '50%', border: `1px dotted ${RING_INNER}` }} />

          {/* Orbiting wrapper */}
          <div className="orbit-wrapper" style={{ position: 'absolute', inset: 0 }}>
            {QUADS.map((q, idx) => {
              const count = countFor(q.id);
              const angleRad = (q.angle * Math.PI) / 180;
              const x = CENTER + ORBIT_RADIUS * Math.cos(angleRad);
              const y = CENTER + ORBIT_RADIUS * Math.sin(angleRad);

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
                        background: isDark ? 'linear-gradient(135deg, #1E293B, #0F172A)' : 'white',
                        border: `3px solid ${q.color}55`,
                        boxShadow: isDark
                          ? `0 8px 24px rgba(0,0,0,0.5), 0 0 0 4px ${q.color}15`
                          : `0 12px 30px ${q.color}25, 0 0 0 4px ${q.color}12`,
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
                        {q.name}
                      </span>

                      {/* Count badge — bounce on mid/high only */}
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

          {/* Center circle — pulse on mid/high only */}
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
              TOTAL
            </span>
            <span style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, color: 'white', letterSpacing: -2 }}>
              {total}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              {pct}% done
            </span>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {openQuadrant && currentQuad && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
            }}
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
                      {currentQuad.name}
                    </div>
                    <div className="text-xs font-semibold" style={{ color: TEXT_MUT }}>
                      {currentTasks.length} tasks
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setOpenQuadrant(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: isDark ? '#0F172A' : '#F1F5F9',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} strokeWidth={2.5} style={{ color: currentQuad.color }} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pt-4">
                {currentTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3 opacity-30">{currentQuad.emoji}</div>
                    <p className="text-sm italic" style={{ color: TEXT_MUT }}>
                      No tasks yet
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
                  style={{
                    background: currentQuad.color,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============ STARS BACKGROUND (CSS-only, no JS) ============
const StarsBackground: React.FC<{ isLow: boolean }> = ({ isLow }) => {
  const starCount = isLow ? 10 : 60;

  const stars = useMemo(() => {
    return Array.from({ length: starCount }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 2 + 0.8,
      delay: Math.random() * 4,
      duration: Math.random() * 2.5 + 1.5,
      baseOpacity: Math.random() * 0.5 + 0.4,
    }));
    // eslint-disable-next-line
  }, [starCount]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'hidden',
      }}
    >
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
            background: 'white',
            opacity: star.baseOpacity,
            animation: `twinkle ${star.duration}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
