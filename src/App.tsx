/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useDevicePerformance } from './hooks/useDevicePerformance';
import { Task, TabView, DeviceFrameMode, QuadrantId } from './types';
import { INITIAL_TASKS } from './data/initialTasks';
import { Header } from './components/Header';
import { BottomTabBar } from './components/BottomTabBar';
import { ArchiveView } from './components/ArchiveView';
import { useStreak } from './hooks/useStreak';
import { FloatingActionButton } from './components/FloatingActionButton';
import { PriorityMatrixView } from './components/PriorityMatrixView';
import { SoftNeumorphicView } from './components/SoftNeumorphicView';
import { StackedCardsView } from './components/StackedCardsView';
import { TarotDeckView } from './components/TarotDeckView';
import { CircularRadialView } from './components/CircularRadialView';
import { HoneycombHiveView } from './components/HoneycombHiveView';
import { VendingMachineView } from './components/VendingMachineView';
import { DetectiveBoardView } from './components/DetectiveBoardView';
import { useUIDesign } from './hooks/useUIDesign';
import { PriorityListView } from './components/PriorityListView';
import { DailyTimelineView } from './components/DailyTimelineView';
import { ProgressAnalyticsView } from './components/ProgressAnalyticsView';
import { NativePackagingHub } from './components/NativePackagingHub';
import { TaskModal } from './components/TaskModal';
import { VoiceTaskModal } from './components/VoiceTaskModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MobileDeviceFrame } from './components/MobileDeviceFrame';
import { FocusTimerWidget } from './components/FocusTimerWidget';
import { SettingsModal } from './components/SettingsModal';
import { playAudioChime, getDueTasks, sendBrowserNotification } from './utils/notifications';
import { Mic } from 'lucide-react';
import { triggerHaptic } from './utils/haptics';

const STORAGE_KEY = 'taskflow_tasks_list';

export default function App() {
  useDevicePerformance();
  const { uiDesign } = useUIDesign();

  // Load tasks from localStorage or initialize with website defaults
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore JSON parse errors
    }
    return [];
  });

  const streakData = useStreak(tasks.filter((t) => t.status === 'completed').length);

  // Split tasks into active and archived
  const activeTasks = tasks.filter((t) => !t.archivedAt);
  const archivedTasks = tasks.filter((t) => t.archivedAt);

  // Auto-archive completed tasks after 2 seconds
  useEffect(() => {
    const completedOnes = tasks.filter(
      (t) => t.status === 'completed' && !t.archivedAt && t.completedAt
    );
    if (completedOnes.length === 0) return;

    const timer = setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.status === 'completed' && !t.archivedAt && t.completedAt) {
            return { ...t, archivedAt: t.completedAt };
          }
          return t;
        })
      );
    }, 2000);

    return () => clearTimeout(timer);
  }, [tasks]);

  // Listen for updates from PriorityMatrixView (pin, subtask changes)
  useEffect(() => {
    const handleTasksUpdated = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setTasks(JSON.parse(saved));
        } catch (e) {}
      }
    };
    window.addEventListener('tasks-updated', handleTasksUpdated);
    return () => window.removeEventListener('tasks-updated', handleTasksUpdated);
  }, []);

  const [activeTab, setActiveTab] = useState<TabView>('matrix');
  const [deviceMode, setDeviceMode] = useState<DeviceFrameMode>('iphone');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultQuadrant, setDefaultQuadrant] = useState<QuadrantId>('do_first');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isFocusTimerOpen, setIsFocusTimerOpen] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // ignore storage quota errors
    }
  }, [tasks]);

  // Check for due tasks and notify if permission granted
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const due = getDueTasks(tasks);
      if (due.length > 0) {
        sendBrowserNotification('Tasks Due Today 📌', {
          body: `You have ${due.length} high-priority or scheduled task(s) for today.`,
        });
      }
    }
  }, []);

  // Task manipulation handlers
  const handleToggleStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          const isNowDone = task.status !== 'completed';
          if (isNowDone) {
            playAudioChime('success');
          }
          return {
            ...task,
            status: isNowDone ? 'completed' : 'todo',
            completedAt: isNowDone ? new Date().toISOString() : undefined,
          };
        }
        return task;
      })
    );
  };

  const handleMoveTaskQuadrant = (taskId: string, targetQuadrant: QuadrantId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, quadrant: targetQuadrant } : t))
    );
    playAudioChime('beep');
  };

  const handleImportTasks = (newTasks: Task[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setTasks(newTasks);
    } else {
      setTasks((prev) => [...newTasks, ...prev]);
    }
  };

  const handleStartFocus = (task: Task) => {
    setFocusTask(task);
    setIsFocusTimerOpen(true);
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => {
    if (taskData.id) {
      // Editing existing task
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskData.id
            ? {
                ...t,
                ...taskData,
              }
            : t
        )
      );
      playAudioChime('beep');
    } else {
      // Creating new task
      const newTask: Task = {
        ...taskData,
        id: `task-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [newTask, ...prev]);
      playAudioChime('beep');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    playAudioChime('beep');
  };

  const handleOpenNewTask = (quadrant: QuadrantId = 'do_first') => {
    setEditingTask(null);
    setDefaultQuadrant(quadrant);
    setIsTaskModalOpen(true);
  };

  // ✅ RESTORE from archive → back to active
  const handleRestoreFromArchive = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, archivedAt: undefined, status: 'todo' as const, completedAt: undefined }
          : t
      )
    );
  };

  // ✅ PERMANENTLY DELETE archived task
  const handlePermanentDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const urgentCount = tasks.filter((t) => t.quadrant === 'do_first' && t.status !== 'completed').length;
  // --- LOCAL REMINDER NOTIFICATIONS ---
  const notifiedTasksRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkDueTasks = () => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const now = Date.now();

      tasks.forEach((task) => {
        if (task.quadrant !== 'do_first' || task.status === 'completed') return;
        if (!task.dueDate) return;
        if (notifiedTasksRef.current.has(task.id)) return;

        const dueTime = new Date(task.dueDate).getTime();
        if (isNaN(dueTime)) return;

        const diffInMinutes = (dueTime - now) / (1000 * 60);

        if (diffInMinutes > 0 && diffInMinutes <= 15) {
          new Notification('⏰ Task Reminder', {
            body: `"${task.title}" is due in ${Math.round(diffInMinutes)} minute${Math.round(diffInMinutes) === 1 ? '' : 's'}!`,
            icon: '/pwa-192x192.png',
            tag: task.id,
          });
          notifiedTasksRef.current.add(task.id);
        }
      });
    };

    const interval = setInterval(checkDueTasks, 60000);
    checkDueTasks();

    return () => clearInterval(interval);
  }, [tasks]);
  // ------------------------------------

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 overflow-x-hidden w-full">
      <OfflineIndicator />

      <div className="flex-1 flex flex-col w-full">
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 min-h-full transition-colors">
          {/* Mobile App Header */}
          <Header
            completedCount={completedCount}
            totalCount={tasks.length}
            streakCount={streakData.currentStreak}
            deviceMode={deviceMode}
            onSetDeviceMode={setDeviceMode}
            onOpenNewTask={() => handleOpenNewTask('do_first')}
            onOpenVoiceTask={() => setIsVoiceModalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenFocusTimer={() => {
              setFocusTask(null);
              setIsFocusTimerOpen(true);
            }}
          />

          <main className="flex-1 px-4 py-3.5 pb-24 overflow-y-auto">
            {activeTab === 'matrix' && (
              uiDesign === 'neumorphic' ? (
                <SoftNeumorphicView
                  tasks={activeTasks}
                  onToggleStatus={handleToggleStatus}
                  onDeleteTask={handleDeleteTask}
                />
              ) : uiDesign === 'stacked' ? (
                <StackedCardsView
                  tasks={activeTasks}
                  onToggleStatus={handleToggleStatus}
                  onDeleteTask={handleDeleteTask}
                />
              ) : uiDesign === 'tarot' ? (
                <TarotDeckView
                  tasks={activeTasks}
                  onToggleStatus={handleToggleStatus}
                  onDeleteTask={handleDeleteTask}
                />
              ) : uiDesign === 'radial' ? (
    <CircularRadialView
      tasks={activeTasks}
      onToggleStatus={handleToggleStatus}
      onDeleteTask={handleDeleteTask}
    />
  ) : uiDesign === 'hive' ? (
    <HoneycombHiveView
      tasks={activeTasks}
      onToggleStatus={handleToggleStatus}
      onDeleteTask={handleDeleteTask}
    />
                 ) : uiDesign === 'vending' ? (
    <VendingMachineView
      tasks={activeTasks}
      onToggleStatus={handleToggleStatus}
      onDeleteTask={handleDeleteTask}
    />
                ) : uiDesign === 'detective' ? (
    <DetectiveBoardView
      tasks={activeTasks}
      onToggleStatus={handleToggleStatus}
      onDeleteTask={handleDeleteTask}
    />
                
              ) : (
                <PriorityMatrixView
                  tasks={activeTasks}
                  onToggleStatus={handleToggleStatus}
                  onQuadrantSelect={setDefaultQuadrant}

                />
              )
            )}

            {activeTab === 'list' && (
              <PriorityListView
                tasks={tasks}
                onToggleStatus={handleToggleStatus}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onOpenNewTask={() => handleOpenNewTask('do_first')}
                onOpenVoiceTask={() => setIsVoiceModalOpen(true)}
                onStartFocus={handleStartFocus}
                onMoveTaskQuadrant={handleMoveTaskQuadrant}
              />
            )}

            {activeTab === 'timeline' && (
              <DailyTimelineView
                tasks={tasks}
                onToggleStatus={handleToggleStatus}
              />
            )}

            {activeTab === 'analytics' && (
              <ProgressAnalyticsView tasks={tasks} />
            )}

            {activeTab === 'archive' && (
              <ArchiveView
                tasks={tasks}
                onRestore={handleRestoreFromArchive}
                onDelete={handlePermanentDelete}
              />
            )}

            {activeTab === 'export' && (
              <NativePackagingHub onOpenInstallModal={() => setIsInstallModalOpen(true)} />
            )}
          </main>

          <FloatingActionButton
            onNewTask={() => handleOpenNewTask(defaultQuadrant)}
            onPushToTalk={() => setIsVoiceModalOpen(true)}
          />

          {/* Bottom Tab Bar */}
          <BottomTabBar
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            urgentCount={urgentCount}
          />
        </div>
      </div>

      {/* Modals */}
      <VoiceTaskModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        quadrant={defaultQuadrant}
        onAddTask={(text, quad) => {
         handleSaveTask({
  title: text,
  description: '',
  quadrant: quad,
  status: 'todo',
  priority: 'urgent',
  category: 'Engineering',
  estimatedMinutes: 30,
  dueDate: new Date(Date.now() + 3600000).toISOString(),
  impactScore: 3,
  effortScore: 3,
} as any);
          }}
        />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSaveTask={handleSaveTask}
        editingTask={editingTask}
        defaultQuadrant={defaultQuadrant}
      />

      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      <FocusTimerWidget
        isOpen={isFocusTimerOpen}
        onClose={() => setIsFocusTimerOpen(false)}
        activeTask={focusTask}
        onCompleteTask={(taskId) => {
          handleToggleStatus(taskId);
          setIsFocusTimerOpen(false);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        tasks={tasks}
        onImportTasks={handleImportTasks}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />
    </div>
  );
}
