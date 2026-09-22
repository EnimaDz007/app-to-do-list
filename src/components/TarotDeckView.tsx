import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Check, X, RotateCcw } from 'lucide-react';
import { Task, QuadrantId } from '../types';
import { useTheme } from '../context/ThemeContext';

interface TarotDeckViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onQuadrantSelect?: (q: QuadrantId) => void;
}

const QUAD_META: Record<QuadrantId, { emoji: string; label: string; color: string }> = {
  do_first:  { emoji: '🔥', label: 'Do First',  color: '#E11D48' },
  schedule:  { emoji: '📅', label: 'Schedule',  color: '#4F46E5' },
  delegate:  { emoji: '👥', label: 'Delegate',  color: '#059669' },
  eliminate: { emoji: '🗑️', label: 'Eliminate', color: '#475569' },
};

type ExitDir = 'complete' | 'delete' | 'defer' | null;

export const TarotDeckView: React.FC<TarotDeckViewProps> = ({
  tasks,
  onToggleStatus,
  onDeleteTask,
  onQuadrantSelect,
}) => {
  const { isDark } = useTheme();

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'completed'),
    [tasks]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDir, setExitDir] = useState<ExitDir>(null);
  const [burst, setBurst] = useState<{ id: number; type: ExitDir } | null>(null);

  const currentTask = activeTasks[currentIndex % Math.max(activeTasks.length, 1)];
  const nextTask    = activeTasks[(currentIndex + 1) % Math.max(activeTasks.length, 1)];
  const thirdTask   = activeTasks[(currentIndex + 2) % Math.max(activeTasks.length, 1)];

  const nextCard = () => {
    if (activeTasks.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % activeTasks.length);
    }
  };

  const triggerExit = (dir: ExitDir, action: () => void) => {
    if (exitDir) return;
    setExitDir(dir);
    setBurst({ id: Date.now(), type: dir });
    // Wait for exit animation, then run action
    setTimeout(() => {
      action();
      setExitDir(null);
      setTimeout(() => setBurst(null), 500);
    }, 420);
  };

  const handleComplete = () => {
    if (!currentTask) return;
    triggerExit('complete', () => {
      onToggleStatus(currentTask.id);
      nextCard();
    });
  };

  const handleDelete = () => {
    if (!currentTask) return;
    triggerExit('delete', () => {
      if (onDeleteTask) onDeleteTask(currentTask.id);
      nextCard();
    });
  };

  const handleDefer = () => {
    if (!currentTask) return;
    triggerExit('defer', () => {
      nextCard();
    });
  };

  const handleTapQuadrant = () => {
    if (currentTask && onQuadrantSelect) onQuadrantSelect(currentTask.quadrant);
  };

  // Colors
  const BG = isDark
    ? 'linear-gradient(180deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)'
    : 'linear-gradient(180deg, #FAF5FF 0%, #EDE9FE 50%, #DDD6FE 100%)';
  const TEXT = isDark ? '#F1F5F9' : '#1E1B4B';
  const TEXT_MUT = isDark ? '#C4B5FD' : '#7C3AED';
  const CARD_BG = isDark
    ? 'linear-gradient(180deg, #1E293B 0%, #312E81 100%)'
    : 'linear-gradient(180deg, #FFFFFF 0%, #FEF3C7 100%)';

  // Empty state
  if (activeTasks.length === 0) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center"
        style={{ background: BG, minHeight: '100dvh', color: TEXT }}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-[80px] mb-4"
        >
          🎴
        </motion.div>
        <h2 className="text-[22px] font-black tracking-tight mb-2">
          No cards left
        </h2>
        <p className="text-[12px] font-medium" style={{ color: TEXT_MUT }}>
          All tasks completed!
        </p>
      </div>
    );
  }

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
      <div className="text-center mb-6">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2"
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(252, 211, 77, 0.4)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <span className="text-[9px] font-extrabold tracking-[2px] uppercase" style={{ color: '#FCD34D' }}>
            ◈ Daily Draw
          </span>
        </div>
        <h1 className="text-[26px] font-black tracking-tight leading-none" style={{ color: TEXT }}>
          Your <span style={{ color: '#A855F7' }}>Deck</span>
        </h1>
        <p className="text-[10px] font-semibold mt-1.5" style={{ color: TEXT_MUT }}>
          {(currentIndex % activeTasks.length) + 1} / {activeTasks.length} cards
        </p>
      </div>

      {/* Card Stack */}
      <div className="relative mx-auto" style={{ width: '100%', maxWidth: 320, height: 420 }}>

        {/* Card 3 (back) */}
        {thirdTask && activeTasks.length > 2 && (
          <motion.div
            className="absolute left-1/2 top-1/2"
            animate={{ scale: 0.94, rotate: 8, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              width: '88%',
              height: '90%',
              borderRadius: 24,
              background: isDark
                ? 'repeating-linear-gradient(45deg, #312E81 0 8px, #1E1B4B 8px 16px)'
                : 'repeating-linear-gradient(45deg, #A855F7 0 8px, #9333EA 8px 16px)',
              border: '3px solid #FCD34D',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              zIndex: 1,
            }}
          />
        )}

        {/* Card 2 (middle) */}
        {nextTask && activeTasks.length > 1 && (
          <motion.div
            className="absolute left-1/2 top-1/2"
            animate={{ scale: 0.97, rotate: -5, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              width: '90%',
              height: '92%',
              borderRadius: 24,
              background: isDark
                ? 'repeating-linear-gradient(45deg, #4C1D95 0 8px, #312E81 8px 16px)'
                : 'repeating-linear-gradient(45deg, #C084FC 0 8px, #A855F7 8px 16px)',
              border: '3px solid #FCD34D',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              zIndex: 2,
            }}
          />
        )}

        {/* Card 1 (TOP - interactive, animated) */}
        <AnimatePresence mode="wait">
          <SwipeableTarotCard
            key={currentTask.id}
            task={currentTask}
            isDark={isDark}
            cardBg={CARD_BG}
            exitDir={exitDir}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onDefer={handleDefer}
            onTapQuadrant={handleTapQuadrant}
          />
        </AnimatePresence>

        {/* ✅ Burst overlay for feedback */}
        <AnimatePresence>
          {burst && (
            <BurstFeedback key={burst.id} type={burst.type} />
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center items-center gap-4 mt-8">
        <button
          onClick={handleDelete}
          className="flex items-center justify-center rounded-full active:scale-90 transition-transform"
          style={{
            width: 54, height: 54,
            background: 'linear-gradient(135deg, #F43F5E, #BE123C)',
            border: '2px solid white',
            boxShadow: '0 8px 20px rgba(244, 63, 94, 0.4)',
          }}
          title="Delete"
        >
          <X size={22} strokeWidth={3} color="white" />
        </button>
        <button
          onClick={handleDefer}
          className="flex items-center justify-center rounded-full active:scale-90 transition-transform"
          style={{
            width: 54, height: 54,
            background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
            border: '2px solid white',
            boxShadow: '0 8px 20px rgba(251, 191, 36, 0.4)',
          }}
          title="Defer"
        >
          <RotateCcw size={20} strokeWidth={2.8} color="white" />
        </button>
        <button
          onClick={handleComplete}
          className="flex items-center justify-center rounded-full active:scale-90 transition-transform"
          style={{
            width: 54, height: 54,
            background: 'linear-gradient(135deg, #10B981, #047857)',
            border: '2px solid white',
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
          }}
          title="Complete"
        >
          <Check size={24} strokeWidth={3} color="white" />
        </button>
      </div>

      <p
        className="text-center text-[10px] font-medium tracking-wider mt-4"
        style={{ color: TEXT_MUT }}
      >
        SWIPE → COMPLETE · ← DEFER · ↑ DELETE
      </p>
    </div>
  );
};

// ============ SWIPEABLE TAROT CARD ============
interface SwipeableTarotCardProps {
  task: Task;
  isDark: boolean;
  cardBg: string;
  exitDir: ExitDir;
  onComplete: () => void;
  onDelete: () => void;
  onDefer: () => void;
  onTapQuadrant: () => void;
}

const SwipeableTarotCard: React.FC<SwipeableTarotCardProps> = ({
  task,
  isDark,
  cardBg,
  exitDir,
  onComplete,
  onDelete,
  onDefer,
  onTapQuadrant,
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const meta = QUAD_META[task.quadrant];

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.y < -threshold) onDelete();
    else if (info.offset.x > threshold) onComplete();
    else if (info.offset.x < -threshold) onDefer();
  };

  // ✅ Exit animation based on direction
  const exitAnimation = (() => {
    switch (exitDir) {
      case 'complete':
        return { x: 500, y: -50, rotate: 30, opacity: 0, scale: 0.9 };
      case 'delete':
        return { y: -600, opacity: 0, scale: 0.7, rotate: -15 };
      case 'defer':
        return { x: -500, y: 50, rotate: -30, opacity: 0, scale: 0.9 };
      default:
        return { opacity: 0, scale: 0.9 };
    }
  })();

  return (
    <motion.div
      drag={exitDir === null}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.85, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={exitAnimation}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 26,
      }}
      style={{
        x, y, rotate, opacity,
        position: 'absolute',
        left: '50%',
        top: '50%',
        translateX: '-50%',
        translateY: '-50%',
        width: '92%',
        height: '94%',
        borderRadius: 24,
        background: cardBg,
        border: '3px solid #FCD34D',
        boxShadow: isDark
          ? '0 20px 60px rgba(0,0,0,0.6)'
          : '0 20px 60px rgba(168, 85, 247, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        padding: 20,
        zIndex: 3,
        cursor: exitDir ? 'default' : 'grab',
      }}
      whileTap={{ cursor: exitDir ? 'default' : 'grabbing' }}
    >
      {/* Corner decorations */}
      <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 14, color: '#B45309', fontWeight: 'bold' }}>
        ✦
      </div>
      <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 14, color: '#B45309', fontWeight: 'bold' }}>
        ✦
      </div>

      {/* Quadrant tag */}
      <button
        onClick={onTapQuadrant}
        className="self-center mt-2"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{
            background: `${meta.color}22`,
            border: `1px solid ${meta.color}55`,
          }}
        >
          <span className="text-[9px] font-extrabold tracking-[2px] uppercase" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </div>
      </button>

      {/* Big emoji */}
      <div className="flex-1 flex items-center justify-center">
        <div style={{ fontSize: 72, lineHeight: 1 }}>{meta.emoji}</div>
      </div>

      {/* Task title */}
      <div className="text-center px-3 pb-2">
        <div
          className="text-[20px] font-black tracking-tight leading-tight mb-2"
          style={{ color: isDark ? '#FEF3C7' : '#451A03' }}
        >
          {task.title}
        </div>
        {task.description && (
          <p
            className="text-[12px] font-medium leading-tight mt-1"
            style={{ color: isDark ? '#C4B5FD' : '#92400E' }}
          >
            {task.description}
          </p>
        )}
      </div>

      {/* Bottom corner decorations */}
      <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 14, color: '#B45309', fontWeight: 'bold' }}>
        ✦
      </div>
      <div style={{ position: 'absolute', bottom: 10, right: 12, fontSize: 14, color: '#B45309', fontWeight: 'bold' }}>
        ✦
      </div>
    </motion.div>
  );
};

// ============ BURST FEEDBACK ============
const BurstFeedback: React.FC<{ type: ExitDir }> = ({ type }) => {
  if (!type) return null;

  const config = {
    complete: { emoji: '✓', color: '#10B981', text: 'DONE!' },
    delete:   { emoji: '🗑️', color: '#F43F5E', text: 'DELETED' },
    defer:    { emoji: '↻', color: '#FBBF24', text: 'DEFERRED' },
  }[type];

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 50 }}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: -20 }}
        animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0.9], rotate: 0 }}
        exit={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          fontSize: 120,
          lineHeight: 1,
          color: config.color,
          filter: `drop-shadow(0 0 30px ${config.color}88)`,
          fontWeight: 900,
        }}
      >
        {config.emoji}
      </motion.div>
      <motion.div
        initial={{ y: 0, opacity: 0 }}
        animate={{ y: -60, opacity: [0, 1, 0] }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          fontSize: 18,
          fontWeight: 900,
          letterSpacing: 2,
          color: config.color,
        }}
      >
        {config.text}
      </motion.div>
    </div>
  );
};
