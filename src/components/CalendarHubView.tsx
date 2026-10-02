import React from 'react';
import { Calendar, CalendarDays, BarChart3 } from 'lucide-react';
import { Task } from '../types';
import { DailyTimelineView } from './DailyTimelineView';
import { MonthCalendarView } from './MonthCalendarView';
import { FlowTimelineView } from './FlowTimelineView';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';

type SubTab = 'timeline' | 'calendar' | 'flow';
type LocalLang = 'en' | 'fr' | 'ar';

interface CalendarHubViewProps {
  tasks: Task[];
  activeSubTab: SubTab;
  onChangeSubTab: (tab: SubTab) => void;
  onToggleStatus: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

const COPY: Record<LocalLang, {
  day: string;
  month: string;
  flow: string;
}> = {
  en: { day: 'Day', month: 'Month', flow: 'Flow' },
  fr: { day: 'Jour', month: 'Mois', flow: 'Flux' },
  ar: { day: 'يوم', month: 'شهر', flow: 'تدفق' },
};

export const CalendarHubView: React.FC<CalendarHubViewProps> = ({
  tasks,
  activeSubTab,
  onChangeSubTab,
  onToggleStatus,
  onEditTask,
}) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const SUB_TABS: {
    id: SubTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'timeline', label: copy.day,   icon: Calendar },
    { id: 'calendar', label: copy.month, icon: CalendarDays },
    { id: 'flow',     label: copy.flow,  icon: BarChart3 },
  ];

  return (
    <div className="w-full flex flex-col">
      {/* Sub-tab switcher */}
      <div className="mb-3 flex items-center justify-center">
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-1 shadow-xs">
          {SUB_TABS.map((sub) => {
            const Icon = sub.icon;
            const isActive = activeSubTab === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => {
                  if (isActive) return;
                  triggerHaptic('light');
                  onChangeSubTab(sub.id);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {activeSubTab === 'timeline' && (
        <DailyTimelineView tasks={tasks} onToggleStatus={onToggleStatus} />
      )}
      {activeSubTab === 'calendar' && (
        <MonthCalendarView
          tasks={tasks}
          onToggleStatus={onToggleStatus}
          onEditTask={onEditTask}
        />
      )}
      {activeSubTab === 'flow' && (
        <FlowTimelineView
          tasks={tasks}
          onToggleStatus={onToggleStatus}
          onEditTask={onEditTask}
        />
      )}
    </div>
  );
};