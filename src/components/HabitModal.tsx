import React, { useState, useEffect } from 'react';
import { X, Save, Repeat, Clock, Target, Bell, BellOff } from 'lucide-react';
import { Habit, HabitFrequency, HabitGoalType } from '../types';
import { triggerHaptic } from '../utils/haptics';

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
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const HabitModal: React.FC<HabitModalProps> = ({
  isOpen,
  onClose,
  onSaveHabit,
  editingHabit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [color, setColor] = useState('#8b5cf6');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [goalType, setGoalType] = useState<HabitGoalType>('check');
  // 🔑 Use `number | ''` so the input can be empty while typing
  const [goalCount, setGoalCount] = useState<number | ''>(5);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');

  // Load editing habit data
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
      const next = has ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx].sort();
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    triggerHaptic('success');

    // 🔑 Convert `number | ''` to a real number for saving
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

  return (
    <div
      id="habit-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="habit-modal-container"
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 shadow-2xl text-slate-900 dark:text-slate-100 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {editingHabit ? 'Edit Habit' : 'New Habit'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Preview badge */}
          <div className="flex justify-center">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-2xl"
              style={{ backgroundColor: color + '20', border: `1px solid ${color}` }}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="font-bold text-sm" style={{ color }}>{name || 'My Habit'}</span>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Habit Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Exercise, Read, Meditate"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 30 minutes of cardio"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Icon
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

          {/* Color Picker */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Color
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

          {/* Frequency */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1">
                <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                <span>Frequency</span>
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
                  {f === 'daily' ? 'Every day' : f === 'weekly' ? 'Weekly' : 'Custom'}
                </button>
              ))}
            </div>

            {(frequency === 'weekly' || frequency === 'custom') && (
              <div className="mt-2 flex gap-1">
                {DAY_LABELS.map((d, i) => {
                  const selected = daysOfWeek.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      title={DAY_NAMES[i]}
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
                  ? 'Pick at least one day'
                  : `On ${daysOfWeek.map((i) => DAY_NAMES[i].slice(0, 3)).join(', ')}`}
              </p>
            )}
            {frequency === 'custom' && (
              <p className="text-[10px] text-slate-400 mt-1">
                Only these days count toward your streak.
              </p>
            )}
          </div>

          {/* Goal Type */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <span>Goal Type</span>
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
                  {g === 'check' ? '✓ Done / Not done' : '# Count per day'}
                </button>
              ))}
            </div>

            {goalType === 'count' && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <span>Target per day:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={goalCount}
                  onChange={(e) => {
                    // 🔑 Allow empty value while typing
                    const raw = e.target.value;
                    if (raw === '') {
                      setGoalCount('');
                    } else {
                      const num = parseInt(raw, 10);
                      if (!isNaN(num)) setGoalCount(num);
                    }
                  }}
                  onBlur={() => {
                    // If left empty, reset to 1
                    if (goalCount === '' || goalCount < 1) setGoalCount(1);
                  }}
                  className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Reminder */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Reminder</span>
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
                <span>{reminderEnabled ? 'ON' : 'OFF'}</span>
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
                You'll get a notification at {reminderTime} on scheduled days.
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editingHabit ? 'Save' : 'Create'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};