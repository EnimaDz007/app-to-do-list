import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Task, QuadrantId } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SwipeableTaskItem } from './SwipeableTaskItem';

interface StackedCardsViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onQuadrantSelect?: (q: QuadrantId) => void;
}

const QUADS: {
  id: QuadrantId;
  name: string;
  sub: string;
  emoji: string;
  color: string;
  bgLight: string;
  bgDark: string;
}[] = [
  { id: 'do_first',  name: 'Do First',  sub: 'Urgent · Important', emoji: '🔥', color: '#E11D48', bgLight: '#FFF1F2', bgDark: '#2A1520' },
  { id: 'schedule',  name: 'Schedule',  sub: 'Important · Later',  emoji: '📅', color: '#4F46E5', bgLight: '#EEF2FF', bgDark: '#1A1B3A' },
  { id: 'delegate',  name: 'Delegate',  sub: 'Urgent · Later',     emoji: '👥', color: '#059669', bgLight: '#ECFDF5', bgDark: '#0F2A24' },
  { id: 'eliminate', name: 'Eliminate', sub: 'Not Important',      emoji: '🗑️', color: '#475569', bgLight: '#F8FAFC', bgDark: '#1E2430' },
];

export const StackedCardsView: React.FC<StackedCardsViewProps> = ({
  tasks,
  onToggleStatus,
  onDeleteTask,
  onQuadrantSelect,
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [openQuadrant, setOpenQuadrant] = useState<QuadrantId | null>(null);

  const BG       = isDark ? '#0F172A' : '#F0F9FF';
  const TEXT     = isDark ? '#F1F5F9' : '#0C4A6E';
  const TEXT_MUT = isDark ? '#94A3B8' : '#0369A1';

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
      <div className="mb-8">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg mb-3"
          style={{ background: '#0EA5E9', color: 'white' }}
        >
          <span className="text-[9px] font-extrabold tracking-[1.5px] uppercase">
            ◈ ACTIVE
          </span>
        </div>
        <h1
          className="text-[32px] font-black tracking-tight leading-none"
          style={{ color: TEXT }}
        >
          Your <span style={{ color: '#0EA5E9' }}>Matrix</span>
        </h1>
        <p className="text-[11px] font-semibold mt-1.5" style={{ color: TEXT_MUT }}>
          {total} tasks · {pct}% done
        </p>
      </div>

      {/* 3D STACKED CARDS */}
      <div className="relative" style={{ paddingTop: 20, paddingBottom: 8 }}>
        {QUADS.map((q, index) => {
          const count = countFor(q.id);
          const depth = index;

          // 🔥 3D transforms: each card shrinks and offsets down
         const scale = 1 - depth * 0.05;
const translateY = depth * 8;
const rotateX = depth * 1.5;
          return (
            <button
              key={q.id}
              onClick={() => handleOpen(q.id)}
              className="w-full text-left"
              style={{
                background: isDark ? q.bgDark : q.bgLight,
                border: `1.5px solid ${q.color}${isDark ? '55' : '33'}`,
                borderLeft: `6px solid ${q.color}`,
                borderRadius: 20,
                padding: '16px 20px',
                marginBottom: -20,                            // 🔥 NEGATIVE MARGIN = stacking
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isDark
                  ? `0 ${6 + depth * 2}px ${16 + depth * 4}px rgba(0, 0, 0, ${0.35 + depth * 0.08})`
                  : `0 ${6 + depth * 2}px ${16 + depth * 4}px rgba(15, 23, 42, ${0.06 + depth * 0.03})`,
                transform: `scale(${scale}) translateY(${translateY}px) perspective(800px) rotateX(${-rotateX}deg)`,
                transformOrigin: 'center top',
                cursor: 'pointer',
                position: 'relative',
                zIndex: 10 - index,                            // 🔥 First card on TOP
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `scale(${scale + 0.02}) translateY(${translateY - 4}px) perspective(800px) rotateX(${-rotateX}deg)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `scale(${scale}) translateY(${translateY}px) perspective(800px) rotateX(${-rotateX}deg)`;
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center text-[20px]"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: isDark ? '#0F172A' : 'white',
                    boxShadow: isDark ? 'none' : `0 4px 10px ${q.color}22`,
                  }}
                >
                  {q.emoji}
                </div>
                <div>
                  <div
                    className="text-[15px] font-extrabold tracking-tight"
                    style={{ color: isDark ? '#F1F5F9' : q.color }}
                  >
                    {q.name}
                  </div>
                  <div
                    className="text-[11px] font-semibold mt-0.5"
                    style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                  >
                    {q.sub}
                  </div>
                </div>
              </div>
              <div
                className="text-[28px] font-black tracking-tighter"
                style={{ color: q.color }}
              >
                {count}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom spacer */}
      <div style={{ height: '220px' }} />

      {/* Modal */}
      {openQuadrant && currentQuad && (
        <>
          <div
            onClick={() => setOpenQuadrant(null)}
            className="fixed inset-0 z-40"
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div
            className="fixed top-1/2 left-1/2 z-50 w-[92%] max-w-md max-h-[80vh] rounded-3xl flex flex-col overflow-hidden"
            style={{
              transform: 'translate(-50%, -50%)',
              background: isDark ? '#1E293B' : 'white',
              boxShadow: '0 30px 80px rgba(15, 23, 42, 0.3)',
            }}
          >
            <div className="flex items-center justify-between p-6 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                  style={{ background: isDark ? '#0F172A' : currentQuad.bgLight }}
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
                  <div
                    className="text-xs font-semibold"
                    style={{ color: '#94A3B8' }}
                  >
                    {currentTasks.length} tasks
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpenQuadrant(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: isDark ? '#0F172A' : currentQuad.bgLight,
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
                  <p className="text-sm italic" style={{ color: '#94A3B8' }}>
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
                      categoryPale={isDark ? '#0F172A' : currentQuad.bgLight}
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
                className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                style={{
                  background: currentQuad.color,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {t('done_btn') || 'Done'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
