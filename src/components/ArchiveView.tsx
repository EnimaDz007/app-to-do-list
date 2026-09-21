import React from 'react';
import { motion } from 'framer-motion';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { Task } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ArchiveViewProps {
  tasks: Task[];
  onRestore: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  tasks,
  onRestore,
  onDelete,
}) => {
  const { t } = useLanguage();

  const archivedTasks = tasks.filter((task) => task.archivedAt);
  const thisWeekTasks = archivedTasks.filter((task) => {
    if (!task.archivedAt) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(task.archivedAt) >= weekAgo;
  });

  const avgPerDay = thisWeekTasks.length > 0 ? (thisWeekTasks.length / 7).toFixed(1) : '0';

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[#FDFBFF] to-[#F5F3FF] pb-32">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/60 bg-white/80 backdrop-blur-xl px-3 py-1">
          <span className="text-[9px] font-extrabold tracking-[2px] uppercase text-violet-600">
            {t('tab_archive') || 'ARCHIVE'}
          </span>
        </div>
        <h1 className="mt-3 text-[28px] font-extrabold tracking-tight text-slate-900 leading-none">
          Your{' '}
          <em
            className="font-normal italic"
            style={{
              fontFamily: "'Instrument Serif', serif",
              background: 'linear-gradient(135deg, #7C3AED, #6366F1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            archive
          </em>
        </h1>
      </div>

      {/* Stats */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          <div className="flex-1 rounded-2xl bg-white border border-slate-100 shadow-sm p-3 text-center">
            <div className="text-2xl font-black text-violet-600 leading-none">
              {archivedTasks.length}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Total Done
            </div>
          </div>
          <div className="flex-1 rounded-2xl bg-white border border-slate-100 shadow-sm p-3 text-center">
            <div className="text-2xl font-black text-emerald-600 leading-none">
              {thisWeekTasks.length}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              This Week
            </div>
          </div>
          <div className="flex-1 rounded-2xl bg-white border border-slate-100 shadow-sm p-3 text-center">
            <div className="text-2xl font-black text-indigo-600 leading-none">
              {avgPerDay}
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Avg / Day
            </div>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="px-4">
        {archivedTasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-violet-50 mb-4">
              <Archive className="w-9 h-9 text-violet-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500">
              {t('archive_empty') || 'No archived tasks yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {t('archive_empty_desc') || 'Completed tasks will appear here'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {archivedTasks
              .sort((a, b) => {
                const dateA = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
                const dateB = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
                return dateB - dateA;
              })
              .map((task, idx) => {
                const archivedDate = task.archivedAt
                  ? new Date(task.archivedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex items-center gap-3 rounded-2xl bg-white border border-slate-100 p-3.5 shadow-sm"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-400 line-through truncate">
                        {task.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {archivedDate}
                      </div>
                    </div>

                    <button
                      onClick={() => onRestore(task.id)}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-600 transition-colors active:scale-90"
                      title={t('archive_restore') || 'Restore'}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDelete(task.id)}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-600 transition-colors active:scale-90"
                      title={t('archive_delete') || 'Delete forever'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
