import React from 'react';
import { Grid2x2, ListTodo, CalendarClock, TrendingUp, Archive } from 'lucide-react';
import { TabView } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

interface BottomTabBarProps {
  activeTab: TabView;
  onChangeTab: (tab: TabView) => void;
  urgentCount: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onChangeTab,
  urgentCount,
}) => {
  const { t } = useLanguage();

  const tabs = [
  { id: 'matrix' as TabView, label: t('tab_matrix'), icon: Grid2x2 },
  { id: 'list' as TabView, label: t('tab_list'), icon: ListTodo },
  { id: 'timeline' as TabView, label: t('tab_timeline'), icon: CalendarClock },
  { id: 'analytics' as TabView, label: t('tab_analytics'), icon: TrendingUp },
  { id: 'archive' as TabView, label: t('tab_archive') || 'Archive', icon: Archive },
];
   

  return (
    <nav
      id="bottom-tab-bar"
      className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border-t border-violet-200/40 dark:border-slate-800/50"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-button-${tab.id}`}
              onClick={() => {
                triggerHaptic('light');
                onChangeTab(tab.id);
              }}
              className={`relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  className="shrink-0"
                />
                {tab.id === 'matrix' && urgentCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                    {urgentCount > 9 ? '9+' : urgentCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-extrabold tracking-wider uppercase">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-violet-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
