import React from 'react';
import { Plus, Smartphone, Tablet, Monitor, Flame, Settings, Timer, Mic, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { DeviceFrameMode } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n/translations';

interface HeaderProps {
  completedCount: number;
  totalCount: number;
   streakCount: number; 
  deviceMode: DeviceFrameMode;
  onSetDeviceMode: (mode: DeviceFrameMode) => void;
  onOpenNewTask: () => void;
  onOpenVoiceTask: () => void;
  onOpenSettings: () => void;
  onOpenFocusTimer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  completedCount,
  totalCount,
  streakCount,
  deviceMode,
  onSetDeviceMode,
  onOpenNewTask,
  onOpenVoiceTask,
  onOpenSettings,
  onOpenFocusTimer,
}) => {
  const { language, t, isRTL } = useLanguage();
    const { isDark, toggleTheme } = useTheme();

  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  const localeMap: Record<Language, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    ar: 'ar-EG',
  };

  const todayStr = new Intl.DateTimeFormat(localeMap[language] || 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <header
      id="app-header"
      className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 px-3 sm:px-4 py-2.5 sm:py-3 transition-colors"
    >
      {/* Top Bar with Brand and Quick Controls */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-amber-400 font-extrabold text-sm sm:text-lg ring-2 ring-amber-400/30 shadow-[0_4px_14px_rgba(251,191,36,0.25)]">
            {isRTL ? 'ص' : 'TP'}
          </div>
          <div className="min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-1.5 flex-nowrap">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight whitespace-nowrap">
                {t('app_title')}
              </h1>
            </div>

            {/* Premium + Date row */}
            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] sm:text-[10px] flex-nowrap">
              <span className="font-bold text-amber-500 tracking-[0.15em] uppercase shrink-0">
                Premium
              </span>
              <span className="text-slate-400 shrink-0">•</span>
              <p className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {todayStr}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Device Simulator Toggle (Desktop preview only) */}
          <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-xs">
            <button
              id="btn-mode-iphone"
              onClick={() => {
                triggerHaptic('light');
                onSetDeviceMode('iphone');
              }}
              title="iPhone Shell"
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                deviceMode === 'iphone'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>{t('device_iphone')}</span>
            </button>
            <button
              id="btn-mode-android"
              onClick={() => {
                triggerHaptic('light');
                onSetDeviceMode('android');
              }}
              title="Pixel Shell"
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                deviceMode === 'android'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
              }`}
            >
              <Tablet className="w-3 h-3" />
              <span>{t('device_android')}</span>
            </button>
            <button
              id="btn-mode-responsive"
              onClick={() => {
                triggerHaptic('light');
                onSetDeviceMode('responsive');
              }}
              title="Full Fluid Layout"
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                deviceMode === 'responsive'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span>{t('device_full')}</span>
            </button>
          </div>

                   {/* 🌙 Dark Mode Toggle */}
          <button
            id="btn-toggle-theme"
            onClick={() => {
              triggerHaptic('light');
              toggleTheme();
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer shrink-0"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>
 
          {/* Focus Timer Button */}
          <button
            id="btn-open-focus-timer"
            onClick={() => {
              triggerHaptic('light');
              onOpenFocusTimer();
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer shrink-0"
            title="Focus Timer"
            aria-label="Focus Timer"
          >
            <Timer className="w-4 h-4 text-amber-500" />
          </button>

          {/* Settings Button (Consolidates Theme, Language, Backup, Notifications, About) */}
          <button
            id="btn-open-settings"
            onClick={() => {
              triggerHaptic('light');
              onOpenSettings();
            }}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer shrink-0"
            title={t('settings_btn')}
            aria-label={t('settings_btn')}
          >
            <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline text-xs font-semibold">{t('settings_btn')}</span>
          </button>

         

         
        </div>
      </div>

      {/* Mini Streak & Progress Status Bar */}
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-xs">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm shadow-orange-500/30 transition-transform hover:scale-105">
  <Flame className="w-3.5 h-3.5 fill-white/30 text-white" />
  <span className="font-medium">
    {isRTL ? 'السلسلة اليومية:' : language === 'fr' ? 'Série quotidienne :' : 'Daily Streak:'}
  </span>
  <span className="font-extrabold">
   {streakCount}{isRTL ? ' أيام' : language === 'fr' ? ' Jours' : ' Days'}
  </span>
</div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
            {isRTL ? (
              <>
                المكتمل <strong className="text-slate-800 dark:text-white font-medium">{completedCount}</strong>/{totalCount}
              </>
            ) : language === 'fr' ? (
              <>
                Fait <strong className="text-slate-800 dark:text-white font-medium">{completedCount}</strong>/{totalCount}
              </>
            ) : (
              <>
                Done <strong className="text-slate-800 dark:text-white font-medium">{completedCount}</strong>/{totalCount}
              </>
            )}
          </span>
          <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">{percent}%</span>
        </div>
      </div>
    </header>
  );
};
