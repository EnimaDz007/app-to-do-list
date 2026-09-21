import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, Mic } from 'lucide-react';
import { Task, TaskCategory, PriorityLevel, QuadrantId } from '../types';
import { TaskCard } from './TaskCard';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../i18n/translations';

interface PriorityListViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenNewTask: () => void;
  onOpenVoiceTask?: () => void;
  onStartFocus?: (task: Task) => void;
  onMoveTaskQuadrant?: (taskId: string, targetQuadrant: QuadrantId) => void;
}

export const PriorityListView: React.FC<PriorityListViewProps> = ({
  tasks,
  onToggleStatus,
  onEditTask,
  onDeleteTask,
  onOpenNewTask,
  onOpenVoiceTask,
  onStartFocus,
  onMoveTaskQuadrant,
}) => {
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'urgent'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'impact' | 'time'>('priority');

  const categories: Array<{ id: string; label: string }> = [


  ];

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const matchesSearch =
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || task.category === selectedCategory;
        const matchesStatus =
          statusFilter === 'all'
            ? true
            : statusFilter === 'active'
            ? task.status !== 'completed'
            : statusFilter === 'completed'
            ? task.status === 'completed'
            : task.priority === 'urgent' && task.status !== 'completed';

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'impact') {
          return b.impactScore - a.impactScore;
        }
        if (sortBy === 'time') {
          return a.estimatedMinutes - b.estimatedMinutes;
        }
        const priorityOrder: Record<PriorityLevel, number> = {
          urgent: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }, [tasks, searchQuery, selectedCategory, statusFilter, sortBy]);

  const statusLabelMap: Record<'all' | 'active' | 'urgent' | 'completed', TranslationKey> = {
    all: 'list_status_all',
    active: 'list_status_active',
    urgent: 'list_status_urgent',
    completed: 'list_status_completed',
  };

  return (
    <div id="priority-list-view" className="space-y-3.5 pb-4">
      {/* Search Bar + Push to Talk */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
          <input
            id="input-search-tasks"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('list_search_placeholder')}
            className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl ${
              isRTL ? 'pr-9 pl-14 text-right' : 'pl-9 pr-14 text-left'
            } py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition shadow-xs`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer`}
            >
              {t('list_clear')}
            </button>
          )}
        </div>

        {onOpenVoiceTask && (
          <button
            id="btn-list-voice-quick"
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onOpenVoiceTask();
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600 text-white font-bold text-xs shadow-sm shadow-rose-500/20 active:scale-95 transition cursor-pointer shrink-0"
            title={t('ptt_btn_title')}
            aria-label={t('ptt_btn_title')}
          >
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">{t('ptt_btn_title')}</span>
          </button>
        )}
      </div>

      {/* Category Pills (Horizontal scrollable on mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`filter-category-${cat.id.toLowerCase()}`}
              onClick={() => {
                triggerHaptic('light');
                setSelectedCategory(cat.id);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition cursor-pointer font-medium ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Status & Sort Quick Filters */}
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
          {(['all', 'active', 'urgent', 'completed'] as const).map((st) => (
            <button
              key={st}
              id={`filter-status-${st}`}
              onClick={() => {
                triggerHaptic('light');
                setStatusFilter(st);
              }}
              className={`px-2 py-1 rounded-md capitalize text-[11px] font-medium transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t(statusLabelMap[st])}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <select
            id="select-sort-tasks"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'priority' | 'impact' | 'time')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="priority">{t('list_sort_priority')}</option>
            <option value="impact">{t('list_sort_impact')}</option>
            <option value="time">{t('list_sort_time')}</option>
          </select>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-2 pt-1">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-6">
            <Filter className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('list_empty_title')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('list_empty_desc')}</p>
            <button
              onClick={onOpenNewTask}
              className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium cursor-pointer shadow-md shadow-indigo-600/30"
            >
              {t('list_create_btn')}
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleStatus={onToggleStatus}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onStartFocus={onStartFocus}
              onMoveQuadrant={onMoveTaskQuadrant}
            />
          ))
        )}
      </div>
    </div>
  );
};
