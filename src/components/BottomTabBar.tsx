import React from 'react';
import { LayoutGrid, List, Calendar, BarChart3, Target, Download, Archive } from 'lucide-react';
import { TabView } from '../types';

interface BottomTabBarProps {
  activeTab: TabView;
  onChangeTab: (tab: TabView) => void;
  urgentCount?: number;
}

const TABS: { id: TabView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'matrix', label: 'Matrix', icon: LayoutGrid },
  { id: 'list', label: 'Tasks', icon: List },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'habits', label: 'Habits', icon: Target },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'archive', label: 'Archive', icon: Archive },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onChangeTab,
  urgentCount = 0,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === 'matrix' && urgentCount > 0;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-all cursor-pointer min-w-[52px] ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title={tab.label}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                    {urgentCount > 99 ? '99+' : urgentCount}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-semibold ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};