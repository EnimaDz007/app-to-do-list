import React, { useState } from 'react';
import { Check, Clock, Edit2, Trash2, Play, MoveRight, GripVertical } from 'lucide-react';
import { Task, QuadrantId } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../i18n/translations';

interface TaskCardProps {
  task: Task;
  onToggleStatus: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStartFocus?: (task: Task) => void;
  onMoveQuadrant?: (taskId: string, targetQuadrant: QuadrantId) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleStatus,
  onEditTask,
  onDeleteTask,
  onStartFocus,
  onMoveQuadrant,
}) => {
  const { t } = useLanguage();
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const isDone = task.status === 'completed';

  const categoryColors: Record<string, { bg: string; text: string }> = {
    Engineering: { bg: 'bg-indigo-50 dark:bg-indigo-500/15', text: 'text-indigo-600 dark:text-indigo-400' },
    Product: { bg: 'bg-sky-50 dark:bg-sky-500/15', text: 'text-sky-600 dark:text-sky-400' },
    Design: { bg: 'bg-purple-50 dark:bg-purple-500/15', text: 'text-purple-600 dark:text-purple-400' },
    Operations: { bg: 'bg-emerald-50 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' },
    Client: { bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' },
    Marketing: { bg: 'bg-rose-50 dark:bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400' },
    Personal: { bg: 'bg-teal-50 dark:bg-teal-500/15', text: 'text-teal-600 dark:text-teal-400' },
  };

  const catStyle = categoryColors[task.category] || {
    bg: 'bg-slate-100 dark:bg-slate-700/40',
    text: 'text-slate-600 dark:text-slate-300',
  };

  const categoryKey = `cat_${task.category}` as TranslationKey;
  const categoryLabel = t(categoryKey) || task.category;

  return (
    <div
      id={`task-card-${task.id}`}
      draggable={!isDone}
      onDragStart={(e) => {
        if (!isDone) {
          e.dataTransfer.setData('text/plain', task.id);
          e.dataTransfer.effectAllowed = 'move';
          triggerHaptic('light');
        }
      }}
      className={`group relative rounded-xl border p-3.5 transition-all ${
        isDone
          ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-60'
          : 'bg-white hover:bg-slate-50/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/60 shadow-xs cursor-grab active:cursor-grabbing'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Drag handle */}
        {!isDone && (
          <div className="mt-1 text-slate-300 dark:text-slate-600 hidden sm:block group-hover:text-slate-400 dark:group-hover:text-slate-400 transition cursor-grab">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Custom Checkbox */}
        <button
          id={`btn-toggle-task-${task.id}`}
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic(isDone ? 'light' : 'success');
            onToggleStatus(task.id);
          }}
          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
            isDone
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-400 dark:border-slate-500 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white dark:bg-slate-900/50'
          }`}
          aria-label={isDone ? 'Mark task incomplete' : 'Mark task completed'}
        >
          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4
              className={`text-xs sm:text-sm font-medium leading-snug break-words ${
                isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {task.title}
            </h4>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              {/* Focus Timer Button */}
              {onStartFocus && !isDone && (
                <button
                  id={`btn-focus-task-${task.id}`}
                  onClick={() => {
                    triggerHaptic('medium');
                    onStartFocus(task);
                  }}
                  className="p-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer"
                  title="Start Focus Timer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              )}

              {/* Quick Move to Quadrant Button */}
              {onMoveQuadrant && !isDone && (
                <div className="relative">
                  <button
                    id={`btn-move-task-${task.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      setIsMoveMenuOpen((prev) => !prev);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer"
                    title="Move to another quadrant"
                  >
                    <MoveRight className="w-3.5 h-3.5" />
                  </button>

                  {isMoveMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-30 text-[11px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-2.5 py-1 text-[9px] uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-700/60">
                        Move to
                      </div>
                      {(['do_first', 'schedule', 'delegate', 'eliminate'] as QuadrantId[]).map((qId) => {
                        if (qId === task.quadrant) return null;
                        const labels: Record<QuadrantId, string> = {
                          do_first: 'Do First',
                          schedule: 'Schedule',
                          delegate: 'Delegate',
                          eliminate: 'Eliminate',
                        };
                        return (
                          <button
                            key={qId}
                            onClick={() => {
                              triggerHaptic('medium');
                              onMoveQuadrant(task.id, qId);
                              setIsMoveMenuOpen(false);
                            }}
                            className="w-full text-left rtl:text-right px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                          >
                            {labels[qId]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <button
                id={`btn-edit-task-${task.id}`}
                onClick={() => {
                  triggerHaptic('light');
                  onEditTask(task);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer"
                title={t('card_edit')}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                id={`btn-delete-task-${task.id}`}
                onClick={() => {
                  triggerHaptic('heavy');
                  onDeleteTask(task.id);
                }}
                className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer"
                title={t('card_delete')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Badges footer */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span
              className={`px-1.5 py-0.5 rounded font-medium ${catStyle.bg} ${catStyle.text}`}
            >
              {categoryLabel}
            </span>

            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 font-mono">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{task.estimatedMinutes}m</span>
            </span>

            {task.impactScore && (
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-300 font-mono">
                Imp: {task.impactScore}/5
              </span>
            )}

            {task.status === 'in_progress' && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                {t('card_in_progress')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
