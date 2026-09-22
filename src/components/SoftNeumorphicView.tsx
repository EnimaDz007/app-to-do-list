import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Task, QuadrantId } from '../types';
import { useTheme } from '../context/ThemeContext';
import { SwipeableTaskItem } from './SwipeableTaskItem';

interface SoftNeumorphicViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onQuadrantSelect?: (q: QuadrantId) => void;
}

const QUADS: { id: QuadrantId; name: string; emoji: string; color: string }[] = [
  { id: 'do_first',  name: 'Do First',  emoji: '🔥', color: '#E11D48' },
  { id: 'schedule',  name: 'Schedule',  emoji: '📅', color: '#4F46E5' },
  { id: 'delegate',  name: 'Delegate',  emoji: '👥', color: '#059669' },
  { id: 'eliminate', name: 'Eliminate', emoji: '🗑️', color: '#475569' },
];

export const SoftNeumorphicView: React.FC<SoftNeumorphicViewProps> = ({
  tasks,
  onToggleStatus,
  onDeleteTask,
  onQuadrantSelect,
}) => {
  const { isDark } = useTheme();
  const [openQuadrant, setOpenQuadrant] = useState<QuadrantId | null>(null);

  // 🎨 Theme-aware colors
  const BG       = isDark ? '#1E293B' : '#EDF1F7';
  const SHADOW_D = isDark ? '#0F172A' : '#C8CED8';
  const SHADOW_L = isDark ? '#334155' : '#FFFFFF';
  const TEXT     = isDark ? '#F1F5F9' : '#1E293B';
  const TEXT_MUT = isDark ? '#94A3B8' : '#94A3B8';

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
        transition: 'background-color 0.3s ease',
      }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
          style={{
            background: BG,
            boxShadow: `4px 4px 10px ${SHADOW_D}, -4px -4px 10px ${SHADOW_L}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#10B981', boxShadow: '0 0 6px #10B981' }}
          />
          <span
            className="text-[10px] font-extrabold tracking-[1.5px] uppercase"
            style={{ color: TEXT_MUT }}
          >
            {new Date()
              .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              .toUpperCase()}
          </span>
        </div>
        <h1
          className="text-[28px] font-black tracking-tight leading-tight"
          style={{ color: TEXT }}
        >
          Your <span style={{ color: '#6366F1' }}>Matrix</span>
        </h1>
        <p className="text-[11px] font-medium mt-1" style={{ color: TEXT_MUT }}>
          Soft productivity
        </p>
      </div>

      {/* Total Card */}
      <div
        className="rounded-3xl p-6 mb-4 text-center"
        style={{
          background: BG,
          boxShadow: `inset 6px 6px 14px ${SHADOW_D}, inset -6px -6px 14px ${SHADOW_L}`,
        }}
      >
        <div
          className="text-[60px] font-black leading-none tracking-[-4px]"
          style={{ color: '#6366F1' }}
        >
          {total}
        </div>
        <div
          className="text-[10px] font-extrabold tracking-[2px] uppercase mt-2"
          style={{ color: TEXT_MUT }}
        >
          Total · {pct}% done
        </div>
      </div>

      {/* Quadrant Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        {QUADS.map((q) => {
          const count = countFor(q.id);
          return (
            <button
              key={q.id}
              onClick={() => handleOpen(q.id)}
              className="rounded-3xl p-4 transition-all duration-150 text-center"
              style={{
                background: BG,
                boxShadow: `5px 5px 12px ${SHADOW_D}, -5px -5px 12px ${SHADOW_L}`,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <div
                className="w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center text-base"
                style={{
                  background: BG,
                  boxShadow: `inset 3px 3px 6px ${SHADOW_D}, inset -3px -3px 6px ${SHADOW_L}`,
                }}
              >
                {q.emoji}
              </div>
              <div
                className="text-[22px] font-black leading-none tracking-tight mb-1"
                style={{ color: q.color }}
              >
                {count}
              </div>
              <div
                className="text-[10px] font-bold tracking-tight"
                style={{ color: TEXT_MUT }}
              >
                {q.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom spacer */}
      <div style={{ height: '80px' }} />

      {/* Modal */}
      {openQuadrant && currentQuad && (
        <>
          <div
            onClick={() => setOpenQuadrant(null)}
            className="fixed inset-0 z-40"
            style={{
              background: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div
            className="fixed top-1/2 left-1/2 z-50 w-[92%] max-w-md max-h-[80vh] rounded-3xl flex flex-col overflow-hidden"
            style={{
              transform: 'translate(-50%, -50%)',
              background: BG,
              boxShadow: `20px 20px 60px ${SHADOW_D}, -10px -10px 30px ${SHADOW_L}`,
            }}
          >
            <div className="flex items-center justify-between p-6 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                  style={{
                    background: BG,
                    boxShadow: `inset 3px 3px 6px ${SHADOW_D}, inset -3px -3px 6px ${SHADOW_L}`,
                  }}
                >
                  {currentQuad.emoji}
                </div>
                <div>
                  <div
                    className="text-base font-black"
                    style={{ color: currentQuad.color }}
                  >
                    {currentQuad.name}
                  </div>
                  <div
                    className="text-xs font-semibold"
                    style={{ color: TEXT_MUT }}
                  >
                    {currentTasks.length} tasks
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpenQuadrant(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: BG,
                  boxShadow: `3px 3px 6px ${SHADOW_D}, -3px -3px 6px ${SHADOW_L}`,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <X
                  size={16}
                  strokeWidth={2.5}
                  style={{ color: currentQuad.color }}
                />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-2">
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
                      categoryPale={BG}
                      categoryGradient={currentQuad.color}
                      onComplete={(id) => onToggleStatus(id)}
                      onDelete={(id) => onDeleteTask && onDeleteTask(id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 shrink-0">
              <button
                onClick={() => setOpenQuadrant(null)}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all"
                style={{
                  background: currentQuad.color,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
