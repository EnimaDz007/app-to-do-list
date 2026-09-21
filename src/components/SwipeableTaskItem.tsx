import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { CheckCircle2, Pin, PinOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Task } from '../types';

interface SwipeableTaskItemProps {
  task: Task;
  categoryColor: string;
  categoryLight: string;
  categoryPale: string;
  categoryGradient: string;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onTogglePin: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

const SWIPE_THRESHOLD = 100;

export const SwipeableTaskItem: React.FC<SwipeableTaskItemProps> = ({
  task,
  categoryColor,
  categoryLight,
  categoryPale,
  categoryGradient,
  onComplete,
  onDelete,
  onTogglePin,
  onToggleSubtask,
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-6, 6]);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const isDragging = useRef(false);

  const subtasks = task.subtasks || [];
  const doneSubtasks = subtasks.filter((s) => s.done).length;

  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      setIsRemoving(true);
      setTimeout(() => onComplete(task.id), 300);
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      setIsRemoving(true);
      setTimeout(() => onDelete(task.id), 300);
    }
  };

  const handleClick = () => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }
    if (subtasks.length > 0) {
      setShowSubtasks((prev) => !prev);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={
        isRemoving
          ? { opacity: 0, scale: 0.7, x: 0 }
          : { opacity: 1, y: 0 }
      }
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-2xl overflow-hidden mb-2"
      style={{
        background: `linear-gradient(90deg, ${categoryColor} 0%, ${categoryLight} 100%)`,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-between px-6 text-white font-black text-xs uppercase tracking-widest pointer-events-none">
        <span>✓ Complete</span>
        <span>Delete 🗑️</span>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={handleDragEnd}
        style={{ x, rotate }}
        whileTap={{ scale: 0.99 }}
        onClick={handleClick}
        onPointerDown={() => { isDragging.current = false; }}
        className="relative rounded-2xl p-3.5 cursor-grab active:cursor-grabbing select-none"
      >
        <div
          className="rounded-2xl p-3.5"
          style={{
            background: task.pinned ? `linear-gradient(135deg, #FFFBEB, #FFFFFF)` : '#FFFFFF',
            border: task.pinned ? '1px solid #FCD34D' : '1px solid #F1F5F9',
            boxShadow: '0 4px 16px rgba(139,92,246,0.06)',
          }}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRemoving(true);
                setTimeout(() => onComplete(task.id), 250);
              }}
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90"
              style={{
                borderColor: task.status === 'completed' ? categoryColor : '#CBD5E1',
                background: task.status === 'completed' ? categoryGradient : 'transparent',
                color: 'white',
              }}
            >
              {task.status === 'completed' && <CheckCircle2 size={14} />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold leading-snug ${
                    task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'
                  }`}
                >
                  {task.title}
                </span>
                {task.pinned && <Pin size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
              </div>

              {subtasks.length > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: categoryPale, color: categoryColor }}
                  >
                    📋 {doneSubtasks} / {subtasks.length}
                  </span>
                  {showSubtasks ? (
                    <ChevronUp size={12} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={12} className="text-slate-400" />
                  )}
                </div>
              )}

              {showSubtasks && subtasks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dashed border-slate-200 flex flex-col gap-1.5">
                  {subtasks.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSubtask(task.id, sub.id);
                      }}
                      className="flex items-center gap-2 text-left"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded flex items-center justify-center text-white text-[9px] shrink-0"
                        style={{
                          background: sub.done ? '#10B981' : 'transparent',
                          border: sub.done ? 'none' : '1.5px solid #CBD5E1',
                        }}
                      >
                        {sub.done && '✓'}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          sub.done ? 'text-slate-400 line-through' : 'text-slate-600'
                        }`}
                      >
                        {sub.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(task.id);
              }}
              className="shrink-0 p-1.5 rounded-lg transition-colors active:scale-90"
              style={{ color: task.pinned ? '#F59E0B' : '#CBD5E1' }}
            >
              {task.pinned ? <Pin size={14} fill="currentColor" /> : <PinOff size={14} />}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
