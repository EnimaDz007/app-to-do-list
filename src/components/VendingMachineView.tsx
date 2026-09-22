import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Task, QuadrantId } from '../types';
import { useTheme } from '../context/ThemeContext';
import { SwipeableTaskItem } from './SwipeableTaskItem';

interface VendingMachineViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onQuadrantSelect?: (q: QuadrantId) => void;
}

const QUADS: {
  id: QuadrantId;
  name: string;
  emoji: string;
  code: string;
  color: string;
}[] = [
  { id: 'do_first',  name: 'Do First',  emoji: '🔥', code: 'A1', color: '#E11D48' },
  { id: 'schedule',  name: 'Schedule',  emoji: '📅', code: 'A2', color: '#4F46E5' },
  { id: 'delegate',  name: 'Delegate',  emoji: '👥', code: 'B1', color: '#059669' },
  { id: 'eliminate', name: 'Eliminate', emoji: '🗑️', code: 'B2', color: '#475569' },
];

export const VendingMachineView: React.FC<VendingMachineViewProps> = ({
  tasks,
  onToggleStatus,
  onDeleteTask,
  onQuadrantSelect,
}) => {
  const { isDark } = useTheme();
  const [openQuadrant, setOpenQuadrant] = useState<QuadrantId | null>(null);

  const isLow =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('perf-low');

  const BG = isDark
    ? 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)'
    : 'linear-gradient(180deg, #E2E8F0 0%, #CBD5E1 100%)';
  const TEXT = isDark ? '#F1F5F9' : '#0F172A';
  const TEXT_MUT = isDark ? '#94A3B8' : '#64748B';
  const MACHINE_BG = isDark
    ? 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)'
    : 'linear-gradient(180deg, #334155 0%, #1E293B 100%)';

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

  return (
    <div
      className="w-full"
      style={{
        background: BG,
        color: TEXT,
        minHeight: '100dvh',
        padding: '24px 20px 0',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
      }}
    >
      {/* Header */}
      <div className="text-center mb-5">
        <div
          className="inline-block px-3 py-1 rounded-full mb-2"
          style={{
            border: `1px solid ${isDark ? 'rgba(52,211,153,0.5)' : 'rgba(5,150,105,0.4)'}`,
            background: isDark ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.7)',
          }}
        >
          <span
            className="text-[9px] font-extrabold tracking-[3px] uppercase"
            style={{ color: '#10B981' }}
          >
            ● MACHINE ONLINE
          </span>
        </div>
        <h1 className="text-[26px] font-black tracking-tight leading-none" style={{ color: TEXT }}>
          Task <span style={{ color: '#06B6D4' }}>Machine</span>
        </h1>
        <p className="text-[11px] font-semibold mt-1.5" style={{ color: TEXT_MUT }}>
          {total} snacks · {pct}% dispensed
        </p>
      </div>

      {/* THE MACHINE */}
      <div className="flex justify-center items-center w-full" style={{ minHeight: 'calc(100dvh - 320px)' }}>
        <div
          className="rounded-3xl"
          style={{
            width: '100%',
            maxWidth: 360,
            background: MACHINE_BG,
            border: '4px solid #0F172A',
            boxShadow: isLow
              ? '0 10px 30px rgba(0,0,0,0.4)'
              : '0 30px 80px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.4), 0 0 60px rgba(6,182,212,0.15)',
            padding: 20,
          }}
        >
          {/* LCD Display */}
          <div
            className="rounded-xl mb-4 px-4 py-3 flex items-center justify-between"
            style={{
              background: 'linear-gradient(180deg, #0A0F0A 0%, #000 100%)',
              border: '2px solid #00FF6444',
              boxShadow: isLow ? 'none' : 'inset 0 0 20px rgba(0,255,100,0.15)',
            }}
          >
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#00FF64',
                letterSpacing: 1,
                textShadow: isLow ? 'none' : '0 0 8px rgba(0,255,100,0.8)',
              }}
            >
              &gt; READY
            </div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#00FF64',
                letterSpacing: 1,
                textShadow: isLow ? 'none' : '0 0 8px rgba(0,255,100,0.8)',
              }}
            >
              {total} ITEMS
            </div>
          </div>

          {/* Glass panel with 4 slots */}
          <div
            className="rounded-2xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
              border: '1.5px solid rgba(148,163,184,0.3)',
              boxShadow: isLow ? 'none' : 'inset 0 0 30px rgba(255,255,255,0.05)',
              padding: 16,
              backdropFilter: 'blur(4px)',
            }}
          >
            {/* Glass shine (mid/high only) */}
            {!isLow && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '10%',
                  width: '30%',
                  height: '100%',
                  background: 'linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* 4 slot grid */}
            <div className="grid grid-cols-2 gap-3">
              {QUADS.map((q) => {
                const count = countFor(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => handleOpen(q.id)}
                    className="relative aspect-square rounded-xl flex flex-col items-center justify-center transition-transform active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${q.color}, ${q.color}CC)`,
                      border: '1.5px solid rgba(255,255,255,0.25)',
                      boxShadow: isLow
                        ? 'inset 0 -4px 8px rgba(0,0,0,0.3)'
                        : `inset 0 -6px 12px rgba(0,0,0,0.3), 0 0 20px ${q.color}33`,
                      cursor: 'pointer',
                      padding: 8,
                    }}
                  >
                    {/* Slot code */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 8,
                        background: '#FCD34D',
                        color: '#0F172A',
                        fontFamily: 'monospace',
                        fontSize: 9,
                        fontWeight: 900,
                        padding: '1px 5px',
                        borderRadius: 4,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      {q.code}
                    </div>

                    {/* Count badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: 'rgba(255,255,255,0.95)',
                        color: q.color,
                        fontSize: 10,
                        fontWeight: 900,
                        minWidth: 20,
                        height: 20,
                        padding: '0 5px',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1.5px solid rgba(255,255,255,0.6)',
                      }}
                    >
                      {count}
                    </div>

                    <span style={{ fontSize: 30, lineHeight: 1, marginBottom: 4 }}>{q.emoji}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        color: 'white',
                        letterSpacing: 0.3,
                        textAlign: 'center',
                        lineHeight: 1.1,
                        textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                      }}
                    >
                      {q.name.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom control panel */}
          <div className="mt-4 flex items-center justify-between gap-3">
            {/* Dispensing slot */}
            <div
              className="flex-1 h-11 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(180deg, #0A0F0A, #000)',
                border: '1.5px solid #1E293B',
                boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.8)',
                fontFamily: 'monospace',
                fontSize: 9,
                color: '#00FF64',
                letterSpacing: 1.5,
              }}
            >
              ▼ DISPENSE
            </div>

            {/* Coin slot */}
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 40,
                height: 40,
                background: 'radial-gradient(circle at 30% 30%, #FEF3C7, #F59E0B 60%, #92400E)',
                border: '2px solid #78350F',
                boxShadow: isLow ? 'none' : '0 4px 12px rgba(251,191,36,0.4)',
                fontSize: 16,
              }}
            >
              💰
            </div>
          </div>

          {/* Bottom indicator lights */}
          <div className="mt-3 flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i <= Math.ceil(pct / 20) ? '#10B981' : '#334155',
                  boxShadow: isLow ? 'none' : (i <= Math.ceil(pct / 20) ? '0 0 8px #10B981' : 'none'),
                }}
              />
            ))}
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
                      {currentQuad.name}
                    </div>
                    <div className="text-xs font-semibold" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
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
                    <p className="text-sm italic" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
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
