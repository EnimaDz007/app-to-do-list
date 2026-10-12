// ─────────────────────────────────────────────────────────────
//  FILE: src/components/ReminderPicker.tsx
//  UI for managing custom reminders on a task.
//  Preset chips ("15 min before", "1h before"...) + add/remove list.
//  Emits updated TaskReminder[] via onChange.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Bell, Plus, X, Check } from 'lucide-react';
import { TaskReminder } from '../types';
import { triggerHaptic } from '../utils/haptics';
import {
  REMINDER_PRESETS,
  makeReminder,
  formatReminderOffset,
} from '../utils/reminderScheduler';

interface ReminderPickerProps {
  /** The task's current due date (ISO string) — required to compute fireAt */
  dueDateIso: string;
  reminders: TaskReminder[];
  onChange: (next: TaskReminder[]) => void;
  disabled?: boolean;
  /** Localized label overrides */
  labels?: Partial<{
    title: string;
    add: string;
    empty: string;
    hint: string;
    max: string;
    noDate: string;
    past: string;
  }>;
}

const MAX_REMINDERS = 5;

export const ReminderPicker: React.FC<ReminderPickerProps> = ({
  dueDateIso,
  reminders,
  onChange,
  disabled,
  labels,
}) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState<number>(45);
  const [customUnit, setCustomUnit] = useState<'min' | 'hour' | 'day'>('min');

  const L = {
    title: labels?.title ?? 'Reminders',
    add: labels?.add ?? 'Add reminder',
    empty: labels?.empty ?? 'No reminders yet — pick a preset above.',
    hint: labels?.hint ?? 'Get notified at custom times before the task is due.',
    max: labels?.max ?? `Max ${MAX_REMINDERS} reminders per task`,
    noDate: labels?.noDate ?? 'Set a due date first',
    past: labels?.past ?? 'That time is already in the past',
  };

  const hasValidDate = !!dueDateIso && !isNaN(new Date(dueDateIso).getTime());

  /** Quick check: is this offset already used? (avoid duplicates) */
  const hasOffset = (minutes: number) =>
    reminders.some((r) => r.minutesBefore === minutes);

  const handlePresetTap = (minutes: number) => {
    if (!hasValidDate || disabled) return;
    triggerHaptic('medium');

    // Toggle behavior: tap again to remove
    if (hasOffset(minutes)) {
      onChange(reminders.filter((r) => r.minutesBefore !== minutes));
      return;
    }

    if (reminders.length >= MAX_REMINDERS) return;

    const fresh = makeReminder(minutes, dueDateIso);
    if (!fresh) {
      triggerHaptic('heavy');
      return;
    }
    // Insert sorted by fireAt (soonest first)
    const next = [...reminders, fresh].sort(
      (a, b) => new Date(a.fireAt).getTime() - new Date(b.fireAt).getTime()
    );
    onChange(next);
  };

  const handleAddCustom = () => {
    if (!hasValidDate || disabled) return;
    if (reminders.length >= MAX_REMINDERS) return;

    const multiplier = customUnit === 'min' ? 1 : customUnit === 'hour' ? 60 : 1440;
    const minutes = Math.max(1, Math.round(customValue * multiplier));

    if (hasOffset(minutes)) {
      setShowCustom(false);
      return;
    }

    const fresh = makeReminder(minutes, dueDateIso);
    if (!fresh) {
      triggerHaptic('heavy');
      setShowCustom(false);
      return;
    }
    triggerHaptic('success');
    const next = [...reminders, fresh].sort(
      (a, b) => new Date(a.fireAt).getTime() - new Date(b.fireAt).getTime()
    );
    onChange(next);
    setShowCustom(false);
  };

  const handleRemove = (id: string) => {
    triggerHaptic('light');
    onChange(reminders.filter((r) => r.id !== id));
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="block font-medium text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1">
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            <span>{L.title}</span>
            <span className="text-[10px] font-normal text-slate-400 ms-1">
              ({reminders.length}/{MAX_REMINDERS})
            </span>
          </span>
        </label>
        {!hasValidDate && (
          <span className="text-[10px] text-rose-500 font-semibold">
            {L.noDate}
          </span>
        )}
      </div>

      {/* ── Empty hint ── */}
      {reminders.length === 0 && hasValidDate && (
        <p className="text-[10px] text-slate-400 mb-2">{L.hint}</p>
      )}

      {/* ── Preset chips ── */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {REMINDER_PRESETS.map((p) => {
          const active = hasOffset(p.minutes);
          const atMax = reminders.length >= MAX_REMINDERS && !active;
          return (
            <button
              key={p.minutes}
              type="button"
              onClick={() => handlePresetTap(p.minutes)}
              disabled={!hasValidDate || atMax || disabled}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                active
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {active && <Check className="w-3 h-3" />}
              <span>{p.label}</span>
            </button>
          );
        })}

        {/* Custom chip */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowCustom((v) => !v);
          }}
          disabled={!hasValidDate || reminders.length >= MAX_REMINDERS || disabled}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            showCustom
              ? 'bg-violet-500 text-white border-violet-500'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Plus className="w-3 h-3" />
          <span>Custom</span>
        </button>
      </div>

      {/* ── Custom input row ── */}
      {showCustom && hasValidDate && (
        <div className="mb-2 flex items-center gap-2 p-2 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/60">
          <input
            type="number"
            min={1}
            max={999}
            value={customValue || ''}
            onChange={(e) => setCustomValue(parseInt(e.target.value) || 1)}
            className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
          />
          <select
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value as 'min' | 'hour' | 'day')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="min">min</option>
            <option value="hour">hour(s)</option>
            <option value="day">day(s)</option>
          </select>
          <span className="text-[11px] text-slate-600 dark:text-slate-300">before</span>
          <button
            type="button"
            onClick={handleAddCustom}
            className="ms-auto px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold transition cursor-pointer"
          >
            Add
          </button>
        </div>
      )}

      {/* ── Active reminders list ── */}
      {reminders.length > 0 && (
        <div className="space-y-1">
          {reminders.map((r) => {
            const fireDate = new Date(r.fireAt);
            const isPast = fireDate.getTime() <= Date.now();
            return (
              <div
                key={r.id}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] ${
                  isPast
                    ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/40 text-slate-400'
                    : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                }`}
              >
                <Bell className="w-3 h-3 shrink-0" />
                <span className="font-semibold">
                  {formatReminderOffset(r.minutesBefore)}
                </span>
                <span className="text-[10px] opacity-70 truncate">
                  ·{' '}
                  {fireDate.toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                {isPast && (
                  <span className="text-[9px] uppercase tracking-wider font-bold ms-1">
                    past
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(r.id)}
                  className="ms-auto p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
                  aria-label="Remove reminder"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Max reached hint ── */}
      {reminders.length >= MAX_REMINDERS && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 font-semibold">
          {L.max}
        </p>
      )}
    </div>
  );
};