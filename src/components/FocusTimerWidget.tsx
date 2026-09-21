import { useLanguage } from '../context/LanguageContext';
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, X, Minimize2, Maximize2, Flame, Bell } from 'lucide-react';
import { Task } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { playAudioChime, sendBrowserNotification } from '../utils/notifications';

interface FocusTimerWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTask: Task | null;
  onCompleteTask?: (taskId: string) => void;
}

type TimerPreset = 25 | 50 | 5 | 0; // 0 = stopwatch mode

export const FocusTimerWidget: React.FC<FocusTimerWidgetProps> = ({
  isOpen,
  onClose,
  activeTask,
  onCompleteTask,
}) => {
  const { t } = useLanguage();
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or change preset
  const handleSelectPreset = (minutes: TimerPreset) => {
    setIsRunning(false);
    setSelectedPreset(minutes);
    if (minutes === 0) {
      setStopwatchSeconds(0);
    } else {
      setSecondsLeft(minutes * 60);
    }
    triggerHaptic('light');
  };

  // Timer Tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (selectedPreset === 0) {
          // Stopwatch mode: counts up
          setStopwatchSeconds((prev) => prev + 1);
        } else {
          // Countdown mode
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              clearInterval(intervalRef.current!);
              setIsRunning(false);
              triggerHaptic('success');
              playAudioChime('timer');

              const taskTitle = activeTask ? activeTask.title : t('timer_focus_session');
              sendBrowserNotification('Focus Interval Complete! 🎉', {
                body: `Great job on: ${taskTitle}. Take a short break or start the next task!`,
              });

              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, selectedPreset, activeTask, t]);

  if (!isOpen) return null;

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const displayTime = selectedPreset === 0 ? formatTime(stopwatchSeconds) : formatTime(secondsLeft);
  const totalPresetSeconds = selectedPreset * 60;
  const progressPercent =
    selectedPreset === 0
      ? 100
      : Math.max(0, Math.min(100, ((totalPresetSeconds - secondsLeft) / totalPresetSeconds) * 100));

  const toggleRun = () => {
    triggerHaptic(isRunning ? 'medium' : 'success');
    if (!isRunning) {
      playAudioChime('beep');
    }
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    triggerHaptic('light');
    setIsRunning(false);
    if (selectedPreset === 0) {
      setStopwatchSeconds(0);
    } else {
      setSecondsLeft(selectedPreset * 60);
    }
  };

  const handleMarkDone = () => {
    if (activeTask && onCompleteTask) {
      triggerHaptic('success');
      playAudioChime('success');
      onCompleteTask(activeTask.id);
      setIsRunning(false);
    }
  };

  // Minimized Floating Pill View
  if (isMinimized) {
    return (
      <div
        id="focus-timer-minimized"
        className="fixed bottom-16 right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 text-white shadow-2xl border border-indigo-500/40 backdrop-blur cursor-pointer animate-in fade-in"
        onClick={() => setIsMinimized(false)}
      >
        <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        <span className="font-mono text-xs font-bold">{displayTime}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleRun();
          }}
          className="p-1 hover:bg-slate-800 rounded-full transition"
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>
        <Maximize2 className="w-3.5 h-3.5 text-slate-400 ml-1" />
      </div>
    );
  }

  // Expanded View Modal
  return (
    <div
      id="focus-timer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-indigo-500/20" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                {t('timer_focus_session')}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t('timer_pomodoro')} · Interval Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Minimize to floating pill"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 text-center space-y-4">
          {/* Active Task Name if present */}
          {activeTask ? (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-left rtl:text-right">
              <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                {t('modal_field_title')}
              </div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                {activeTask.title}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('timer_select_task')}
            </div>
          )}

          {/* Preset Buttons */}
          <div className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-medium">
            <button
              onClick={() => handleSelectPreset(25)}
              className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
                selectedPreset === 25
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              25m
            </button>
            <button
              onClick={() => handleSelectPreset(50)}
              className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
                selectedPreset === 50
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              50m
            </button>
            <button
              onClick={() => handleSelectPreset(5)}
              className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
                selectedPreset === 5
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              5m
            </button>
            <button
              onClick={() => handleSelectPreset(0)}
              className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
                selectedPreset === 0
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              00:00
            </button>
          </div>

          {/* Big Digital Display */}
          <div className="py-3 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <div className="text-5xl font-mono font-bold tracking-tight text-slate-900 dark:text-white">
                {displayTime}
              </div>
            </div>

            {selectedPreset !== 0 && (
              <div className="w-48 h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-4 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>

          {/* Primary Controls */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={handleReset}
              className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title={t('timer_reset')}
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={toggleRun}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white shadow-lg transition cursor-pointer ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>{t('timer_pause')}</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>{t('timer_start')}</span>
                </>
              )}
            </button>

            {activeTask && onCompleteTask && (
              <button
                onClick={handleMarkDone}
                className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
                title="Mark Task as Done"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Bell className="w-3 h-3 text-indigo-500" />
            <span>{t('settings_tab_notifications')}</span>
          </span>
          <button
            onClick={() => {
              triggerHaptic('light');
              playAudioChime('timer');
            }}
            className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
          >
            {t('settings_sound_title')}
          </button>
        </div>
      </div>
    </div>
  );
};
