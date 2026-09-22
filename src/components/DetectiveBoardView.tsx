import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Task, QuadrantId } from '../types';
import { useTheme } from '../context/ThemeContext';
import { SwipeableTaskItem } from './SwipeableTaskItem';

interface DetectiveBoardViewProps {
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
  photoBg: string;
  top: string;
  left: string;
  rotation: number;
  badge: string;
}[] = [
  { id: 'do_first',  name: 'Do First',  emoji: '🔥', color: '#E11D48', photoBg: '#FECDD3', top: '20%', left: '22%', rotation: -7, badge: 'URGENT' },
  { id: 'schedule',  name: 'Schedule',  emoji: '📅', color: '#4F46E5', photoBg: '#C7D2FE', top: '22%', left: '70%', rotation: 6,  badge: 'LATER' },
  { id: 'delegate',  name: 'Delegate',  emoji: '👥', color: '#059669', photoBg: '#A7F3D0', top: '58%', left: '20%', rotation: 4,  badge: 'TEAM' },
  { id: 'eliminate', name: 'Eliminate', emoji: '🗑️', color: '#475569', photoBg: '#E2E8F0', top: '60%', left: '72%', rotation: -5, badge: 'DROP' },
];

const HIDDEN_CLUES = [
  { text: 'SUSPECT',   top: '35%', left: '6%',  wide: false },
  { text: 'CLUE 042',  top: '48%', left: '42%', wide: true  },
  { text: 'LAST SEEN', top: '78%', left: '60%', wide: false },
  { text: 'DO NOT OPEN', top: '28%', left: '55%', wide: false },
  { text: 'TRUST NO ONE', top: '82%', left: '6%', wide: false },
  { text: 'RUN',       top: '45%', left: '82%', wide: true  },
];

export const DetectiveBoardView: React.FC<DetectiveBoardViewProps> = ({
  tasks,
  onToggleStatus,
  onDeleteTask,
  onQuadrantSelect,
}) => {
  const { isDark } = useTheme();
  const [openQuadrant, setOpenQuadrant] = useState<QuadrantId | null>(null);
  const [magActive, setMagActive] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const magnifierRef = useRef<HTMLDivElement>(null);

  const isLow =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('perf-low');

  const BG = isDark
    ? 'radial-gradient(circle at 30% 40%, #2A1810 0%, #1A0F08 70%, #0F0805 100%)'
    : 'radial-gradient(circle at 30% 40%, #A0603A 0%, #7A3D14 60%, #3A1E08 100%)';
  const TEXT = '#FEF3C7';
  const TEXT_MUT = '#FDE68A';

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

  // ✅ Magnifier cursor tracking (only on mid/high)
  useEffect(() => {
    if (isLow) return;
    const board = boardRef.current;
    const magnifier = magnifierRef.current;
    if (!board || !magnifier) return;

    const moveGlass = (x: number, y: number) => {
      const rect = board.getBoundingClientRect();
      magnifier.style.left = (x - rect.left) + 'px';
      magnifier.style.top = (y - rect.top) + 'px';
    };

    const handleMouseMove = (e: MouseEvent) => {
      moveGlass(e.clientX, e.clientY);
      setMagActive(true);
    };
    const handleMouseLeave = () => setMagActive(false);

    const handleTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      moveGlass(t.clientX, t.clientY);
      setMagActive(true);
    };
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      moveGlass(t.clientX, t.clientY);
    };
    const handleTouchEnd = () => setMagActive(false);

    board.addEventListener('mousemove', handleMouseMove);
    board.addEventListener('mouseleave', handleMouseLeave);
    board.addEventListener('touchstart', handleTouchStart, { passive: true });
    board.addEventListener('touchmove', handleTouchMove, { passive: true });
    board.addEventListener('touchend', handleTouchEnd);

    return () => {
      board.removeEventListener('mousemove', handleMouseMove);
      board.removeEventListener('mouseleave', handleMouseLeave);
      board.removeEventListener('touchstart', handleTouchStart);
      board.removeEventListener('touchmove', handleTouchMove);
      board.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isLow]);

  return (
    <div
      className="w-full"
      style={{
        background: BG,
        color: TEXT,
        minHeight: '100dvh',
        padding: '24px 20px 0',
        paddingBottom: 'calc(80px + calc(env(safe-area-inset-bottom) + 80px))',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Cork texture */}
      {!isLow && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(0,0,0,0.08) 0 2px, transparent 2px 4px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 4px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* Header */}
      <div className="text-center mb-4" style={{ position: 'relative', zIndex: 4 }}>
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-2"
          style={{
            background: 'rgba(0,0,0,0.45)',
            border: '1px solid rgba(253,230,138,0.35)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#EF4444',
              boxShadow: isLow ? 'none' : '0 0 8px #EF4444',
              animation: isLow ? 'none' : 'detRecBlink 1.5s ease-in-out infinite',
            }}
          />
          <span className="text-[9px] font-extrabold tracking-[3px] uppercase" style={{ color: TEXT_MUT }}>
            CASE #001 · ACTIVE
          </span>
        </div>
        <h1
          className="text-[28px] font-black leading-none"
          style={{
            color: TEXT,
            fontFamily: "'Special Elite', 'Caveat', monospace",
            letterSpacing: 2,
            textTransform: 'uppercase',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          The Missing Tasks
        </h1>
        <p className="text-[10px] font-semibold mt-2" style={{ color: TEXT_MUT, letterSpacing: 3, textTransform: 'uppercase' }}>
          {total} clues · {pct}% solved
        </p>
      </div>

      {/* Hint */}
      {!isLow && (
        <div
          className="text-center mb-3"
          style={{ position: 'relative', zIndex: 4 }}
        >
          <span
            className="inline-block text-[10px] font-semibold px-3 py-1 rounded-full"
            style={{
              color: '#FCD34D',
              background: 'rgba(220, 38, 38, 0.15)',
              border: '1px solid rgba(220, 38, 38, 0.35)',
              letterSpacing: 1,
            }}
          >
            🔍 Move your cursor to reveal hidden clues
          </span>
        </div>
      )}

      {/* THE BOARD */}
      <div
        className="flex justify-center items-center w-full"
        style={{ minHeight: 'calc(100dvh - 320px)', position: 'relative', zIndex: 2 }}
      >
        <div
          ref={boardRef}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 420,
            aspectRatio: '1',
            borderRadius: 20,
            background: isDark
              ? 'radial-gradient(circle at 30% 40%, #2A1810 0%, #1A0F08 60%, #0F0805 100%)'
              : 'radial-gradient(circle at 30% 40%, #A0603A 0%, #7A3D14 60%, #3A1E08 100%)',
            boxShadow: isLow
              ? '0 0 0 6px #1A0F08, 0 0 0 8px #2A1810, 0 20px 50px rgba(0,0,0,0.6)'
              : '0 0 0 6px #1A0F08, 0 0 0 8px #2A1810, 0 20px 60px rgba(0,0,0,0.7), 0 0 100px rgba(220, 38, 38, 0.15)',
            overflow: 'hidden',
            cursor: isLow ? 'default' : 'none',
          }}
        >
          {/* Cork texture inside */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(0,0,0,0.08) 0 2px, transparent 2px 4px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 4px)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* ✅ CINEMATIC — mid/high only */}
          {!isLow && (
            <>
              {/* Vignette pulse */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at 50% 50%, transparent 30%, rgba(220, 38, 38, 0.18) 100%)',
                  zIndex: 3,
                  animation: 'detVignettePulse 4s ease-in-out infinite',
                  pointerEvents: 'none',
                }}
              />
              {/* Scan line */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 3,
                  background: 'linear-gradient(90deg, transparent 0%, #10B981 50%, transparent 100%)',
                  boxShadow: '0 0 20px #10B981, 0 0 40px rgba(16, 185, 129, 0.5)',
                  zIndex: 6,
                  animation: 'detScanLine 4s linear infinite',
                  pointerEvents: 'none',
                }}
              />
              {/* Camera flash */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'white',
                  opacity: 0,
                  zIndex: 25,
                  animation: 'detFlashBang 6s ease-out infinite',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}

          {/* Static vignette */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 50% 50%, transparent 35%, rgba(0,0,0,0.6) 100%)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />

          {/* Header inside board */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: "'Special Elite', monospace",
              fontSize: 14,
              color: '#FEF3C7',
              letterSpacing: 3,
              textTransform: 'uppercase',
              textShadow: '0 2px 6px rgba(0,0,0,0.9)',
              zIndex: 4,
              opacity: 0.9,
            }}
          >
            CASE #001
          </div>

          {/* ✅ HIDDEN CLUES — mid/high only */}
          {!isLow && HIDDEN_CLUES.map((clue, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: clue.top,
                left: clue.left,
                fontFamily: "'Special Elite', monospace",
                fontSize: clue.wide ? 16 : 12,
                color: '#FCD34D',
                opacity: magActive ? 1 : 0.06,
                zIndex: 4,
                transition: 'opacity 0.4s ease',
                textShadow: '0 0 12px #FCD34D, 0 0 24px rgba(252, 211, 77, 0.5)',
                pointerEvents: 'none',
                letterSpacing: clue.wide ? 4 : 2,
                fontWeight: 900,
              }}
            >
              {clue.text}
            </div>
          ))}

          {/* Red strings */}
          <svg
            viewBox="0 0 400 400"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 5, pointerEvents: 'none' }}
          >
            <line
              x1="88" y1="80" x2="280" y2="88"
              stroke="#DC2626" strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))', animation: isLow ? 'none' : 'detStringPulse 3s ease-in-out infinite' }}
            />
            <line
              x1="280" y1="88" x2="80" y2="240"
              stroke="#DC2626" strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))', animation: isLow ? 'none' : 'detStringPulse 3s ease-in-out infinite 0.5s' }}
            />
            <line
              x1="80" y1="240" x2="288" y2="248"
              stroke="#DC2626" strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))', animation: isLow ? 'none' : 'detStringPulse 3s ease-in-out infinite 1s' }}
            />
            <line
              x1="88" y1="80" x2="288" y2="248"
              stroke="#DC2626" strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))', opacity: 0.5 }}
            />
          </svg>

          {/* Photos */}
          {QUADS.map((q) => {
            const count = countFor(q.id);
            return (
              <button
                key={q.id}
                onClick={() => handleOpen(q.id)}
                style={{
                  position: 'absolute',
                  top: q.top,
                  left: q.left,
                  transform: `translate(-50%, -50%) rotate(${q.rotation}deg)`,
                  background: '#FEF3C7',
                  padding: '7px 7px 24px 7px',
                  borderRadius: 3,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: isLow
                    ? '3px 3px 10px rgba(0,0,0,0.6)'
                    : '4px 4px 16px rgba(0,0,0,0.7), 0 0 24px rgba(0,0,0,0.3)',
                  zIndex: 7,
                  transition: 'transform 0.2s ease',
                  pointerEvents: 'auto',
                }}
              >
                {/* Push pin */}
                <div
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 30% 25%, #FF9090, #DC2626 55%, #7F1D1D)',
                    boxShadow: isLow ? '0 2px 4px rgba(0,0,0,0.7)' : '0 3px 8px rgba(0,0,0,0.7), inset -2px -2px 3px rgba(0,0,0,0.4)',
                    zIndex: 9,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: 4,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.75)',
                    }}
                  />
                </div>

                {/* Case badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -8,
                    background: '#FCD34D',
                    color: '#451A03',
                    fontSize: 8,
                    fontWeight: 900,
                    letterSpacing: 1,
                    padding: '2px 6px',
                    borderRadius: 2,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                    zIndex: 9,
                    fontFamily: "'Special Elite', monospace",
                  }}
                >
                  {q.badge}
                </div>

                {/* Photo frame */}
                <div
                  style={{
                    width: 62,
                    height: 62,
                    background: q.photoBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 30,
                    borderRadius: 2,
                    position: 'relative',
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  {q.emoji}

                  {/* Count badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      background: q.color,
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 900,
                      minWidth: 22,
                      height: 22,
                      padding: '0 5px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid white',
                      boxShadow: isLow ? 'none' : `0 2px 6px ${q.color}88`,
                    }}
                  >
                    {count}
                  </div>
                </div>

                {/* Handwritten label */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 5,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    fontFamily: "'Caveat', cursive",
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#451A03',
                    lineHeight: 1,
                  }}
                >
                  {q.name}
                </div>
              </button>
            );
          })}

          {/* Recording text — mid/high only */}
          {!isLow && (
            <div
              style={{
                position: 'absolute',
                bottom: 14,
                left: 0,
                right: 0,
                textAlign: 'center',
                fontFamily: "'Special Elite', monospace",
                fontSize: 10,
                color: '#FCD34D',
                letterSpacing: 5,
                zIndex: 6,
                textTransform: 'uppercase',
                animation: 'detSuspenseFlicker 3s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            >
              ● RECORDING
            </div>
          )}

          {/* ✅ MAGNIFIER — mid/high only */}
          {!isLow && (
            <div
              ref={magnifierRef}
              style={{
                position: 'absolute',
                width: 150,
                height: 150,
                borderRadius: '50%',
                border: '5px solid #78350F',
                background: 'rgba(255, 250, 220, 0.15)',
                backdropFilter: 'blur(0.5px) brightness(1.6) saturate(1.2)',
                WebkitBackdropFilter: 'blur(0.5px) brightness(1.6) saturate(1.2)',
                boxShadow:
                  '0 0 0 8px rgba(120, 53, 15, 0.45), 0 0 0 10px rgba(255, 220, 150, 0.15), inset 0 0 40px rgba(255, 255, 200, 0.5), 0 30px 60px rgba(0, 0, 0, 0.7)',
                pointerEvents: 'none',
                zIndex: 30,
                transform: 'translate(-50%, -50%)',
                transition: 'opacity 0.3s ease',
                opacity: magActive ? 1 : 0,
                left: '50%',
                top: '50%',
              }}
            >
              {/* Glass reflection */}
              <div
                style={{
                  position: 'absolute',
                  top: '12%',
                  left: '18%',
                  width: '35%',
                  height: '22%',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.85), transparent)',
                  transform: 'rotate(-30deg)',
                }}
              />
              {/* Handle */}
              <div
                style={{
                  position: 'absolute',
                  width: 70,
                  height: 16,
                  background: 'linear-gradient(180deg, #7A3D14, #451A03)',
                  borderRadius: 6,
                  bottom: -10,
                  right: -32,
                  transform: 'rotate(42deg)',
                  boxShadow: '3px 3px 8px rgba(0,0,0,0.7), inset 0 -2px 3px rgba(0,0,0,0.5)',
                  border: '1.5px solid #2A1810',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Investigation status bar */}
      <div
        className="mx-auto mt-6"
        style={{
          position: 'relative',
          zIndex: 3,
          maxWidth: 340,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(253,230,138,0.3)',
          borderRadius: 14,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backdropFilter: 'blur(10px)',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          🕵️
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 9,
              color: TEXT_MUT,
              letterSpacing: 1.5,
              marginBottom: 2,
            }}
          >
            INVESTIGATION
          </div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              color: 'white',
              fontWeight: 800,
              letterSpacing: 0.5,
            }}
          >
            {completed} / {total} clues found
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
            style={{ background: 'rgba(15, 8, 5, 0.75)', backdropFilter: 'blur(4px)' }}
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
                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6)',
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
                    <div className="text-xs font-semibold" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      {currentTasks.length} clues
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
                    <p className="text-sm italic" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      No clues found yet
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
                  Close Case
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
