import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { Task } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

interface ArchiveViewProps {
  tasks: Task[];
  onRestore: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  /** Soft-deletes every archived task at once. */
  onClearAll: () => void;
}

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  locale: string;
  badge: string;
  yourLabel: string;
  archiveWord: string;
  totalDone: string;
  thisWeek: string;
  avgPerDay: string;
  emptyTitle: string;
  emptyDesc: string;
  restore: string;
  deleteForever: string;
  clearAll: string;
  clearAllConfirmTitle: string;
  clearAllConfirmBody: (count: number) => string;
  cancel: string;
  confirmClear: string;
}> = {
  en: {
    locale: 'en-US',
    badge: 'ARCHIVE',
    yourLabel: 'Your',
    archiveWord: 'archive',
    totalDone: 'Total Done',
    thisWeek: 'This Week',
    avgPerDay: 'Avg / Day',
    emptyTitle: 'No archived tasks yet',
    emptyDesc: 'Completed tasks will appear here',
    restore: 'Restore',
    deleteForever: 'Delete forever',
    clearAll: 'Clear all',
    clearAllConfirmTitle: 'Delete all archived tasks?',
    clearAllConfirmBody: (count) =>
      `This will delete ${count} archived task${count === 1 ? '' : 's'}. You can't undo this from the app, but archived tasks auto-clean after 30 days anyway.`,
    cancel: 'Cancel',
    confirmClear: 'Clear all',
  },
  fr: {
    locale: 'fr-FR',
    badge: 'ARCHIVES',
    yourLabel: 'Vos',
    archiveWord: 'archives',
    totalDone: 'Total terminées',
    thisWeek: 'Cette semaine',
    avgPerDay: 'Moy. / jour',
    emptyTitle: 'Aucune tâche archivée',
    emptyDesc: 'Les tâches terminées apparaîtront ici',
    restore: 'Restaurer',
    deleteForever: 'Supprimer définitivement',
    clearAll: 'Tout supprimer',
    clearAllConfirmTitle: 'Supprimer toutes les tâches archivées ?',
    clearAllConfirmBody: (count) =>
      `Cela supprimera ${count} tâche${count === 1 ? '' : 's'} archivée${count === 1 ? '' : 's'}. Action irréversible depuis l’app, mais les tâches archivées sont nettoyées automatiquement après 30 jours.`,
    cancel: 'Annuler',
    confirmClear: 'Tout supprimer',
  },
  ar: {
    locale: 'ar-EG',
    badge: 'الأرشيف',
    yourLabel: 'أرشيفك',
    archiveWord: '',
    totalDone: 'إجمالي المنجزة',
    thisWeek: 'هذا الأسبوع',
    avgPerDay: 'المعدل / يوم',
    emptyTitle: 'لا توجد مهام مؤرشفة بعد',
    emptyDesc: 'ستظهر المهام المكتملة هنا',
    restore: 'استعادة',
    deleteForever: 'حذف نهائي',
    clearAll: 'حذف الكل',
    clearAllConfirmTitle: 'حذف جميع المهام المؤرشفة؟',
    clearAllConfirmBody: (count) =>
      `سيتم حذف ${count} مهمة مؤرشفة. لا يمكن التراجع من التطبيق، لكن يتم تنظيف المهام المؤرشفة تلقائياً بعد 30 يوماً.`,
    cancel: 'إلغاء',
    confirmClear: 'حذف الكل',
  },
};

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  tasks,
  onRestore,
  onDelete,
  onClearAll,
}) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;
  const isRtl = lang === 'ar';

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const archivedTasks = tasks.filter((task) => task.archivedAt);
  const thisWeekTasks = archivedTasks.filter((task) => {
    if (!task.archivedAt) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(task.archivedAt) >= weekAgo;
  });

  const avgPerDay = thisWeekTasks.length > 0 ? (thisWeekTasks.length / 7).toFixed(1) : '0';

  const handleClearAll = () => {
    triggerHaptic('heavy');
    onClearAll();
    setShowClearConfirm(false);
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="w-full min-h-screen bg-gradient-to-b from-[#FDFBFF] to-[#F5F3FF] dark:from-[#0F172A] dark:to-[#1E1B4B] pb-32">
      {/* Header */}
      <div className="relative px-6 pt-6 pb-4 text-center">
        {/* Clear all — top corner */}
        {archivedTasks.length > 0 && (
          <button
            onClick={() => {
              triggerHaptic('medium');
              setShowClearConfirm(true);
            }}
            className="absolute top-6 end-4 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold hover:bg-rose-100 dark:hover:bg-rose-950/60 transition cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>{copy.clearAll}</span>
          </button>
        )}

        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/60 dark:border-violet-500/40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl px-3 py-1">
          <span className="text-[9px] font-extrabold tracking-[2px] uppercase text-violet-600 dark:text-violet-300">
            {copy.badge}
          </span>
        </div>
        <h1 className="mt-3 text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
          {copy.yourLabel}
          {copy.archiveWord && (
            <>
              {' '}
              <em
                className="font-normal italic"
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  backgroundImage: 'linear-gradient(135deg, #7C3AED, #6366F1)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {copy.archiveWord}
              </em>
            </>
          )}
        </h1>
      </div>

      {/* Stats */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          <div className="flex-1 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm p-3 text-center">
            <div className="text-2xl font-black text-violet-600 dark:text-violet-400 leading-none">
              {archivedTasks.length}
            </div>
            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
              {copy.totalDone}
            </div>
          </div>
          <div className="flex-1 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm p-3 text-center">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
              {thisWeekTasks.length}
            </div>
            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
              {copy.thisWeek}
            </div>
          </div>
          <div className="flex-1 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm p-3 text-center">
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
              {avgPerDay}
            </div>
            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
              {copy.avgPerDay}
            </div>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="px-4">
        {archivedTasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-950/40 mb-4">
              <Archive className="w-9 h-9 text-violet-400 dark:text-violet-500" />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {copy.emptyTitle}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {copy.emptyDesc}
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
                  ? new Date(task.archivedAt).toLocaleDateString(copy.locale, {
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
                    className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3.5 shadow-sm"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0 text-start">
                      <div className="text-sm font-semibold text-slate-400 dark:text-slate-500 line-through truncate">
                        {task.title}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {archivedDate}
                      </div>
                    </div>

                    <button
                      onClick={() => onRestore(task.id)}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-violet-100 dark:hover:bg-violet-950/60 hover:text-violet-600 dark:hover:text-violet-300 transition-colors active:scale-90 cursor-pointer"
                      title={copy.restore}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDelete(task.id)}
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-300 transition-colors active:scale-90 cursor-pointer"
                      title={copy.deleteForever}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      {/* Clear-all confirmation modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-5"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              dir={isRtl ? 'rtl' : 'ltr'}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 shadow-2xl p-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-base font-black text-rose-700 dark:text-rose-400 tracking-tight text-center mb-2">
                {copy.clearAllConfirmTitle}
              </h3>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-5">
                {copy.clearAllConfirmBody(archivedTasks.length)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {copy.cancel}
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-black shadow-lg shadow-rose-600/20 transition cursor-pointer"
                >
                  {copy.confirmClear}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};