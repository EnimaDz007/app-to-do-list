import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckSquare, Folder, ArrowRightLeft, Trash2, AlertTriangle, ChevronLeft,
} from 'lucide-react';
import { Project, QuadrantId } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

type LocalLang = 'en' | 'fr' | 'ar';

interface BulkActionBarProps {
  isOpen: boolean;
  selectedCount: number;
  projects: Project[];
  onClose: () => void;
  onComplete: () => void;
  onDelete: () => void;
  onMoveToProject: (projectId: string | null) => void;
  onMoveQuadrant: (quadrant: QuadrantId) => void;
}

const QUADRANT_META: Record<QuadrantId, { emoji: string; color: string }> = {
  do_first:  { emoji: '🔥', color: '#E11D48' },
  schedule:  { emoji: '📅', color: '#4F46E5' },
  delegate:  { emoji: '👥', color: '#059669' },
  eliminate: { emoji: '🗑️', color: '#64748B' },
};

const COPY: Record<LocalLang, {
  selected: (n: number) => string;
  complete: string;
  moveProject: string;
  moveQuadrant: string;
  delete: string;
  cancel: string;
  chooseProject: string;
  noProject: string;
  chooseQuadrant: string;
  confirmTitle: (n: number) => string;
  confirmBody: string;
  confirmDelete: string;
  quadrants: Record<QuadrantId, string>;
}> = {
  en: {
    selected: (n) => `${n} selected`,
    complete: 'Complete',
    moveProject: 'Move to project',
    moveQuadrant: 'Move quadrant',
    delete: 'Delete',
    cancel: 'Cancel',
    chooseProject: 'Choose a project',
    noProject: 'None',
    chooseQuadrant: 'Choose a quadrant',
    confirmTitle: (n) => `Delete ${n} task${n === 1 ? '' : 's'}?`,
    confirmBody: 'This can be undone from the Archive for a short time.',
    confirmDelete: 'Delete',
    quadrants: { do_first: 'Do First', schedule: 'Schedule', delegate: 'Delegate', eliminate: 'Eliminate' },
  },
  fr: {
    selected: (n) => `${n} sélectionnée${n === 1 ? '' : 's'}`,
    complete: 'Terminer',
    moveProject: 'Déplacer vers un projet',
    moveQuadrant: 'Changer de quadrant',
    delete: 'Supprimer',
    cancel: 'Annuler',
    chooseProject: 'Choisir un projet',
    noProject: 'Aucun',
    chooseQuadrant: 'Choisir un quadrant',
    confirmTitle: (n) => `Supprimer ${n} tâche${n === 1 ? '' : 's'} ?`,
    confirmBody: 'Vous pourrez les restaurer depuis les Archives pendant un moment.',
    confirmDelete: 'Supprimer',
    quadrants: { do_first: 'À faire', schedule: 'Planifier', delegate: 'Déléguer', eliminate: 'Éliminer' },
  },
  ar: {
    selected: (n) => `${n} محددة`,
    complete: 'إكمال',
    moveProject: 'نقل إلى مشروع',
    moveQuadrant: 'تغيير الربع',
    delete: 'حذف',
    cancel: 'إلغاء',
    chooseProject: 'اختر مشروعاً',
    noProject: 'بدون',
    chooseQuadrant: 'اختر ربعاً',
    confirmTitle: (n) => `حذف ${n} مهمة؟`,
    confirmBody: 'يمكن التراجع من الأرشيف لفترة قصيرة.',
    confirmDelete: 'حذف',
    quadrants: { do_first: 'ابدأ به فوراً', schedule: 'جدولة وتخطيط', delegate: 'تفويض', eliminate: 'استبعاد وإلغاء' },
  },
};

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  isOpen,
  selectedCount,
  projects,
  onClose,
  onComplete,
  onDelete,
  onMoveToProject,
  onMoveQuadrant,
}) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;
  const isRtl = lang === 'ar';

  const [pickerMode, setPickerMode] = useState<'project' | 'quadrant' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const closeAll = () => {
    setPickerMode(null);
    setConfirmDelete(false);
    triggerHaptic('light');
    onClose();
  };

  const visibleProjects = projects.filter((p) => !p.deletedAt && !p.archivedAt);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Primary action bar ── */}
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            dir={isRtl ? 'rtl' : 'ltr'}
            className="fixed left-3 right-3 bottom-24 z-[95] rounded-2xl bg-slate-900 dark:bg-slate-800 border border-slate-700 shadow-2xl"
          >
            {/* Header strip */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/70">
              <span className="text-[12px] font-black text-white tracking-tight tabular-nums">
                {copy.selected(selectedCount)}
              </span>
              <button
                onClick={closeAll}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                aria-label={copy.cancel}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="p-2 flex items-center gap-1.5">
              <button
                onClick={() => {
                  triggerHaptic('success');
                  onComplete();
                  closeAll();
                }}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl hover:bg-slate-700/60 transition cursor-pointer"
              >
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-200">{copy.complete}</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setPickerMode('project');
                }}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl hover:bg-slate-700/60 transition cursor-pointer"
              >
                <Folder className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-bold text-slate-200">{copy.moveProject}</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setPickerMode('quadrant');
                }}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl hover:bg-slate-700/60 transition cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-200">{copy.moveQuadrant}</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setConfirmDelete(true);
                }}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl hover:bg-red-500/20 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-bold text-red-300">{copy.delete}</span>
              </button>
            </div>
          </motion.div>

          {/* ── Project picker sheet ── */}
          <AnimatePresence>
            {pickerMode === 'project' && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setPickerMode(null)}
                  className="fixed inset-0 z-[96] bg-slate-950/60 backdrop-blur-xs"
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  onClick={(e) => e.stopPropagation()}
                  dir={isRtl ? 'rtl' : 'ltr'}
                  className="fixed bottom-0 left-0 right-0 z-[97] rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[70vh] flex flex-col"
                >
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  </div>
                  <div className="flex items-center justify-between px-5 pb-3 pt-2 border-b border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => { triggerHaptic('light'); setPickerMode(null); }}
                      className="p-1.5 -ms-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer rtl:rotate-180"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                      {copy.chooseProject}
                    </h2>
                    <div className="w-8" />
                  </div>
                  <div className="overflow-y-auto p-3 space-y-1.5">
                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        onMoveToProject(null);
                        setPickerMode(null);
                        closeAll();
                      }}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer text-start"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <X className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {copy.noProject}
                      </div>
                    </button>
                    {visibleProjects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          triggerHaptic('medium');
                          onMoveToProject(p.id);
                          setPickerMode(null);
                          closeAll();
                        }}
                        className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer text-start"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{ backgroundColor: p.color }}
                        >
                          <span className="drop-shadow-sm">{p.emoji}</span>
                        </div>
                        <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {p.name}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div style={{ height: 'env(safe-area-inset-bottom)' }} />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ── Quadrant picker sheet ── */}
          <AnimatePresence>
            {pickerMode === 'quadrant' && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setPickerMode(null)}
                  className="fixed inset-0 z-[96] bg-slate-950/60 backdrop-blur-xs"
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  onClick={(e) => e.stopPropagation()}
                  dir={isRtl ? 'rtl' : 'ltr'}
                  className="fixed bottom-0 left-0 right-0 z-[97] rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl"
                >
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  </div>
                  <div className="flex items-center justify-between px-5 pb-3 pt-2 border-b border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => { triggerHaptic('light'); setPickerMode(null); }}
                      className="p-1.5 -ms-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer rtl:rotate-180"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                      {copy.chooseQuadrant}
                    </h2>
                    <div className="w-8" />
                  </div>
                  <div className="p-3 space-y-1.5">
                    {(['do_first', 'schedule', 'delegate', 'eliminate'] as QuadrantId[]).map((q) => {
                      const meta = QUADRANT_META[q];
                      return (
                        <button
                          key={q}
                          onClick={() => {
                            triggerHaptic('medium');
                            onMoveQuadrant(q);
                            setPickerMode(null);
                            closeAll();
                          }}
                          className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer text-start"
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                            style={{ backgroundColor: meta.color }}
                          >
                            <span className="drop-shadow-sm">{meta.emoji}</span>
                          </div>
                          <div className="text-sm font-black text-slate-900 dark:text-white">
                            {copy.quadrants[q]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ height: 'env(safe-area-inset-bottom)' }} />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ── Delete confirm ── */}
          <AnimatePresence>
            {confirmDelete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[98] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-5"
                onClick={() => setConfirmDelete(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  onClick={(e) => e.stopPropagation()}
                  dir={isRtl ? 'rtl' : 'ltr'}
                  className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
                >
                  <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight text-center mb-2">
                    {copy.confirmTitle(selectedCount)}
                  </h3>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-5">
                    {copy.confirmBody}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { triggerHaptic('light'); setConfirmDelete(false); }}
                      className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      {copy.cancel}
                    </button>
                    <button
                      onClick={() => {
                        triggerHaptic('heavy');
                        onDelete();
                        setConfirmDelete(false);
                        closeAll();
                      }}
                      className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-black shadow-lg shadow-red-600/20 transition cursor-pointer"
                    >
                      {copy.confirmDelete}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};