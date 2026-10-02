import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Target, Plus, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Milestone } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { LocalizedDateInput } from './LocalizedDateInput';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestones: Milestone[];
  onSaveMilestone: (milestone: Milestone) => void;
  onDeleteMilestone: (id: string) => void;
}

const EMOJI_CHOICES = ['🎯', '🚀', '🎉', '🏆', '💡', '🌟', '❤️', '🔥', '📌', '⭐', '🎓', '💪'];
const COLOR_CHOICES = ['#4F46E5', '#E11D48', '#059669', '#F59E0B', '#7C3AED', '#0EA5E9', '#64748B', '#EC4899'];

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  title: string;
  subtitle: string;
  activeHeading: string;
  overdue: string;
  daysLeft: string;
  editHeading: string;
  newHeading: string;
  iconLabel: string;
  nameLabel: string;
  namePlaceholder: string;
  targetDateLabel: string;
  colorLabel: string;
  colorAria: string;
  editTitle: string;
  deleteTitle: string;
  cancelEdit: string;
  saveChanges: string;
  addMilestone: string;
  errNoName: string;
  errNoDate: string;
  errBadDate: string;
  confirmDelete: string;
  locale: string;
}> = {
  en: {
    title: 'Milestones',
    subtitle: 'Count down to what matters',
    activeHeading: 'Active ({count})',
    overdue: '{n}d overdue',
    daysLeft: '{n}d left',
    editHeading: 'Edit milestone',
    newHeading: 'New milestone',
    iconLabel: 'Icon',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. Launch Day',
    targetDateLabel: 'Target date',
    colorLabel: 'Color',
    colorAria: 'Color {c}',
    editTitle: 'Edit',
    deleteTitle: 'Delete',
    cancelEdit: 'Cancel edit',
    saveChanges: 'Save changes',
    addMilestone: 'Add milestone',
    errNoName: 'Give your milestone a name.',
    errNoDate: 'Pick a target date.',
    errBadDate: 'Invalid date.',
    confirmDelete: 'Delete this milestone?',
    locale: 'en-US',
  },
  fr: {
    title: 'Jalons',
    subtitle: 'Comptez les jours vers l’essentiel',
    activeHeading: 'Actifs ({count})',
    overdue: 'En retard de {n} j',
    daysLeft: '{n} j restants',
    editHeading: 'Modifier le jalon',
    newHeading: 'Nouveau jalon',
    iconLabel: 'Icône',
    nameLabel: 'Nom',
    namePlaceholder: 'ex. Jour de lancement',
    targetDateLabel: 'Date cible',
    colorLabel: 'Couleur',
    colorAria: 'Couleur {c}',
    editTitle: 'Modifier',
    deleteTitle: 'Supprimer',
    cancelEdit: 'Annuler',
    saveChanges: 'Enregistrer',
    addMilestone: 'Ajouter un jalon',
    errNoName: 'Donnez un nom à votre jalon.',
    errNoDate: 'Choisissez une date cible.',
    errBadDate: 'Date invalide.',
    confirmDelete: 'Supprimer ce jalon ?',
    locale: 'fr-FR',
  },
  ar: {
    title: 'الإنجازات',
    subtitle: 'عُدّ الأيام نحو ما يهم',
    activeHeading: 'النشطة ({count})',
    overdue: 'متأخر {n} يوم',
    daysLeft: 'باقٍ {n} يوم',
    editHeading: 'تعديل الإنجاز',
    newHeading: 'إنجاز جديد',
    iconLabel: 'الأيقونة',
    nameLabel: 'الاسم',
    namePlaceholder: 'مثال: يوم الإطلاق',
    targetDateLabel: 'التاريخ المستهدف',
    colorLabel: 'اللون',
    colorAria: 'اللون {c}',
    editTitle: 'تعديل',
    deleteTitle: 'حذف',
    cancelEdit: 'إلغاء التعديل',
    saveChanges: 'حفظ التغييرات',
    addMilestone: 'إضافة إنجاز',
    errNoName: 'أعطِ الإنجاز اسماً.',
    errNoDate: 'اختر تاريخاً مستهدفاً.',
    errBadDate: 'تاريخ غير صالح.',
    confirmDelete: 'حذف هذا الإنجاز؟',
    locale: 'ar-EG',
  },
};

function dateToLocalInputString(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  isOpen, onClose, milestones, onSaveMilestone, onDeleteMilestone,
}) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;
  const isRtl = lang === 'ar';

  const [editing, setEditing] = useState<Milestone | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#4F46E5');

  useEffect(() => {
    if (!isOpen) return;
    setEditing(null);
    resetForm();
    // eslint-disable-next-line
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setEmoji('🎯');
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setTargetDate(dateToLocalInputString(defaultDate));
    setColor('#4F46E5');
  };

  if (!isOpen) return null;

  const activeMilestones = milestones.filter((m) => !m.archivedAt);

  const handleEdit = (m: Milestone) => {
    triggerHaptic('light');
    setEditing(m);
    setName(m.name);
    setEmoji(m.emoji);
    setTargetDate(dateToLocalInputString(new Date(m.targetDate)));
    setColor(m.color);
  };

  const handleCancelEdit = () => {
    triggerHaptic('light');
    setEditing(null);
    resetForm();
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert(copy.errNoName);
      return;
    }
    if (!targetDate) {
      alert(copy.errNoDate);
      return;
    }
    const target = new Date(targetDate);
    if (isNaN(target.getTime())) {
      alert(copy.errBadDate);
      return;
    }

    triggerHaptic('success');
    const milestone: Milestone = {
      id: editing?.id || `milestone-${Date.now()}`,
      name: name.trim().slice(0, 40),
      emoji,
      targetDate: target.toISOString(),
      color,
      createdAt: editing?.createdAt || new Date().toISOString(),
    };
    onSaveMilestone(milestone);
    setEditing(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(copy.confirmDelete)) return;
    triggerHaptic('medium');
    onDeleteMilestone(id);
    if (editing?.id === id) {
      setEditing(null);
      resetForm();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            dir={isRtl ? 'rtl' : 'ltr'}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-[61] w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div className="text-start">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {copy.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {copy.subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {activeMilestones.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {copy.activeHeading.replace('{count}', String(activeMilestones.length))}
                  </h4>
                  {activeMilestones.map((m) => {
                    const days = Math.ceil((new Date(m.targetDate).getTime() - Date.now()) / 86400000);
                    const overdue = days < 0;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                          style={{ backgroundColor: `${m.color}22` }}
                        >
                          {m.emoji}
                        </div>
                        <div className="flex-1 min-w-0 text-start">
                          <div className="text-[12px] font-bold text-slate-800 dark:text-slate-200 truncate">
                            {m.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {new Date(m.targetDate).toLocaleDateString(copy.locale, {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                            {' · '}
                            <span style={{ color: m.color }} className="font-bold">
                              {overdue
                                ? copy.overdue.replace('{n}', String(Math.abs(days)))
                                : copy.daysLeft.replace('{n}', String(days))}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleEdit(m)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                          title={copy.editTitle}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title={copy.deleteTitle}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {editing ? copy.editHeading : copy.newHeading}
                </h4>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    {copy.iconLabel}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJI_CHOICES.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { triggerHaptic('light'); setEmoji(e); }}
                        className={`w-8 h-8 rounded-lg text-base transition cursor-pointer ${
                          emoji === e
                            ? 'bg-indigo-100 dark:bg-indigo-950/60 ring-2 ring-indigo-500'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {copy.nameLabel}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={copy.namePlaceholder}
                    maxLength={40}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {copy.targetDateLabel}
                  </label>
                  <LocalizedDateInput value={targetDate} onChange={setTargetDate} />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    {copy.colorLabel}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_CHOICES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { triggerHaptic('light'); setColor(c); }}
                        className={`w-7 h-7 rounded-full transition cursor-pointer ${
                          color === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white ring-offset-white dark:ring-offset-slate-900' : ''
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={copy.colorAria.replace('{c}', c)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {editing && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition cursor-pointer"
                    >
                      {copy.cancelEdit}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!name.trim() || !targetDate}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition shadow-md shadow-indigo-600/30 cursor-pointer"
                  >
                    {editing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editing ? copy.saveChanges : copy.addMilestone}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};