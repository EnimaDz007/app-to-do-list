import React, { useState } from 'react';
import { Plus, Smartphone, Tablet, Monitor, Flame, Settings, Timer, Mic, Sun, Moon, Palette, Target, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { DeviceFrameMode } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n/translations';
import { UILayoutPicker } from './UILayoutPicker';
import { AppLogo } from './AppLogo';

interface HeaderProps {
  completedCount: number;
  totalCount: number;
  streakCount: number;
  karmaTotal: number;
  karmaEmoji: string;
  deviceMode: DeviceFrameMode;
  onSetDeviceMode: (mode: DeviceFrameMode) => void;
  onOpenNewTask: () => void;
  onOpenVoiceTask: () => void;
  onOpenSettings: () => void;
  onOpenFocusTimer: () => void;
  onOpenMilestones: () => void;
  onOpenKarma: () => void;
}

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  premium: string;
  focus: string;
  milestones: string;
  changeLayout: string;
  switchLight: string;
  switchDark: string;
  toggleTheme: string;
  startFocus: string;
  focusTimer: string;
  karmaTooltip: string;
  doneLabel: string;
  streakSuffix: string;
}> = {
  en: {
    premium: 'Premium',
    focus: 'Focus',
    milestones: 'Milestones',
    changeLayout: 'Change UI Layout',
    switchLight: 'Switch to Light Mode',
    switchDark: 'Switch to Dark Mode',
    toggleTheme: 'Toggle theme',
    startFocus: 'Start Focus Session',
    focusTimer: 'Focus Timer',
    karmaTooltip: 'Karma — tap to see your progression',
    doneLabel: 'Done',
    streakSuffix: 'd',
  },
  fr: {
    premium: 'Premium',
    focus: 'Focus',
    milestones: 'Objectifs',
    changeLayout: 'Changer la disposition',
    switchLight: 'Passer en mode clair',
    switchDark: 'Passer en mode sombre',
    toggleTheme: 'Changer de thème',
    startFocus: 'Démarrer une session',
    focusTimer: 'Minuteur de focus',
    karmaTooltip: 'Karma — appuyez pour voir la progression',
    doneLabel: 'Fait',
    streakSuffix: 'j',
  },
  ar: {
    premium: 'بريميوم',
    focus: 'تركيز',
    milestones: 'الأهداف',
    changeLayout: 'تغيير تخطيط الواجهة',
    switchLight: 'التبديل إلى الوضع الفاتح',
    switchDark: 'التبديل إلى الوضع الداكن',
    toggleTheme: 'تغيير المظهر',
    startFocus: 'بدء جلسة تركيز',
    focusTimer: 'مؤقّت التركيز',
    karmaTooltip: 'الكارما — اضغط لعرض تقدمك',
    doneLabel: 'المكتمل',
    streakSuffix: 'يوم',
  },
};

export const Header: React.FC<HeaderProps> = ({
  completedCount,
  totalCount,
  streakCount,
  karmaTotal,
  karmaEmoji,
  deviceMode,
  onSetDeviceMode,
  onOpenNewTask,
  onOpenVoiceTask,
  onOpenSettings,
  onOpenFocusTimer,
  onOpenMilestones,
  onOpenKarma,
}) => {
  const { language, t, isRTL } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [isLayoutPickerOpen, setIsLayoutPickerOpen] = useState(false);

  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

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
    <>
      <header
        id="app-header"
        className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 px-3 sm:px-4 py-2.5 sm:py-3 transition-colors"
      >
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="shrink-0">
              <AppLogo size={44} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-nowrap">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight whitespace-nowrap">
                  {t('app_title')}
                </h1>
              </div>

              <div className="flex items-center gap-1.5 mt-0.5 text-[9px] sm:text-[10px] flex-nowrap">
                <span className="font-bold text-amber-500 tracking-[0.15em] uppercase shrink-0">
                  {copy.premium}
                </span>
                <span className="text-slate-400 shrink-0">•</span>
                <p className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {todayStr}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-xs">
              <button
                id="btn-mode-iphone"
                onClick={() => { triggerHaptic('light'); onSetDeviceMode('iphone'); }}
                title="iPhone"
                className={`px-2 py-1 rounded-md transition flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                  deviceMode === 'iphone' ? 'bg-indigo-600 text-white shadow-xs'
                                          : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>{t('device_iphone')}</span>
              </button>
              <button
                id="btn-mode-android"
                onClick={() => { triggerHaptic('light'); onSetDeviceMode('android'); }}
                title="Pixel"
                className={`px-2 py-1 rounded-md transition flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                  deviceMode === 'android' ? 'bg-indigo-600 text-white shadow-xs'
                                           : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
                }`}
              >
                <Tablet className="w-3 h-3" />
                <span>{t('device_android')}</span>
              </button>
              <button
                id="btn-mode-responsive"
                onClick={() => { triggerHaptic('light'); onSetDeviceMode('responsive'); }}
                title="Full"
                className={`px-2 py-1 rounded-md transition flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                  deviceMode === 'responsive' ? 'bg-indigo-600 text-white shadow-xs'
                                              : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
                }`}
              >
                <Monitor className="w-3 h-3" />
                <span>{t('device_full')}</span>
              </button>
            </div>

            <button
              id="btn-open-milestones"
              onClick={() => { triggerHaptic('medium'); onOpenMilestones(); }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer shrink-0"
              title={copy.milestones}
              aria-label={copy.milestones}
            >
              <Target className="w-4 h-4 text-rose-500" />
            </button>

            <button
              id="btn-open-layout-picker"
              onClick={() => { triggerHaptic('medium'); setIsLayoutPickerOpen(true); }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer shrink-0"
              title={copy.changeLayout}
              aria-label={copy.changeLayout}
            >
              <Palette className="w-4 h-4 text-purple-500" />
            </button>

            <button
              id="btn-toggle-theme"
              onClick={() => { triggerHaptic('light'); toggleTheme(); }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer shrink-0"
              title={isDark ? copy.switchLight : copy.switchDark}
              aria-label={copy.toggleTheme}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            <button
              id="btn-open-focus-timer"
              onClick={() => { triggerHaptic('medium'); onOpenFocusTimer(); }}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/30 border border-amber-500/40 transition-all active:scale-95 cursor-pointer shrink-0"
              title={copy.startFocus}
              aria-label={copy.focusTimer}
            >
              <Timer className="w-4 h-4" />
              <span className="hidden sm:inline">{copy.focus}</span>
            </button>

            <button
              id="btn-open-settings"
              onClick={() => { triggerHaptic('light'); onOpenSettings(); }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer shrink-0"
              title={t('settings_btn')}
              aria-label={t('settings_btn')}
            >
              <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm shadow-orange-500/30 transition-transform hover:scale-105">
              <Flame className="w-3 h-3 fill-white/30 text-white" />
              <span className="font-extrabold">
                {streakCount} {copy.streakSuffix}
              </span>
            </div>

            <button
              onClick={() => { triggerHaptic('medium'); onOpenKarma(); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm shadow-violet-500/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              title={copy.karmaTooltip}
            >
              <Sparkles className="w-3 h-3" />
              <span className="font-extrabold">{karmaTotal}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-500 dark:text-slate-400 text-[10px] whitespace-nowrap">
              {copy.doneLabel}{' '}
              <strong className="text-slate-800 dark:text-white font-medium">{completedCount}</strong>/{totalCount}
            </span>
            <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">{percent}%</span>
          </div>
        </div>
      </header>

      <UILayoutPicker
        isOpen={isLayoutPickerOpen}
        onClose={() => setIsLayoutPickerOpen(false)}
      />
    </>
  );
};