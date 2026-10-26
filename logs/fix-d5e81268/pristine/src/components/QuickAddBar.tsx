// ─────────────────────────────────────────────────────────────
//  FILE: src/components/QuickAddBar.tsx
//  A compact, premium natural-language task input.
//  Type → live preview chips appear → Enter to save.
//  Keyboard: "/" anywhere to focus. Esc to clear.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, ArrowRight, Calendar, Tag, Clock, AlertCircle,
} from 'lucide-react';
import { Task } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { unlockAudio } from '../utils/notifications';
import {
  parseQuickAdd,
  quickAddToTask,
  formatPreviewDate,
  ParsedQuickAdd,
} from '../utils/quickAddParser';

interface QuickAddBarProps {
  onAddTask: (taskData: Omit<Task, 'id' | 'createdAt'>) => void;
  disabled?: boolean;
}

const PRIORITY_STYLES: Record<
  string,
  { label: string; color: string }
> = {
  urgent: {
    label: 'Urgent',
    color: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/25',
  },
  high: {
    label: 'High',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25',
  },
  medium: {
    label: 'Medium',
    color: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/25',
  },
  low: {
    label: 'Low',
    color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/25',
  },
};

export const QuickAddBar: React.FC<QuickAddBarProps> = ({ onAddTask, disabled }) => {
  const [value, setValue] = useState('');
  const [parsed, setParsed] = useState<ParsedQuickAdd | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-parse on every keystroke
  useEffect(() => {
    if (value.trim().length === 0) {
      setParsed(null);
      return;
    }
    setParsed(parseQuickAdd(value));
  }, [value]);

  // "/" anywhere → focus the bar (unless user is already typing elsewhere)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        const active = document.activeElement as HTMLElement | null;
        const tag = active?.tagName;
        const isEditable =
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          active?.isContentEditable === true;
        if (!isEditable) {
          e.preventDefault();
          triggerHaptic('selection');
          inputRef.current?.focus();
        }
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        triggerHaptic('light');
        setValue('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed || !parsed.isValid || disabled) return;
    triggerHaptic('success');
    onAddTask(quickAddToTask(parsed));
    setValue('');
    setParsed(null);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    triggerHaptic('selection');
    // Warm up the AudioContext on the first real gesture
    unlockAudio();
    setFocused(true);
  };

  const isEmpty = value.trim().length === 0;
  const showPreview = !isEmpty && !!parsed && parsed.isValid;
  const prio = parsed
    ? PRIORITY_STYLES[parsed.priority] ?? PRIORITY_STYLES.low
    : null;

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative rounded-2xl border transition-all duration-300 ${
        focused
          ? 'border-amber-500/60 shadow-lg shadow-amber-500/10 bg-white dark:bg-zinc-900'
          : 'border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur'
      }`}
    >
      {/* ── Input row ── */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Sparkles
          className={`w-4 h-4 shrink-0 transition-colors ${
            focused ? 'text-amber-500' : 'text-zinc-400'
          }`}
        />

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          disabled={disabled}
          placeholder='Add a task…  try "Buy milk tomorrow 5pm #personal"'
          className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none disabled:opacity-50"
        />

        {!isEmpty ? (
          <button
            type="submit"
            disabled={!parsed?.isValid || disabled}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-bold transition cursor-pointer"
          >
            Add
            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-[10px] font-mono text-zinc-500">
            /
          </kbd>
        )}
      </div>

      {/* ── Live preview ── */}
      {showPreview && parsed && (
        <div className="px-3 pb-2.5 pt-2 border-t border-zinc-100 dark:border-white/5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider me-1">
            Preview
          </span>

          {/* Title */}
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 max-w-[220px] truncate">
            {parsed.title || '(no title)'}
          </span>

          {/* Due date */}
          {parsed.dueDate && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-medium">
              <Calendar className="w-3 h-3" />
              {formatPreviewDate(parsed.dueDate)}
            </span>
          )}

          {/* Category */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 text-[11px] font-medium">
            <Tag className="w-3 h-3" />
            {parsed.category}
          </span>

          {/* Priority */}
          {prio && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${prio.color}`}
            >
              <AlertCircle className="w-3 h-3" />
              {prio.label}
            </span>
          )}

          {/* Estimated time — only show if not the default 30 */}
          {parsed.estimatedMinutes > 0 && parsed.estimatedMinutes !== 30 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 text-[11px] font-medium">
              <Clock className="w-3 h-3" />
              {parsed.estimatedMinutes}min
            </span>
          )}

          {/* Contexts */}
          {parsed.contexts.map((ctx) => (
            <span
              key={ctx}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 text-[11px] font-medium"
            >
              @{ctx}
            </span>
          ))}
        </div>
      )}

      {/* ── Syntax hint (empty + focused) ── */}
      {isEmpty && focused && (
        <div className="px-3 pb-2.5 pt-2 border-t border-zinc-100 dark:border-white/5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
          <span className="font-bold uppercase tracking-wider">Try</span>
          <span>
            <code className="font-mono text-amber-600 dark:text-amber-400">
              tomorrow 5pm
            </code>{' '}
            → date
          </span>
          <span>
            <code className="font-mono text-violet-600 dark:text-violet-400">
              #personal
            </code>{' '}
            → category
          </span>
          <span>
            <code className="font-mono text-red-600 dark:text-red-400">!high</code>{' '}
            → priority
          </span>
          <span>
            <code className="font-mono text-cyan-600 dark:text-cyan-400">@home</code>{' '}
            → context
          </span>
          <span>
            <code className="font-mono text-zinc-500">~45m</code> → duration
          </span>
        </div>
      )}
    </form>
  );
};