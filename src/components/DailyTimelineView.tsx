import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Task } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../i18n/translations';

interface DailyTimelineViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
}

export const DailyTimelineView: React.FC<DailyTimelineViewProps> = ({
  tasks,
  onToggleStatus,
}) => {
  const { t, isRTL } = useLanguage();
  // Focus Timer state (25 minutes = 1500 seconds)
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTimerTask, setActiveTimerTask] = useState<Task | null>(
    tasks.find((t) => t.status === 'in_progress') || tasks[0] || null
  );

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            triggerHaptic('success');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timerSeconds]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 8 AM to 5 PM hourly blocks
  const timeSlots: { hour: string; labelKey: TranslationKey }[] = [
    { hour: '08:00 AM', labelKey: 'timeline_slot_morning' },
    { hour: '09:00 AM', labelKey: 'timeline_slot_deepwork' },
    { hour: '10:30 AM', labelKey: 'timeline_slot_tactical' },
    { hour: '11:30 AM', labelKey: 'timeline_slot_tactical' },
    { hour: '01:00 PM', labelKey: 'timeline_slot_lunch' },
    { hour: '02:00 PM', labelKey: 'timeline_slot_deepwork' },
    { hour: '03:30 PM', labelKey: 'timeline_slot_admin' },
    { hour: '04:30 PM', labelKey: 'timeline_slot_evening' },
  ];

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div id="daily-timeline-view" className="space-y-4 pb-4">
      {/* Interactive Mobile Focus Timer Widget */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900/90 via-indigo-950 to-slate-900 dark:from-indigo-950/70 dark:via-slate-900 dark:to-slate-900 border border-indigo-500/30 p-4 shadow-lg text-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-base font-semibold uppercase tracking-wider text-indigo-300">
              {t('timer_focus_session')}
            </span>
          </div>
          <span className="text-base px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
            {t('timer_pomodoro')} 25m
          </span>
        </div>

        <div className="my-3 flex items-center justify-between">
          <div>
            <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-white">
              {formatTime(timerSeconds)}
            </div>
            <p className="text-base text-slate-300 dark:text-slate-400 mt-0.5 max-w-[200px] sm:max-w-xs truncate">
              {activeTimerTask ? activeTimerTask.title : t('timer_select_task')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-toggle-focus-timer"
              onClick={() => {
                triggerHaptic(isRunning ? 'light' : 'medium');
                setIsRunning(!isRunning);
              }}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition cursor-pointer shadow-md ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
              title={isRunning ? t('timer_pause') : t('timer_start')}
            >
              {isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className={`w-5 h-5 fill-current ${isRTL ? 'mr-0.5' : 'ml-0.5'}`} />}
            </button>

            <button
              id="btn-reset-focus-timer"
              onClick={() => {
                triggerHaptic('light');
                setIsRunning(false);
                setTimerSeconds(25 * 60);
              }}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-200 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
              title={t('timer_reset')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hourly Timeline Schedule */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base sm:text-base font-semibold text-slate-900 dark:text-white">
              {t('timeline_title')}
            </h3>
          </div>
          <span className="text-base text-slate-500 dark:text-slate-400 font-mono">
            {t('timeline_completed_summary', { completed: completedCount, total: tasks.length })}
          </span>
        </div>

        <div className="mt-3 space-y-3 relative before:absolute before:left-[47px] rtl:before:left-auto rtl:before:right-[47px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {timeSlots.map((slot, idx) => {
            const assignedTask = tasks[idx % tasks.length];
            const isDone = assignedTask && assignedTask.status === 'completed';

            return (
              <div key={slot.hour} className="relative flex items-start gap-3 text-base">
                {/* Time label */}
                <div className="w-12 text-base font-mono text-slate-500 dark:text-slate-400 pt-1 shrink-0 text-right rtl:text-left">
                  {slot.hour.split(' ')[0]}
                </div>

                {/* Node indicator */}
                <div
                  className={`w-3 h-3 rounded-full mt-1.5 shrink-0 border-2 transition z-10 ${
                    isDone
                      ? 'bg-emerald-500 border-emerald-400'
                      : 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500'
                  }`}
                />

                {/* Slot Card */}
                <div
                  onClick={() => {
                    if (assignedTask) {
                      triggerHaptic('light');
                      setActiveTimerTask(assignedTask);
                    }
                  }}
                  className={`flex-1 rounded-xl p-2.5 border transition cursor-pointer ${
                    activeTimerTask?.id === assignedTask?.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-500/50'
                      : 'bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-base uppercase font-mono text-indigo-600 dark:text-indigo-300 font-medium">
                      {t(slot.labelKey)}
                    </span>
                    {assignedTask && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('success');
                          onToggleStatus(assignedTask.id);
                        }}
                        className="text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition cursor-pointer"
                      >
                        <CheckCircle2
                          className={`w-4 h-4 ${isDone ? 'text-emerald-500 dark:text-emerald-400 fill-emerald-500/20' : ''}`}
                        />
                      </button>
                    )}
                  </div>

                  {assignedTask ? (
                    <div className="mt-1">
                      <p
                        className={`text-base font-medium ${
                          isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {assignedTask.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-base text-slate-500 dark:text-slate-400">
                        <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700/60 font-medium text-slate-700 dark:text-slate-300">
                          {t(`cat_${assignedTask.category}` as TranslationKey) || assignedTask.category}
                        </span>
                        <span>{assignedTask.estimatedMinutes}m {t('timeline_est_suffix')}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-slate-400 italic text-base">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
