import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

// ─────────────────────────────────────────────────────────────
//   CONSTANTS
// ─────────────────────────────────────────────────────────────

/** 8 hand-picked swatches that look good in light + dark mode. */
const COLOR_SWATCHES = [
  '#6366f1', // indigo  — default
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f59e0b', // amber
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#64748b', // slate
];

const EMOJI_OPTIONS = ['📁', '🎯', '📋', '🗂️', '🚀', '✨', '💼', '🎨', '🏠', '📚'];

const DEFAULT_COLOR = '#6366f1';
const DEFAULT_EMOJI = '📁';
const MAX_NAME_LENGTH = 50;

// ─────────────────────────────────────────────────────────────
//   TYPES
// ─────────────────────────────────────────────────────────────

/** The 3 fields the modal collects. App.tsx owns id/createdAt/updatedAt. */
export type ProjectFormData = {
  name: string;
  emoji: string;
  color: string;
};

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectFormData) => void;
  /** If provided, the modal opens in edit mode with these values pre-filled. */
  existing?: Project | null;
}

type LocalLang = 'en' | 'fr' | 'ar';

// ─────────────────────────────────────────────────────────────
//   COPY
// ─────────────────────────────────────────────────────────────

const COPY: Record<LocalLang, {
  createTitle: string;
  editTitle: string;
  nameLabel: string;
  namePlaceholder: string;
  colorLabel: string;
  emojiLabel: string;
  cancel: string;
  save: string;
  saveChanges: string;
}> = {
  en: {
    createTitle: 'New Project',
    editTitle: 'Edit Project',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. Work, Health, Reading…',
    colorLabel: 'Color',
    emojiLabel: 'Emoji',
    cancel: 'Cancel',
    save: 'Create Project',
    saveChanges: 'Save Changes',
  },
  fr: {
    createTitle: 'Nouveau projet',
    editTitle: 'Modifier le projet',
    nameLabel: 'Nom',
    namePlaceholder: 'ex. Travail, Santé, Lecture…',
    colorLabel: 'Couleur',
    emojiLabel: 'Émoji',
    cancel: 'Annuler',
    save: 'Créer le projet',
    saveChanges: 'Enregistrer',
  },
  ar: {
    createTitle: 'مشروع جديد',
    editTitle: 'تعديل المشروع',
    nameLabel: 'الاسم',
    namePlaceholder: 'مثال: العمل، الصحة، القراءة…',
    colorLabel: 'اللون',
    emojiLabel: 'الرمز',
    cancel: 'إلغاء',
    save: 'إنشاء المشروع',
    saveChanges: 'حفظ التغييرات',
  },
};

// ─────────────────────────────────────────────────────────────
//   COMPONENT
// ─────────────────────────────────────────────────────────────

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existing,
}) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const isEditMode = !!existing;

  // ── Form state ──
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Sync form state whenever the sheet opens ──
  useEffect(() => {
    if (!isOpen) return;
    if (existing) {
      setName(existing.name);
      setColor(existing.color || DEFAULT_COLOR);
      setEmoji(existing.emoji || DEFAULT_EMOJI);
    } else {
      setName('');
      setColor(DEFAULT_COLOR);
      setEmoji(DEFAULT_EMOJI);
    }
    // Auto-focus the name field (after the slide-up animation starts)
    const t = setTimeout(() => inputRef.current?.focus(), 220);
    return () => clearTimeout(t);
  }, [isOpen, existing]);

  // ── Escape key closes ──
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        triggerHaptic('light');
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0;

  // ── Actions ──
  const handleSave = () => {
    if (!canSave) return;
    triggerHaptic('medium');
    onSave({ name: trimmedName, emoji, color });
    onClose();
  };

  const handleCancel = () => {
    triggerHaptic('light');
    onClose();
  };

  const handlePickColor = (c: string) => {
    triggerHaptic('light');
    setColor(c);
  };

  const handlePickEmoji = (e: string) => {
    triggerHaptic('light');
    setEmoji(e);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canSave) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-xs"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-0 left-0 right-0 z-[71] rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col"
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 pt-2 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={handleCancel}
                className="p-1.5 -ml-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label={copy.cancel}
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                {isEditMode ? copy.editTitle : copy.createTitle}
              </h2>
              <div className="w-8" />
            </div>

            {/* Body — scrollable */}
            <div className="overflow-y-auto px-5 py-5 space-y-6">
              {/* ── Hero preview circle ── */}
              <div className="flex justify-center">
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="w-[88px] h-[88px] rounded-3xl flex items-center justify-center text-4xl shadow-lg"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 12px 32px -8px ${color}80`,
                  }}
                >
                  <span className="drop-shadow-sm">{emoji}</span>
                </motion.div>
              </div>

              {/* ── Name field ── */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-2">
                  {copy.nameLabel}
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
                  onKeyDown={handleNameKeyDown}
                  placeholder={copy.namePlaceholder}
                  maxLength={MAX_NAME_LENGTH}
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-[15px] font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition"
                />
                {name.length > 0 && (
                  <div className="text-right text-[10px] text-slate-400 dark:text-slate-500 mt-1 tabular-nums">
                    {name.length}/{MAX_NAME_LENGTH}
                  </div>
                )}
              </div>

              {/* ── Color swatches ── */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-2">
                  {copy.colorLabel}
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {COLOR_SWATCHES.map((c) => {
                    const isSelected = color === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handlePickColor(c)}
                        aria-label={`Color ${c}`}
                        className={`relative w-10 h-10 rounded-xl transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-900 dark:ring-white scale-105'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="w-5 h-5 drop-shadow"
                              fill="none"
                              stroke="white"
                              strokeWidth={3}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Emoji picker ── */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-2">
                  {copy.emojiLabel}
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((e) => {
                    const isSelected = emoji === e;
                    return (
                      <button
                        key={e}
                        type="button"
                        onClick={() => handlePickEmoji(e)}
                        aria-label={`Emoji ${e}`}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer border ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 scale-105'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {e}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer — Cancel + Save */}
            <div className="px-5 pt-3 pb-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-black tracking-tight hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-black tracking-tight transition ${
                  canSave
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 cursor-pointer'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                {isEditMode ? copy.saveChanges : copy.save}
              </button>
            </div>

            {/* Safe area spacer */}
            <div style={{ height: 'env(safe-area-inset-bottom)' }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};