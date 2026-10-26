import React, { useMemo, useRef, useState } from 'react';
import { Sparkles, Mic, CornerDownLeft, X } from 'lucide-react';
import { Task, TaskCategory, QuadrantId, PriorityLevel, CONTEXT_DEFINITIONS } from '../types';
import { parseSpokenTask } from '../utils/voiceParser';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useLanguage } from '../context/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

interface NLPQuickAddProps {
  onCreate: (taskData: Omit<Task, 'id' | 'createdAt'>) => void;
  defaultQuadrant?: QuadrantId;
  placeholder?: string;
}

const QUADRANT_LABEL: Record<QuadrantId, { emoji: string; color: string }> = {
  do_first:  { emoji: '🔥', color: '#E11D48' },
  schedule:  { emoji: '📅', color: '#4F46E5' },
  delegate:  { emoji: '👥', color: '#059669' },
  eliminate: { emoji: '🗑️', color: '#64748B' },
};

const PRIORITY_LABEL: Record<PriorityLevel, { emoji: string; color: string }> = {
  urgent: { emoji: '⚡', color: '#E11D48' },
  high:   { emoji: '🔴', color: '#F59E0B' },
  medium: { emoji: '🟡', color: '#0EA5E9' },
  low:    { emoji: '🟢', color: '#10B981' },
};

export const NLPQuickAdd: React.FC<NLPQuickAddProps> = ({
  onCreate,
  defaultQuadrant = 'do_first',
  placeholder,
}) => {
  const { t } = useLanguage();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const speechLangMap: Record<string, string> = { en: 'en-US', fr: 'fr-FR', ar: 'ar-SA' };
  const {
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition(true);

  React.useEffect(() => {
    if (interimTranscript) setValue(interimTranscript);
  }, [interimTranscript]);

  const preview = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return parseSpokenTask(trimmed);
  }, [value]);

  const formatDue = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (sameDay) return `${t('nlp_today')} ${time}`;
    if (isTomorrow) return `${t('nlp_tomorrow')} ${time}`;

    return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`;
  };

  const handleMicTap = () => {
    triggerHaptic('medium');
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setValue('');
      startListening(speechLangMap.en);
    }
  };

  const handleCreate = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const parsed = parseSpokenTask(trimmed);

    triggerHaptic('success');
    onCreate({
      title: parsed.title,
      description: parsed.description,
      quadrant: parsed.quadrant,
      priority: parsed.priority,
      category: parsed.category,
      status: 'todo',
      estimatedMinutes: parsed.estimatedMinutes,
      dueDate: parsed.dueDate,
      impactScore: 3,
      effortScore: 3,
      contexts: parsed.contexts.length > 0 ? parsed.contexts : undefined,
    });

    setValue('');
    resetTranscript();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === 'Escape') {
      setValue('');
      resetTranscript();
      inputRef.current?.blur();
    }
  };

  const q = preview ? QUADRANT_LABEL[preview.quadrant] : null;
  const p = preview ? PRIORITY_LABEL[preview.priority] : null;

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 transition-all ${
          focused
            ? 'border-violet-500 ring-2 ring-violet-500/20'
            : 'border-slate-200 dark:border-slate-700/80'
        }`}
      >
        <div className="pl-3 flex items-center text-violet-500">
          <Sparkles className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder || t('nlp_placeholder')}
          className="flex-1 bg-transparent py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          aria-label={t('nlp_placeholder')}
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              resetTranscript();
              inputRef.current?.focus();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
            aria-label={t('nlp_btn_clear')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={handleMicTap}
          className={`p-2 rounded-xl transition cursor-pointer mr-1 ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse'
              : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          }`}
          aria-label={isListening ? t('nlp_btn_listening') : t('nlp_btn_speak')}
          title={isListening ? t('nlp_btn_listening') : t('nlp_btn_speak')}
        >
          <Mic className="w-4 h-4" />
        </button>
      </div>

      {/* Live preview */}
      {preview && focused && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl border border-violet-200 dark:border-violet-900/60 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="px-3.5 pt-3 pb-2 space-y-2">
            {/* Title */}
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-16 shrink-0 pt-0.5">
                {t('nlp_label_title')}
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-white break-words">
                {preview.title || <span className="text-slate-400 italic">{t('nlp_untitled')}</span>}
              </span>
            </div>

            {/* Due */}
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-16 shrink-0 pt-0.5">
                {t('nlp_label_due')}
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-300">
                📅 {formatDue(preview.dueDate)}
              </span>
            </div>

            {/* Quadrant + Priority */}
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-16 shrink-0 pt-0.5">
                {t('nlp_label_priority')}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {q && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: `${q.color}18`, color: q.color }}
                  >
                    {q.emoji} {t(`quad_${preview.quadrant}`)}
                  </span>
                )}
                {p && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: `${p.color}18`, color: p.color }}
                  >
                    {p.emoji} {preview.priority}
                  </span>
                )}
              </div>
            </div>

            {/* Contexts */}
            {preview.contexts.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-16 shrink-0 pt-0.5">
                  {t('nlp_label_tags')}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {preview.contexts.map((ctxId) => {
                    const def = CONTEXT_DEFINITIONS.find((d) => d.id === ctxId);
                    const emoji = def?.emoji ?? '🏷️';
                    const label = def?.label ?? ctxId;
                    return (
                      <span
                        key={ctxId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300"
                      >
                        {emoji} {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category + duration */}
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                {preview.category}
              </span>
              <span>{preview.estimatedMinutes}m</span>
            </div>
          </div>

          {/* Action row */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-3.5 py-2 flex items-center justify-between">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[9px]">
                {t('nlp_enter_to_create')}
              </kbd>
              {t('nlp_enter_desc')} · <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[9px]">
                {t('nlp_esc_to_cancel')}
              </kbd>
              {t('nlp_esc_desc')}
            </div>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
            >
              <CornerDownLeft className="w-3 h-3" />
              {t('nlp_btn_create')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};