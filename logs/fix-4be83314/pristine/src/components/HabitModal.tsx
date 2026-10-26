import React, { useState, useEffect } from 'react';
import { X, Save, Repeat, Clock, Target, Bell, BellOff } from 'lucide-react';
import { Habit, HabitFrequency, HabitGoalType } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../i18n/translations';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveHabit: (habit: Omit<Habit, 'id' | 'createdAt'> & { id?: string }) => void;
  editingHabit?: Habit | null;
}

const EMOJI_OPTIONS = [
  '🏃', '📚', '🧘', '💪', '🍎', '💧', '😴', '🧠', '🎯', '✍️',
  '🎨', '🎸', '🌱', '☀️', '🧹', '💊', '🍵', '🚶', '🛏️', '📝',
];

const COLOR_OPTIONS = [
  '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#10b981', '#06b6d4', '#3b82f6',
];

type LocalLang = 'en' | 'fr' | 'ar';

const DAY_LABELS: Record<LocalLang, string[]> = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  fr: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  ar: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'],
};

const DAY_NAMES: Record<LocalLang, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};

export const HabitModal: React.FC<HabitModalProps> = ({
  isOpen,
  onClose,
  onSaveHabit,
  editingHabit,
}) => {
  const { t, language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const isRtl = lang === 'ar';
  const dayLabels = DAY_LABELS[lang] ?? DAY_LABELS.en;
  const dayNames = DAY_NAMES[lang] ?? DAY_NAMES.en;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [color, setColor] = useState('#8b5cf6');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [goalType, setGoalType] = useState<HabitGoalType>('check');
  const [goalCount, setGoalCount] = useState<number | ''>(5);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');

  useEffect(() => {
    if (!isOpen) return;

    if (editingHabit) {
      setName(editingHabit.name);
      setDescription(editingHabit.description || '');
      setEmoji(editingHabit.emoji);
      setColor(editingHabit.color);
      setFrequency(editingHabit.frequency);
      setDaysOfWeek(editingHabit.daysOfWeek || [1, 2, 3, 4, 5]);
      setGoalType(editingHabit.goalType);
      setGoalCount(editingHabit.goalCount || 5);
      setReminderEnabled(editingHabit.reminderEnabled);
      setReminderTime(editingHabit.reminderTime || '09:00');
    } else {
      setName('');
      setDescription('');
      setEmoji('🎯');
      setColor('#8b5cf6');
      setFrequency('daily');
      setDaysOfWeek([1, 2, 3, 4, 5]);
      setGoalType('check');
      setGoalCount(5);
      setReminderEnabled(false);
      setReminderTime('09:00');
    }
  }, [isOpen, editingHabit]);

  if (!isOpen) return null;

  const toggleDay = (dayIdx: number) => {
    triggerHaptic('light');
    setDaysOfWeek((prev) => {
      const has = prev.includes(dayIdx);
      return has ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx].sort();
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    triggerHaptic('success');

    const finalGoalCount = goalType === 'count'
      ? (goalCount === '' ? 1 : Math.max(1, Math.min(100, goalCount)))
      : 1;

    onSaveHabit({
      id: editingHabit?.id,
      name: name.trim(),
      description: description.trim(),
      emoji,
      color,
      frequency,
      daysOfWeek: (frequency === 'weekly' || frequency === 'custom') ? daysOfWeek : undefined,
      goalType,
      goalCount: finalGoalCount,
      reminderTime: reminderEnabled ? reminderTime : undefined,
      reminderEnabled,
      archivedAt: editingHabit?.archivedAt,
    });
    onClose();
  };

  const daysJoined = daysOfWeek.map((i) => dayNames[i].slice(0, 3)).join(', ');

  return (
    <div
      id="habit-modal-backdrop"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="habit-modal-container"
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 shadow-2xl text-slate-900 dark:text-slate-100 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {editingHabit ? t('habit_edit_title' as TranslationKey) : t('habit_new_title' as TranslationKey)}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div className="flex justify-center">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-2xl"
              style={{ backgroundColor: color + '20', border: `1px solid ${color}` }}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="font-bold text-sm" style={{ color }}>
                {name || t('habit_preview_name' as TranslationKey)}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('habit_name_label' as TranslationKey)} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('habit_name_placeholder' as TranslationKey)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('habit_description_label' as TranslationKey)}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('habit_description_placeholder' as TranslationKey)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('habit_icon_label' as TranslationKey)}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { triggerHaptic('light'); setEmoji(e); }}
                  className={`w-9 h-9 rounded-lg text-lg transition cursor-pointer ${
                    emoji === e
                      ? 'bg-indigo-100 dark:bg-indigo-900/60 ring-2 ring-indigo-500'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('habit_color_label' as TranslationKey)}
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { triggerHaptic('light'); setColor(c); }}
                  className={`w-8 h-8 rounded-full transition cursor-pointer ${
                    color === c ? 'ring-4 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''
                  }`}
                  style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1">
                <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('habit_frequency_label' as TranslationKey)}</span>
              </span>
            </label>
            <div className="flex gap-1.5">
              {(['daily', 'weekly', 'custom'] as HabitFrequency[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { triggerHaptic('light'); setFrequency(f); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                    frequency === f
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {f === 'daily'
                    ? t('habit_frequency_daily' as TranslationKey)
                    : f === 'weekly'
                    ? t('habit_frequency_weekly' as TranslationKey)
                    : t('habit_frequency_custom' as TranslationKey)}
                </button>
              ))}
            </div>

            {(frequency === 'weekly' || frequency === 'custom') && (
              <div className="mt-2 flex gap-1">
                {dayLabels.map((d, i) => {
                  const selected = daysOfWeek.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      title={dayNames[i]}
                      className={`flex-1 h-9 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        selected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            )}
            {frequency === 'weekly' && (
              <p className="text-[10px] text-slate-400 mt-1">
                {daysOfWeek.length === 0
                  ? t('habit_days_none_selected' as TranslationKey)
                  : t('habit_days_on' as TranslationKey, { days: daysJoined })}
              </p>
            )}
            {frequency === 'custom' && (
              <p className="text-[10px] text-slate-400 mt-1">
                {t('habit_custom_days_hint' as TranslationKey)}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('habit_goal_type_label' as TranslationKey)}</span>
              </span>
            </label>
            <div className="flex gap-1.5">
              {(['check', 'count'] as HabitGoalType[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => { triggerHaptic('light'); setGoalType(g); }}
                  className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                    goalType === g
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {g === 'check'
                    ? t('habit_goal_check' as TranslationKey)
                    : t('habit_goal_count' as TranslationKey)}
                </button>
              ))}
            </div>

            {goalType === 'count' && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <span>{t('habit_target_per_day' as TranslationKey)}</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={goalCount}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setGoalCount('');
                    } else {
                      const num = parseInt(raw, 10);
                      if (!isNaN(num)) setGoalCount(num);
                    }
                  }}
                  onBlur={() => {
                    if (goalCount === '' || goalCount < 1) setGoalCount(1);
                  }}
                  className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('habit_reminder_label' as TranslationKey)}</span>
              </span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { triggerHaptic('light'); setReminderEnabled((v) => !v); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                  reminderEnabled
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {reminderEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                <span>
                  {reminderEnabled
                    ? t('habit_reminder_on' as TranslationKey)
                    : t('habit_reminder_off' as TranslationKey)}
                </span>
              </button>
              {reminderEnabled && (
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                />
              )}
            </div>
            {reminderEnabled && (
              <p className="text-[10px] text-slate-400 mt-1">
                {t('habit_reminder_hint' as TranslationKey, { time: reminderTime })}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition cursor-pointer"
            >
              {t('habit_cancel' as TranslationKey)}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {editingHabit
                  ? t('habit_save' as TranslationKey)
                  : t('habit_create' as TranslationKey)}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};