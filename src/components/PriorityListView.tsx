import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, ArrowUpDown, Mic, Bookmark, Plus, X } from 'lucide-react';
import { Task, TaskCategory, PriorityLevel, QuadrantId, Subtask, CONTEXT_DEFINITIONS } from '../types';
import { TaskCard } from './TaskCard';
import { NLPQuickAdd } from './NLPQuickAdd';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../i18n/translations';
import { BUILT_IN_VIEWS, SavedView, applyViewFilter } from '../data/builtInViews';

interface PriorityListViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenNewTask: () => void;
  onOpenVoiceTask?: () => void;
  onStartFocus?: (task: Task) => void;
  onMoveTaskQuadrant?: (taskId: string, targetQuadrant: QuadrantId) => void;
  onUpdateSubtasks?: (taskId: string, nextSubtasks: Subtask[]) => void;
  onSaveAsTemplate?: (task: Task) => void;
  onQuickAdd?: (taskData: Omit<Task, 'id' | 'createdAt'>) => void;
}

const CUSTOM_VIEWS_STORAGE_KEY = 'taskflow_custom_views';

type LocalLang = 'en' | 'fr' | 'ar';

const LOCAL_COPY: Record<LocalLang, {
  allTasks: string;
  saveView: string;
  allContexts: string;
  promptViewName: string;
  confirmDeleteView: string;
  deleteView: string;
  viewNamePlaceholder: string;
  customView: string;
  noTasksInView: string;
  contexts: Record<string, string>;
  viewNames: Record<string, string>;
  viewDescs: Record<string, string>;
}> = {
  en: {
    allTasks: 'All tasks',
    saveView: 'Save view',
    allContexts: 'All contexts',
    promptViewName: 'Name this view:',
    confirmDeleteView: 'Delete this view?',
    deleteView: 'Delete view',
    viewNamePlaceholder: 'Custom view',
    customView: 'Custom view',
    noTasksInView: 'No tasks in "{name}"',
    contexts: { home: 'Home', work: 'Work', call: 'Call', computer: 'Deep Work', errand: 'Errand', health: 'Health' },
    viewNames: {
      'All Attack': 'All Attack',
      "Today's Battlefield": "Today's Battlefield",
      'Slow Burn': 'Slow Burn',
      'Delegation Pending': 'Delegation Pending',
      'Dead Weight': 'Dead Weight',
      'Quick Wins': 'Quick Wins',
      'Deep Focus': 'Deep Focus',
    },
    viewDescs: {
      'All Attack': 'Every active task',
      "Today's Battlefield": 'Do these now',
      'Slow Burn': 'Important, not urgent yet',
      'Delegation Pending': 'Waiting on someone else',
      'Dead Weight': 'Low impact — cut these',
      'Quick Wins': 'Fast, high impact',
      'Deep Focus': 'Long, high impact',
    },
  },
  fr: {
    allTasks: 'Toutes les tâches',
    saveView: 'Enregistrer',
    allContexts: 'Tous les contextes',
    promptViewName: 'Nommer cette vue :',
    confirmDeleteView: 'Supprimer cette vue ?',
    deleteView: 'Supprimer la vue',
    viewNamePlaceholder: 'Vue personnalisée',
    customView: 'Vue personnalisée',
    noTasksInView: 'Aucune tâche dans « {name} »',
    contexts: { home: 'Maison', work: 'Travail', call: 'Appel', computer: 'Travail profond', errand: 'Courses', health: 'Santé' },
    viewNames: {
      'All Attack': 'Tout attaquer',
      "Today's Battlefield": "Champ de bataille du jour",
      'Slow Burn': 'Feu doux',
      'Delegation Pending': 'Délégation en attente',
      'Dead Weight': 'Poids mort',
      'Quick Wins': 'Gains rapides',
      'Deep Focus': 'Concentration profonde',
    },
    viewDescs: {
      'All Attack': 'Toutes les tâches actives',
      "Today's Battlefield": 'À faire maintenant',
      'Slow Burn': 'Important mais pas urgent',
      'Delegation Pending': 'En attente de quelqu’un',
      'Dead Weight': 'Faible impact — à supprimer',
      'Quick Wins': 'Rapide et fort impact',
      'Deep Focus': 'Long et fort impact',
    },
  },
  ar: {
    allTasks: 'كل المهام',
    saveView: 'حفظ العرض',
    allContexts: 'جميع السياقات',
    promptViewName: 'اسم هذا العرض:',
    confirmDeleteView: 'حذف هذا العرض؟',
    deleteView: 'حذف العرض',
    viewNamePlaceholder: 'عرض مخصص',
    customView: 'عرض مخصص',
    noTasksInView: 'لا توجد مهام في "{name}"',
    contexts: { home: 'المنزل', work: 'العمل', call: 'مكالمة', computer: 'عمل عميق', errand: 'مشاوير', health: 'الصحة' },
    viewNames: {
      'All Attack': 'الهجوم الشامل',
      "Today's Battlefield": 'ميدان اليوم',
      'Slow Burn': 'الحرق البطيء',
      'Delegation Pending': 'التفويض المعلّق',
      'Dead Weight': 'الوزن الميت',
      'Quick Wins': 'انتصارات سريعة',
      'Deep Focus': 'تركيز عميق',
    },
    viewDescs: {
      'All Attack': 'كل المهام النشطة',
      "Today's Battlefield": 'أنجزها الآن',
      'Slow Burn': 'مهم لكن ليس عاجلاً',
      'Delegation Pending': 'بانتظار شخص آخر',
      'Dead Weight': 'أثر منخفض — احذفها',
      'Quick Wins': 'سريعة وعالية الأثر',
      'Deep Focus': 'طويلة وعالية الأثر',
    },
  },
};

function translateViewName(view: SavedView, copy: typeof LOCAL_COPY.en): string {
  if (!view.isBuiltIn) return view.name;
  return copy.viewNames[view.name] ?? view.name;
}
function translateViewDesc(view: SavedView, copy: typeof LOCAL_COPY.en): string {
  if (!view.isBuiltIn) return view.description;
  return copy.viewDescs[view.name] ?? view.description;
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
  onUpdateSubtasks,
  onSaveAsTemplate,
  onQuickAdd,
}) => {
  const { t, isRTL, language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = LOCAL_COPY[lang] ?? LOCAL_COPY.en;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'urgent'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'impact' | 'time'>('priority');
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [customViews, setCustomViews] = useState<SavedView[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_VIEWS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const categories: Array<{ id: TaskCategory | 'All'; label: string }> = [
    { id: 'All', label: t('list_category_all') },
    { id: 'Engineering', label: t('cat_Engineering') },
    { id: 'Product', label: t('cat_Product') },
    { id: 'Design', label: t('cat_Design') },
    { id: 'Operations', label: t('cat_Operations') },
    { id: 'Client', label: t('cat_Client') },
    { id: 'Marketing', label: t('cat_Marketing') },
    { id: 'Personal', label: t('cat_Personal') },
  ];

  useEffect(() => {
    try { localStorage.setItem(CUSTOM_VIEWS_STORAGE_KEY, JSON.stringify(customViews)); } catch {}
  }, [customViews]);

  const allViews = useMemo(() => [...BUILT_IN_VIEWS, ...customViews], [customViews]);
  const activeView = useMemo(
    () => allViews.find((v) => v.id === selectedViewId) || null,
    [allViews, selectedViewId]
  );

  const contextCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((task) => {
      (task.contexts || []).forEach((ctxId) => {
        counts[ctxId] = (counts[ctxId] || 0) + 1;
      });
    });
    return counts;
  }, [tasks]);

  const activeContexts = useMemo(() => {
    return CONTEXT_DEFINITIONS
      .filter((def) => (contextCounts[def.id] || 0) > 0)
      .map((def) => ({
        ...def,
        count: contextCounts[def.id],
        displayLabel: copy.contexts[def.id] ?? def.label,
      }));
  }, [contextCounts, copy]);

  const filteredTasks = useMemo(() => {
    let pool = tasks;
    if (activeView) pool = applyViewFilter(tasks, activeView.filter);

    return pool
      .filter((task) => {
        const matchesSearch =
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || task.category === selectedCategory;
        const matchesContext =
          selectedContext === null ||
          (task.contexts || []).includes(selectedContext);
        const matchesStatus =
          statusFilter === 'all'
            ? true
            : statusFilter === 'active'
            ? task.status !== 'completed'
            : statusFilter === 'completed'
            ? task.status === 'completed'
            : task.priority === 'urgent' && task.status !== 'completed';

        return matchesSearch && matchesCategory && matchesContext && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'impact') return b.impactScore - a.impactScore;
        if (sortBy === 'time') return a.estimatedMinutes - b.estimatedMinutes;
        const priorityOrder: Record<PriorityLevel, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }, [tasks, searchQuery, selectedCategory, selectedContext, statusFilter, sortBy, activeView]);

  const statusLabelMap: Record<'all' | 'active' | 'urgent' | 'completed', TranslationKey> = {
    all: 'list_status_all',
    active: 'list_status_active',
    urgent: 'list_status_urgent',
    completed: 'list_status_completed',
  };

  const handleSelectView = (viewId: string | null) => {
    triggerHaptic('medium');
    setSelectedViewId(viewId);
    if (viewId !== null) {
      setSearchQuery('');
      setSelectedCategory('All');
      setSelectedContext(null);
      setStatusFilter('all');
    }
  };

  const deselectViewOnManualChange = () => {
    if (selectedViewId !== null) setSelectedViewId(null);
  };

  const handleSaveCurrentFilter = () => {
    const name = window.prompt(copy.promptViewName);
    if (!name || !name.trim()) return;
    const newView: SavedView = {
      id: `view-${Date.now()}`,
      name: name.trim().slice(0, 30),
      emoji: '⭐',
      description: copy.customView,
      color: '#7C3AED',
      isBuiltIn: false,
      filter: {
        category: selectedCategory !== 'All' ? (selectedCategory as TaskCategory) : undefined,
        context: selectedContext || undefined,
        status:
          statusFilter === 'active'   ? 'active'   :
          statusFilter === 'completed'? 'completed':
          statusFilter === 'urgent'   ? 'active'   : 'all',
      },
    };
    setCustomViews((prev) => [...prev, newView]);
    triggerHaptic('success');
  };

  const handleDeleteCustomView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(copy.confirmDeleteView)) return;
    setCustomViews((prev) => prev.filter((v) => v.id !== viewId));
    if (selectedViewId === viewId) setSelectedViewId(null);
    triggerHaptic('medium');
  };

  return (
    <div id="priority-list-view" className="space-y-3.5 pb-4">
      {onQuickAdd && <NLPQuickAdd onCreate={onQuickAdd} />}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
          <input
            id="input-search-tasks"
            type="text"
            value={searchQuery}
            onChange={(e) => { deselectViewOnManualChange(); setSearchQuery(e.target.value); }}
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
            onClick={() => { triggerHaptic('medium'); onOpenVoiceTask(); }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600 text-white font-bold text-xs shadow-sm shadow-rose-500/20 active:scale-95 transition cursor-pointer shrink-0"
            title={t('ptt_btn_title')}
          >
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">{t('ptt_btn_title')}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          id="view-all"
          onClick={() => handleSelectView(null)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
            selectedViewId === null
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {copy.allTasks}
        </button>

        {allViews.map((view) => {
          const isSelected = selectedViewId === view.id;
          const displayName = translateViewName(view, copy);
          const displayDesc = translateViewDesc(view, copy);
          return (
            <button
              key={view.id}
              id={`view-${view.id}`}
              onClick={() => handleSelectView(isSelected ? null : view.id)}
              onContextMenu={(e) => !view.isBuiltIn && handleDeleteCustomView(view.id, e)}
              title={displayDesc}
              className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                isSelected ? 'text-white shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:opacity-90'
              }`}
              style={{
                backgroundColor: isSelected ? view.color : `${view.color}15`,
                borderWidth: 1,
                borderColor: isSelected ? view.color : `${view.color}55`,
              }}
            >
              <span>{view.emoji}</span>
              <span>{displayName}</span>
              {!view.isBuiltIn && (
                <span
                  onClick={(e) => handleDeleteCustomView(view.id, e)}
                  className={`ml-0.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full cursor-pointer transition ${
                    isSelected ? 'bg-white/25 hover:bg-white/40'
                              : 'bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          );
        })}

        <button
          id="view-save"
          onClick={handleSaveCurrentFilter}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-dashed border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          <Bookmark className="w-3 h-3" />
          <span>{copy.saveView}</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`filter-category-${String(cat.id).toLowerCase()}`}
              onClick={() => {
                triggerHaptic('light');
                deselectViewOnManualChange();
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

      {activeContexts.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            id="filter-context-all"
            onClick={() => {
              triggerHaptic('light');
              deselectViewOnManualChange();
              setSelectedContext(null);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
              selectedContext === null
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {copy.allContexts}
          </button>
          {activeContexts.map((ctx) => {
            const isSelected = selectedContext === ctx.id;
            return (
              <button
                key={ctx.id}
                id={`filter-context-${ctx.id}`}
                onClick={() => {
                  triggerHaptic('light');
                  deselectViewOnManualChange();
                  setSelectedContext(isSelected ? null : ctx.id);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/60'
                }`}
              >
                <span>{ctx.emoji}</span>
                <span>{ctx.displayLabel}</span>
                <span
                  className={`text-[9px] px-1 rounded font-black ${
                    isSelected ? 'bg-white/25 text-white'
                              : 'bg-violet-200/70 dark:bg-violet-900/60 text-violet-800 dark:text-violet-200'
                  }`}
                >
                  {ctx.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
          {(['all', 'active', 'urgent', 'completed'] as const).map((st) => (
            <button
              key={st}
              id={`filter-status-${st}`}
              onClick={() => {
                triggerHaptic('light');
                deselectViewOnManualChange();
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

      {activeView && (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px]"
          style={{
            backgroundColor: `${activeView.color}12`,
            border: `1px solid ${activeView.color}40`,
            color: activeView.color,
          }}
        >
          <span className="text-base">{activeView.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold">{translateViewName(activeView, copy)}</div>
            <div className="opacity-80 truncate">{translateViewDesc(activeView, copy)}</div>
          </div>
          <span className="font-black">{filteredTasks.length}</span>
        </div>
      )}

      <div className="space-y-2 pt-1">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-6">
            <Filter className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {activeView ? copy.noTasksInView.replace('{name}', translateViewName(activeView, copy)) : t('list_empty_title')}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {activeView ? translateViewDesc(activeView, copy) : t('list_empty_desc')}
            </p>
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
              onUpdateSubtasks={onUpdateSubtasks}
              onSaveAsTemplate={onSaveAsTemplate}
            />
          ))
        )}
      </div>
    </div>
  );
};