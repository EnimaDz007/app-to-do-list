import React from 'react';
import { LayoutGrid, List, CalendarDays, Target, MoreHorizontal } from 'lucide-react';
import { TabView } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface BottomTabBarProps {
  activeTab: TabView;
  onChangeTab: (tab: TabView) => void;
  onOpenMore: () => void;
  urgentCount?: number;
}

const CALENDAR_TABS: TabView[] = ['timeline', 'calendar', 'flow'];
const MORE_TABS: TabView[] = ['analytics', 'review', 'archive', 'export'];

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  matrix: string;
  tasks: string;
  calendar: string;
  habits: string;
  more: string;
}> = {
  en: { matrix: 'Matrix',   tasks: 'Tasks',    calendar: 'Calendar',   habits: 'Habits',    more: 'More' },
  fr: { matrix: 'Matrice',  tasks: 'Tâches',   calendar: 'Calendrier', habits: 'Habitudes', more: 'Plus' },
  ar: { matrix: 'المصفوفة', tasks: 'المهام',   calendar: 'التقويم',    habits: 'العادات',   more: 'المزيد' },
};

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onChangeTab,
  onOpenMore,
  urgentCount = 0,
}) => {
  const { language, isRTL } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const isCalendarActive = CALENDAR_TABS.includes(activeTab);
  const isMoreActive = MORE_TABS.includes(activeTab);

  const goToCalendar = () => {
    if (isCalendarActive) return;
    onChangeTab('calendar');
  };

  const tabs: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
    onClick: () => void;
    badge?: number;
  }[] = [
    { id: 'matrix',   label: copy.matrix,   icon: LayoutGrid,     isActive: activeTab === 'matrix', onClick: () => onChangeTab('matrix'), badge: urgentCount },
    { id: 'list',     label: copy.tasks,    icon: List,           isActive: activeTab === 'list',   onClick: () => onChangeTab('list') },
    { id: 'calendar', label: copy.calendar, icon: CalendarDays,   isActive: isCalendarActive,       onClick: goToCalendar },
    { id: 'habits',   label: copy.habits,   icon: Target,         isActive: activeTab === 'habits', onClick: () => onChangeTab('habits') },
    { id: 'more',     label: copy.more,     icon: MoreHorizontal, isActive: isMoreActive,           onClick: onOpenMore },
  ];

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed z-40 left-3 right-3 bottom-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-lg pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="pointer-events-auto rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.18)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-around px-1.5 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.isActive;
            const showBadge = tab.id === 'matrix' && (tab.badge || 0) > 0;

            return (
              <button
                key={tab.id}
                onClick={tab.onClick}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-2xl transition-all cursor-pointer min-w-[56px] ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
                title={tab.label}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  {showBadge && (
                    <span
                      className={`absolute -top-1 ${isRTL ? '-left-1.5' : '-right-1.5'} flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold ring-2 ring-white dark:ring-slate-900`}
                    >
                      {tab.badge! > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9.5px] font-semibold ${isActive ? 'font-bold' : ''}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};