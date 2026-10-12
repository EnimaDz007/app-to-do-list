import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, ChevronDown, ChevronRight, MoreVertical, Pencil, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { Project, Task, PriorityLevel } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { triggerHaptic } from '../utils/haptics';
import { ProjectFormData } from './ProjectModal';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  onNewProject: () => void;
  onQuickAddProject: (data: ProjectFormData) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onArchiveProject: (id: string, archive: boolean) => void;
  onTaskClick: (task: Task) => void;
}

type LocalLang = 'en' | 'fr' | 'ar';

type Preset = { name: string; emoji: string; color: string };

const PRESETS: Record<LocalLang, Preset[]> = {
  en: [
    { name: 'Work',     emoji: '💼', color: '#6366f1' },
    { name: 'Personal', emoji: '🏠', color: '#8b5cf6' },
    { name: 'Health',   emoji: '🏋️', color: '#10b981' },
  ],
  fr: [
    { name: 'Travail',   emoji: '💼', color: '#6366f1' },
    { name: 'Personnel', emoji: '🏠', color: '#8b5cf6' },
    { name: 'Santé',     emoji: '🏋️', color: '#10b981' },
  ],
  ar: [
    { name: 'العمل',   emoji: '💼', color: '#6366f1' },
    { name: 'شخصي',    emoji: '🏠', color: '#8b5cf6' },
    { name: 'الصحة',   emoji: '🏋️', color: '#10b981' },
  ],
};

const COPY: Record<LocalLang, {
  title: string;
  emptyTitle: string;
  emptyBody: string;
  emptyFilterHint: string;
  quickStart: string;
  archivedSection: string;
  noTasks: string;
  active: string;
  done: string;
  tasks: string;
  task: string;
  project: string;
  projects: string;
  back: string;
  edit: string;
  delete: string;
  archive: string;
  unarchive: string;
  deleteConfirmTitle: string;
  deleteConfirmBody: string;
  cancel: string;
  confirmDelete: string;
  newProjectAria: string;
  projectMenuAria: string;
  priority: { urgent: string; high: string; medium: string; low: string };
  completedLabel: string;
}> = {
  en: {
    title: 'Projects',
    emptyTitle: 'No projects yet',
    emptyBody: 'Group related tasks into projects — like "Work", "Health", or "Reading". Tap + to create your first one, or pick a preset below.',
    emptyFilterHint: 'Add a task from the main tab and assign it to this project.',
    quickStart: 'Quick start',
    archivedSection: 'Archived',
    noTasks: 'No tasks',
    active: 'active',
    done: 'done',
    tasks: 'tasks',
    task: 'task',
    project: 'project',
    projects: 'projects',
    back: 'Back',
    edit: 'Edit',
    delete: 'Delete',
    archive: 'Archive',
    unarchive: 'Unarchive',
    deleteConfirmTitle: 'Delete this project?',
    deleteConfirmBody: 'Tasks assigned to it will be unassigned, but not deleted.',
    cancel: 'Cancel',
    confirmDelete: 'Delete',
    newProjectAria: 'New project',
    projectMenuAria: 'Project menu',
    priority: { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' },
    completedLabel: 'Completed',
  },
  fr: {
    title: 'Projets',
    emptyTitle: 'Aucun projet',
    emptyBody: 'Regroupez vos tâches par projet — comme « Travail », « Santé » ou « Lecture ». Appuyez sur + ou choisissez un modèle ci-dessous.',
    emptyFilterHint: 'Ajoutez une tâche depuis l’onglet principal et assignez-la à ce projet.',
    quickStart: 'Démarrage rapide',
    archivedSection: 'Archivés',
    noTasks: 'Aucune tâche',
    active: 'en cours',
    done: 'terminées',
    tasks: 'tâches',
    task: 'tâche',
    project: 'projet',
    projects: 'projets',
    back: 'Retour',
    edit: 'Modifier',
    delete: 'Supprimer',
    archive: 'Archiver',
    unarchive: 'Désarchiver',
    deleteConfirmTitle: 'Supprimer ce projet ?',
    deleteConfirmBody: 'Les tâches associées seront désassignées mais pas supprimées.',
    cancel: 'Annuler',
    confirmDelete: 'Supprimer',
    newProjectAria: 'Nouveau projet',
    projectMenuAria: 'Menu du projet',
    priority: { urgent: 'Urgent', high: 'Élevé', medium: 'Moyen', low: 'Faible' },
    completedLabel: 'Terminée',
  },
  ar: {
    title: 'المشاريع',
    emptyTitle: 'لا توجد مشاريع',
    emptyBody: 'جمّع مهامك في مشاريع — مثل "العمل" أو "الصحة" أو "القراءة". اضغط + أو اختر نموذجاً جاهزاً أدناه.',
    emptyFilterHint: 'أضف مهمة من علامة التبويب الرئيسية واختر هذا المشروع.',
    quickStart: 'بداية سريعة',
    archivedSection: 'المؤرشفة',
    noTasks: 'لا توجد مهام',
    active: 'نشطة',
    done: 'مكتملة',
    tasks: 'مهام',
    task: 'مهمة',
    project: 'مشروع',
    projects: 'مشاريع',
    back: 'رجوع',
    edit: 'تعديل',
    delete: 'حذف',
    archive: 'أرشفة',
    unarchive: 'إلغاء الأرشفة',
    deleteConfirmTitle: 'حذف هذا المشروع؟',
    deleteConfirmBody: 'ستُلغى المهام المرتبطة به دون حذفها.',
    cancel: 'إلغاء',
    confirmDelete: 'حذف',
    newProjectAria: 'مشروع جديد',
    projectMenuAria: 'قائمة المشروع',
    priority: { urgent: 'عاجل', high: 'عالي', medium: 'متوسط', low: 'منخفض' },
    completedLabel: 'مكتملة',
  },
};

const PRIORITY_STYLES: Record<PriorityLevel, { bg: string; text: string }> = {
  urgent: { bg: 'bg-red-100 dark:bg-red-950/40',       text: 'text-red-600 dark:text-red-400' },
  high:   { bg: 'bg-indigo-100 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400' },
  medium: { bg: 'bg-amber-100 dark:bg-amber-950/40',   text: 'text-amber-600 dark:text-amber-400' },
  low:    { bg: 'bg-slate-100 dark:bg-slate-800',      text: 'text-slate-600 dark:text-slate-300' },
};

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  tasks,
  onNewProject,
  onQuickAddProject,
  onEditProject,
  onDeleteProject,
  onArchiveProject,
  onTaskClick,
}) => {
  const { language } = useLanguage();
  const lang = (language as LocalLang) || 'en';
  const copy = COPY[lang] ?? COPY.en;
  const isRtl = lang === 'ar';

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const allVisibleProjects = useMemo(
    () => projects.filter((p) => !p.deletedAt),
    [projects]
  );
  const activeProjects = useMemo(
    () => allVisibleProjects.filter((p) => !p.archivedAt),
    [allVisibleProjects]
  );
  const archivedProjects = useMemo(
    () => allVisibleProjects.filter((p) => !!p.archivedAt),
    [allVisibleProjects]
  );

  const visibleTasks = useMemo(
    () => tasks.filter((t) => !t.deletedAt),
    [tasks]
  );

  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of visibleTasks) {
      if (!t.projectId) continue;
      if (!map.has(t.projectId)) map.set(t.projectId, []);
      map.get(t.projectId)!.push(t);
    }
    return map;
  }, [visibleTasks]);

  const totalProjects = activeProjects.length;
  const totalTasks = useMemo(() => {
    let n = 0;
    for (const p of activeProjects) n += (tasksByProject.get(p.id) || []).length;
    return n;
  }, [activeProjects, tasksByProject]);

  const selectedProject = useMemo(
    () => (selectedProjectId ? allVisibleProjects.find((p) => p.id === selectedProjectId) || null : null),
    [selectedProjectId, allVisibleProjects]
  );

  const filteredActiveTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return visibleTasks
      .filter((t) => t.projectId === selectedProjectId && !t.archivedAt && t.status !== 'completed')
      .sort((a, b) => {
        if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      });
  }, [selectedProjectId, visibleTasks]);

  const filteredDoneTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return visibleTasks
      .filter((t) => t.projectId === selectedProjectId && !t.archivedAt && t.status === 'completed')
      .sort((a, b) => {
        const ad = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bd = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bd - ad;
      });
  }, [selectedProjectId, visibleTasks]);

  const openProject = (id: string) => {
    triggerHaptic('medium');
    setSelectedProjectId(id);
  };

  const goBack = () => {
    triggerHaptic('light');
    setSelectedProjectId(null);
  };

  const openMenu = (id: string) => {
    triggerHaptic('light');
    setMenuProjectId(id);
  };

  const closeMenu = () => setMenuProjectId(null);

  const handleEdit = (project: Project) => {
    triggerHaptic('medium');
    setMenuProjectId(null);
    onEditProject(project);
  };

  const handleArchiveToggle = (project: Project) => {
    triggerHaptic('medium');
    setMenuProjectId(null);
    onArchiveProject(project.id, !project.archivedAt);
    if (selectedProjectId === project.id) setSelectedProjectId(null);
  };

  const requestDelete = (id: string) => {
    triggerHaptic('medium');
    setMenuProjectId(null);
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (!confirmDeleteId) return;
    triggerHaptic('heavy');
    onDeleteProject(confirmDeleteId);
    setConfirmDeleteId(null);
    if (selectedProjectId === confirmDeleteId) setSelectedProjectId(null);
  };

  const handleNew = () => {
    triggerHaptic('medium');
    onNewProject();
  };

  const handleQuickAdd = (preset: Preset) => {
    triggerHaptic('medium');
    onQuickAddProject({ name: preset.name, emoji: preset.emoji, color: preset.color });
  };

  const getCounts = (projectId: string) => {
    const list = tasksByProject.get(projectId) || [];
    const activeCount = list.filter((t) => !t.archivedAt && t.status !== 'completed').length;
    const doneCount = list.filter((t) => !t.archivedAt && t.status === 'completed').length;
    return { activeCount, doneCount };
  };

  const subtitleFor = (activeCount: number, doneCount: number) => {
    if (activeCount === 0 && doneCount === 0) return copy.noTasks;
    const parts: string[] = [];
    if (activeCount > 0) parts.push(`${activeCount} ${copy.active}`);
    if (doneCount > 0) parts.push(`${doneCount} ${copy.done}`);
    return parts.join(' · ');
  };

  const formatDue = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (diffDays === 0) return lang === 'ar' ? 'اليوم' : lang === 'fr' ? "Aujourd'hui" : 'Today';
    if (diffDays === 1) return lang === 'ar' ? 'غدًا' : lang === 'fr' ? 'Demain' : 'Tomorrow';
    if (diffDays === -1) return lang === 'ar' ? 'أمس' : lang === 'fr' ? 'Hier' : 'Yesterday';
    return d.toLocaleDateString(lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr-FR' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // ── Reusable card renderer (active + archived use same look, archived just dims) ──
  const renderProjectCard = (project: Project, isArchived: boolean) => {
    const { activeCount, doneCount } = getCounts(project.id);
    return (
      <motion.div
        key={project.id}
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: isArchived ? 0.55 : 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative"
      >
        <button
          onClick={() => openProject(project.id)}
          className="w-full text-start rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 pb-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer relative overflow-hidden"
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3 shadow-sm"
            style={{ backgroundColor: project.color, filter: isArchived ? 'grayscale(0.5)' : undefined }}
          >
            <span className="drop-shadow-sm">{project.emoji}</span>
          </div>

          <div className="text-[14px] font-black text-slate-900 dark:text-white tracking-tight mb-0.5 truncate pe-7">
            {project.name}
          </div>

          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
            {subtitleFor(activeCount, doneCount)}
          </div>

          <div
            className="absolute start-0 end-0 bottom-0 h-[3px] opacity-90"
            style={{ backgroundColor: project.color, opacity: isArchived ? 0.4 : 0.9 }}
          />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            openMenu(project.id);
          }}
          className="absolute top-3 end-3 w-7 h-7 rounded-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
          aria-label={copy.projectMenuAria}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </motion.div>
    );
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {selectedProject ? (
          // ══════════════════════════════════════════════════
          //   FILTERED VIEW
          // ══════════════════════════════════════════════════
          <motion.div
            key={`filter-${selectedProject.id}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={goBack}
                className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer rtl:rotate-180"
                aria-label={copy.back}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: selectedProject.color }}
                >
                  <span className="drop-shadow-sm">{selectedProject.emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {selectedProject.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {subtitleFor(filteredActiveTasks.length, filteredDoneTasks.length)}
                  </div>
                </div>
              </div>
            </div>

            {filteredActiveTasks.length === 0 && filteredDoneTasks.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="text-5xl mb-3 opacity-40">📝</div>
                <div className="text-sm font-black text-slate-700 dark:text-slate-200 mb-1">
                  {copy.noTasks}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                  {copy.emptyFilterHint}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredActiveTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    copy={copy}
                    onClick={() => {
                      triggerHaptic('light');
                      onTaskClick(task);
                    }}
                    formatDue={formatDue}
                  />
                ))}

                {filteredDoneTasks.length > 0 && filteredActiveTasks.length > 0 && (
                  <div className="pt-4 pb-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 px-3">
                      {copy.done}
                    </div>
                  </div>
                )}

                {filteredDoneTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    copy={copy}
                    onClick={() => {
                      triggerHaptic('light');
                      onTaskClick(task);
                    }}
                    formatDue={formatDue}
                  />
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          // ══════════════════════════════════════════════════
          //   GRID VIEW
          // ══════════════════════════════════════════════════
          <motion.div
            key="grid"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {copy.title}
                </h1>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {totalProjects > 0
                    ? `${totalProjects} ${totalProjects === 1 ? copy.project : copy.projects} · ${totalTasks} ${totalTasks === 1 ? copy.task : copy.tasks}`
                    : copy.emptyTitle}
                </div>
              </div>
              <button
                onClick={handleNew}
                className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                aria-label={copy.newProjectAria}
              >
                <Plus className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>

            {allVisibleProjects.length === 0 ? (
              <div className="py-6">
                <div className="text-center px-6 mb-8">
                  <div className="text-5xl mb-3 opacity-40">📁</div>
                  <div className="text-base font-black text-slate-700 dark:text-slate-200 mb-2">
                    {copy.emptyTitle}
                  </div>
                  <div className="text-[12px] text-slate-500 dark:text-slate-400 max-w-[300px] mx-auto leading-relaxed">
                    {copy.emptyBody}
                  </div>
                </div>

                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 text-center mb-3">
                  {copy.quickStart}
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {(PRESETS[lang] || PRESETS.en).map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleQuickAdd(preset)}
                      className="flex flex-col items-center gap-2.5 p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition cursor-pointer group"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-105"
                        style={{ backgroundColor: preset.color }}
                      >
                        <span className="drop-shadow-sm">{preset.emoji}</span>
                      </div>
                      <div className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate w-full text-center">
                        {preset.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {activeProjects.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {activeProjects.map((p) => renderProjectCard(p, false))}
                  </div>
                )}

                {archivedProjects.length > 0 && (
                  <div className="mt-6">
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        setShowArchived((v) => !v);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isRtl ? (
                          showArchived ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronLeft className="w-4 h-4 text-slate-500" />
                        ) : (
                          showArchived ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                          {copy.archivedSection}
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 tabular-nums">
                        {archivedProjects.length}
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {showArchived && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-2 gap-3 pt-3">
                            {archivedProjects.map((p) => renderProjectCard(p, true))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action sheet ── */}
      <AnimatePresence>
        {menuProjectId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
              className="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              dir={isRtl ? 'rtl' : 'ltr'}
              className="fixed bottom-0 left-0 right-0 z-[81] rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>

              {(() => {
                const project = allVisibleProjects.find((p) => p.id === menuProjectId);
                if (!project) return null;
                const isArchived = !!project.archivedAt;
                return (
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-3 px-3 py-3 mb-1">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                        style={{ backgroundColor: project.color }}
                      >
                        {project.emoji}
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                        {project.name}
                      </div>
                    </div>

                    <button
                      onClick={() => handleEdit(project)}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer text-start"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center shrink-0">
                        <Pencil className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {copy.edit}
                      </div>
                    </button>

                    <button
                      onClick={() => handleArchiveToggle(project)}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer text-start"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                        {isArchived ? (
                          <ArchiveRestore className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {isArchived ? copy.unarchive : copy.archive}
                      </div>
                    </button>

                    <button
                      onClick={() => requestDelete(project.id)}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer text-start"
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="text-sm font-black text-red-600 dark:text-red-400">
                        {copy.delete}
                      </div>
                    </button>
                  </div>
                );
              })()}

              <div style={{ height: 'env(safe-area-inset-bottom)' }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Confirm delete ── */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-5"
            onClick={() => setConfirmDeleteId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              dir={isRtl ? 'rtl' : 'ltr'}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight text-center mb-2">
                {copy.deleteConfirmTitle}
              </h3>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-5">
                {copy.deleteConfirmBody}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setConfirmDeleteId(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {copy.cancel}
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-black shadow-lg shadow-red-600/20 transition cursor-pointer"
                >
                  {copy.confirmDelete}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//   TASK ROW
// ─────────────────────────────────────────────────────────────

type TaskRowCopy = {
  priority: { urgent: string; high: string; medium: string; low: string };
  completedLabel: string;
};

interface TaskRowProps {
  task: Task;
  copy: TaskRowCopy;
  onClick: () => void;
  formatDue: (iso?: string) => string;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, copy, onClick, formatDue }) => {
  const isDone = task.status === 'completed';
  const pri = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.low;
  const priLabel = copy.priority[task.priority] || copy.priority.low;
  const dueText = formatDue(task.dueDate);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-start"
    >
      <div
        className={`w-5 h-5 mt-0.5 shrink-0 rounded-full border-2 flex items-center justify-center transition ${
          isDone
            ? 'bg-indigo-600 border-indigo-600'
            : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        {isDone && (
          <svg
            viewBox="0 0 24 24"
            className="w-3 h-3"
            fill="none"
            stroke="white"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={`text-[13px] font-bold tracking-tight leading-snug mb-1 ${
            isDone
              ? 'text-slate-400 dark:text-slate-600 line-through'
              : 'text-slate-900 dark:text-white'
          }`}
        >
          {task.title}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isDone && (
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${pri.bg} ${pri.text}`}
            >
              {priLabel}
            </span>
          )}
          {dueText && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {dueText}
            </span>
          )}
          {isDone && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              ✓ {copy.completedLabel}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};