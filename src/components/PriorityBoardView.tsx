import React, { useState } from 'react';
import { Plus, MoreVertical, Check, Clock, Calendar, Flame, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, QuadrantId, Subtask, CONTEXT_DEFINITIONS } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import { SubtaskList } from './SubtaskList';

interface PriorityBoardViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onMoveTaskQuadrant: (taskId: string, targetQuadrant: QuadrantId) => void;
  onOpenNewTask: (quadrant: QuadrantId) => void;
  onUpdateSubtasks?: (taskId: string, nextSubtasks: Subtask[]) => void;
}

interface ColumnConfig {
  id: QuadrantId;
  emoji: string;
  color: string;
  colorLight: string;
  colorPale: string;
}

const COLUMNS: ColumnConfig[] = [
  { id: 'do_first',  emoji: '🔥', color: '#E11D48', colorLight: '#FB7185', colorPale: '#FFE4E6' },
  { id: 'schedule',  emoji: '📅', color: '#4F46E5', colorLight: '#818CF8', colorPale: '#E0E7FF' },
  { id: 'delegate',  emoji: '👥', color: '#059669', colorLight: '#34D399', colorPale: '#D1FAE5' },
  { id: 'eliminate', emoji: '🗑️', color: '#64748B', colorLight: '#94A3B8', colorPale: '#F1F5F9' },
];

type LocalLang = 'en' | 'fr' | 'ar';

const COPY: Record<LocalLang, {
  boardTitle: string;
  boardSubtitle: string;
  activeCount: string;
  empty: string;
  moveTo: string;
  addBtn: string;
  tomorrow: string;
  contexts: Record<string, string>;
}> = {
  en: {
    boardTitle: 'Priority Board',
    boardSubtitle: 'Drag cards between quadrants · tap ⋮ on mobile',
    activeCount: '{n} active',
    empty: 'Empty',
    moveTo: 'Move to',
    addBtn: 'Add',
    tomorrow: 'Tomorrow',
    contexts: { home: 'Home', work: 'Work', call: 'Call', computer: 'Deep Work', errand: 'Errand', health: 'Health' },
  },
  fr: {
    boardTitle: 'Tableau des priorités',
    boardSubtitle: 'Glissez les cartes entre les quadrants · appuyez sur ⋮ sur mobile',
    activeCount: '{n} actives',
    empty: 'Vide',
    moveTo: 'Déplacer vers',
    addBtn: 'Ajouter',
    tomorrow: 'Demain',
    contexts: { home: 'Maison', work: 'Travail', call: 'Appel', computer: 'Travail profond', errand: 'Courses', health: 'Santé' },
  },
  ar: {
    boardTitle: 'لوح الأولويات',
    boardSubtitle: 'اسحب البطاقات بين الأرباع · اضغط ⋮ على الجوال',
    activeCount: '{n} نشطة',
    empty: 'فارغ',
    moveTo: 'نقل إلى',
    addBtn: 'إضافة',
    tomorrow: 'غداً',
    contexts: { home: 'المنزل', work: 'العمل', call: 'مكالمة', computer: 'عمل عميق', errand: 'مشاوير', health: 'الصحة' },
  },
};

function formatDue(iso: string, lang: LocalLang, tomorrowLabel: string): { text: string; overdue: boolean; soon: boolean } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { text: '', overdue: false, soon: false };
  const now = Date.now();
  const diff = d.getTime() - now;
  const overdue = diff < 0;
  const soon = !overdue && diff < 86400000;

  const locale = lang === 'ar' ? 'ar-EG' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const timeStr = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });

  const sameDay = new Date().toDateString() === d.toDateString();
  if (sameDay) return { text: timeStr, overdue, soon };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow.toDateString() === d.toDateString()) return { text: `${tomorrowLabel} ${timeStr}`, overdue, soon };

  const monthDay = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  return { text: `${monthDay} ${timeStr}`, overdue, soon };
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-rose-500',
  high: 'bg-amber-500',
  medium: 'bg-sky-500',
  low: 'bg-slate-400',
};

export const PriorityBoardView: React.FC<PriorityBoardViewProps> = ({
  tasks, onToggleStatus, onEditTask, onMoveTaskQuadrant, onOpenNewTask, onUpdateSubtasks,
}) => {
  const { t, language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;

  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
  const [subtaskTaskId, setSubtaskTaskId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState<QuadrantId | null>(null);

  const tasksByQuadrant = (qid: QuadrantId) => tasks.filter((x) => x.quadrant === qid && x.status !== 'completed');
  const completedByQuadrant = (qid: QuadrantId) => tasks.filter((x) => x.quadrant === qid && x.status === 'completed').length;

  const getContextMeta = (id: string) => {
    const found = CONTEXT_DEFINITIONS.find((c) => c.id === id);
    if (!found) return { emoji: '🏷️', label: id };
    return { emoji: found.emoji, label: copy.contexts[id] ?? found.label };
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', taskId); } catch {}
  };

  const handleDragEnd = () => { setDraggedTaskId(null); setDragOverQuadrant(null); };

  const handleDragOver = (e: React.DragEvent, qid: QuadrantId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverQuadrant !== qid) setDragOverQuadrant(qid);
  };

  const handleDragLeave = (qid: QuadrantId) => { if (dragOverQuadrant === qid) setDragOverQuadrant(null); };

  const handleDrop = (e: React.DragEvent, qid: QuadrantId) => {
    e.preventDefault();
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
    if (taskId) { triggerHaptic('medium'); onMoveTaskQuadrant(taskId, qid); }
    setDraggedTaskId(null);
    setDragOverQuadrant(null);
  };

  const handleMove = (taskId: string, targetQid: QuadrantId) => {
    triggerHaptic('medium');
    onMoveTaskQuadrant(taskId, targetQid);
    setMenuTaskId(null);
  };

  return (
    <div className="w-full flex flex-col" style={{ minHeight: 'calc(100dvh - 180px)' }}>
      <div className="flex-shrink-0 px-1 pb-3 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">{copy.boardTitle}</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{copy.boardSubtitle}</p>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {copy.activeCount.replace('{n}', String(tasks.filter((x) => x.status !== 'completed').length))}
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-2 lg:grid-cols-4 gap-2 pb-4">
        {COLUMNS.map((col) => {
          const colTasks = tasksByQuadrant(col.id);
          const doneCount = completedByQuadrant(col.id);
          const totalCount = colTasks.length + doneCount;
          const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
          const isDragOver = dragOverQuadrant === col.id;

          return (
            <div key={col.id} onDragOver={(e) => handleDragOver(e, col.id)} onDragLeave={() => handleDragLeave(col.id)} onDrop={(e) => handleDrop(e, col.id)} className={`flex flex-col rounded-2xl border-2 transition-all min-h-0 ${isDragOver ? 'ring-4 ring-offset-1 ring-offset-transparent' : 'border-transparent'}`} style={{ backgroundColor: isDragOver ? `${col.color}15` : undefined, borderColor: isDragOver ? col.color : undefined }}>
              <div className="flex flex-col flex-1 min-h-0 rounded-2xl border overflow-hidden" style={{ backgroundColor: `${col.color}08`, borderColor: `${col.color}25` }}>
                <div className="px-2.5 py-2 border-b flex-shrink-0" style={{ borderColor: `${col.color}25` }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{col.emoji}</span>
                    <span className="text-[11px] font-black tracking-tight uppercase truncate" style={{ color: col.color }}>{t(`quad_${col.id}`)}</span>
                    <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0" style={{ backgroundColor: `${col.color}22`, color: col.color }}>{colTasks.length}</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: `${col.color}15` }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: col.color }} />
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1.5">
                  {colTasks.length === 0 && !isDragOver && (
                    <div className="py-6 text-center">
                      <div className="text-2xl opacity-30 mb-1">{col.emoji}</div>
                      <p className="text-[10px] text-slate-400 italic">{copy.empty}</p>
                    </div>
                  )}

                  {colTasks.map((task) => {
                    const due = task.dueDate ? formatDue(task.dueDate, lang, copy.tomorrow) : null;
                    const isMenuOpen = menuTaskId === task.id;
                    const isDragging = draggedTaskId === task.id;
                    const subs = task.subtasks || [];
                    const subsDone = subs.filter((s) => s.done).length;
                    const isSubOpen = subtaskTaskId === task.id;

                    return (
                      <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} onDragEnd={handleDragEnd} className={`relative group rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-xs transition-all cursor-grab active:cursor-grabbing hover:shadow-md ${isDragging ? 'opacity-40' : ''}`} style={{ borderLeftWidth: 3, borderLeftColor: col.color }}>
                        <div className="p-2">
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="hidden lg:block w-3 h-3 text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" />

                            <button onClick={(e) => { e.stopPropagation(); triggerHaptic('success'); onToggleStatus(task.id); }} className="w-4 h-4 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all hover:scale-110 cursor-pointer" style={{ borderColor: col.color, backgroundColor: 'transparent' }} aria-label={t('card_mark_complete')}>
                              <Check className="w-2.5 h-2.5 opacity-0 group-hover:opacity-30 transition-opacity" style={{ color: col.color }} strokeWidth={4} />
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); triggerHaptic('light'); onEditTask(task); }} className="flex-1 min-w-0 text-left rtl:text-right cursor-pointer">
                              <p className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">{task.title}</p>

                              <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-500 dark:text-slate-400">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] || PRIORITY_DOT.medium}`} />
                                <span className="truncate">{t(`cat_${task.category}`)}</span>
                              </div>

                              {task.contexts && task.contexts.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {task.contexts.slice(0, 3).map((ctxId) => {
                                    const meta = getContextMeta(ctxId);
                                    return (
                                      <span key={ctxId} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8.5px] font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300">
                                        <span>{meta.emoji}</span>
                                        <span className="truncate max-w-[40px]">{meta.label}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {due && due.text && (
                                <div className={`flex items-center gap-1 mt-1 text-[9px] font-semibold ${due.overdue ? 'text-rose-600 dark:text-rose-400' : due.soon ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                  <Clock className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{due.text}</span>
                                </div>
                              )}
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); triggerHaptic('light'); setMenuTaskId(isMenuOpen ? null : task.id); }} className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer" aria-label={copy.moveTo}>
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {onUpdateSubtasks && (
                            <button onClick={(e) => { e.stopPropagation(); triggerHaptic('light'); setSubtaskTaskId(isSubOpen ? null : task.id); }} className="mt-1.5 ml-5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold transition cursor-pointer" style={{ background: `${col.color}18`, color: col.color }}>
                              <span>📋</span>
                              <span>{subsDone} / {subs.length}</span>
                              {isSubOpen ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                            </button>
                          )}
                        </div>

                        <AnimatePresence>
                          {isMenuOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuTaskId(null); }} />
                              <motion.div initial={{ opacity: 0, scale: 0.9, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -5 }} transition={{ duration: 0.12 }} className="absolute right-1 top-8 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[150px]">
                                <div className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700">{copy.moveTo}</div>
                                {COLUMNS.filter((c) => c.id !== task.quadrant).map((target) => (
                                  <button key={target.id} onClick={(e) => { e.stopPropagation(); handleMove(task.id, target.id); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left rtl:text-right text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer">
                                    <span>{target.emoji}</span>
                                    <span style={{ color: target.color }}>{t(`quad_${target.id}`)}</span>
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>

                        {isSubOpen && onUpdateSubtasks && (
                          <div draggable={false} onClick={(e) => e.stopPropagation()} className="border-t border-dashed border-slate-200 dark:border-slate-700 px-2.5 py-2">
                            <SubtaskList subtasks={subs} onChange={(next) => onUpdateSubtasks(task.id, next)} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button onClick={() => { triggerHaptic('medium'); onOpenNewTask(col.id); }} className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer border border-dashed" style={{ borderColor: `${col.color}40`, color: col.color }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${col.color}10`; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}>
                    <Plus className="w-3 h-3" />
                    <span>{copy.addBtn}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};