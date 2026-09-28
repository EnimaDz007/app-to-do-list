/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useDevicePerformance } from './hooks/useDevicePerformance';
import { Task, TabView, DeviceFrameMode, QuadrantId, Habit, HabitCheckIn } from './types';
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
import { HabitModal } from './components/HabitModal';
import { HabitView } from './components/HabitView';
import { playAudioChime, getDueTasks, sendBrowserNotification } from './utils/notifications';
import { Mic } from 'lucide-react';
import { triggerHaptic } from './utils/haptics';

const STORAGE_KEY = 'taskflow_tasks_list';
const HABITS_STORAGE_KEY = 'taskflow_habits_list';
const CHECKINS_STORAGE_KEY = 'taskflow_habit_checkins';
const SERVER_URL = 'https://task-priority-server-pir6.onrender.com';

const AlarmNative = registerPlugin<{
  startAlarm: (options: { title: string; taskId: string; fireAt?: string }) => Promise<{ success: boolean }>;
  stopAlarm: (options?: { taskId?: string }) => Promise<{ success: boolean }>;
}>('AlarmNative');

const hashTaskId = (taskId: string): number => {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = ((hash << 5) - hash) + taskId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export default function App() {
  useDevicePerformance();
  const { uiDesign } = useUIDesign();

  // 🎯 Refs to prevent duplicate syncs on every mount/render
  const hasSyncedHabitsRef = useRef(false);
  const hasSyncedTasksRef = useRef(false);

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const saved = localStorage.getItem(HABITS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [checkIns, setCheckIns] = useState<HabitCheckIn[]>(() => {
    try {
      const saved = localStorage.getItem(CHECKINS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const streakData = useStreak(tasks.filter((t) => t.status === 'completed').length);
  const activeTasks = tasks.filter((t) => !t.archivedAt);
  const archivedTasks = tasks.filter((t) => t.archivedAt);

  // ---------- Task alarms ----------
  const scheduleTaskReminder = async (task: Task) => {
    if (task.quadrant !== 'do_first') return;
    if (task.status === 'completed') return;
    if (!task.dueDate) return;
    const dueTime = new Date(task.dueDate).getTime();
    if (isNaN(dueTime)) return;
    const now = Date.now();
    let fireAt: number;
    if (dueTime > now + 3000) {
      fireAt = dueTime;
    } else return;

    try {
      const pendingAlarms = JSON.parse(localStorage.getItem('taskflow_pending_alarms') || '{}');
      pendingAlarms[hashTaskId(task.id)] = { fireAt, title: task.title, taskId: task.id };
      localStorage.setItem('taskflow_pending_alarms', JSON.stringify(pendingAlarms));
    } catch {}

    if (Capacitor.isNativePlatform()) {
      try {
        await AlarmNative.startAlarm({ title: task.title, taskId: task.id, fireAt: String(fireAt) });
      } catch {}
      try {
        await LocalNotifications.schedule({
          notifications: [{
            id: hashTaskId(task.id) + 1,
            title: '⏰ Task Due Soon: ' + task.title,
            body: 'This task is due in 2 minutes.',
            schedule: { at: new Date(dueTime - 2 * 60 * 1000) },
            channelId: 'task-reminders-silent',
            smallIcon: 'ic_stat_onesignal_default',
            extra: { taskId: task.id },
          }]
        });
      } catch {}
    }

    try {
      const userId = localStorage.getItem('taskflow_user_id') || 'test-user-123';
      const response = await fetch(`${SERVER_URL}/api/schedule-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalId: userId,
          title: task.title,
          dueTime: task.dueDate,
          taskId: task.id,
          recurrence: task.recurrence,
          fullTask: task,
        }),
      });
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
    } catch (err) {
      console.warn('Backend backup skipped:', err);
    }
  };

  const cancelTaskReminder = async (taskId: string) => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      try { await AlarmNative.stopAlarm({ taskId }); } catch {}
      try { await LocalNotifications.cancel({ notifications: [{ id: hashTaskId(taskId) + 1 }] }); } catch {}
      try {
        await fetch(`${SERVER_URL}/api/cancel-reminder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId }),
        });
      } catch {}
    } catch {}
  };

  const completeTaskOnServer = async (taskId: string): Promise<Task | null> => {
    try {
      const response = await fetch(`${SERVER_URL}/api/complete-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      const data = await response.json();
      if (data.success && data.nextTask) return data.nextTask as Task;
    } catch (err) {
      console.warn('Complete on server failed:', err);
    }
    return null;
  };

  // ---------- Habit reminder sync ----------
  const syncHabitReminderToServer = async (habit: Habit) => {
    if (!Capacitor.isNativePlatform()) return;
    const userId = localStorage.getItem('taskflow_user_id') || 'test-user-123';
    try {
      if (habit.reminderEnabled && habit.reminderTime) {
        const tzOffset = new Date().getTimezoneOffset();
        await fetch(`${SERVER_URL}/api/schedule-habit-reminder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            habitId: habit.id,
            externalId: userId,
            name: habit.name,
            emoji: habit.emoji,
            reminderTime: habit.reminderTime,
            daysOfWeek: habit.daysOfWeek || null,
            timezoneOffsetMinutes: tzOffset,
          }),
        });
        console.log('✅ Habit reminder synced:', habit.name);
      } else {
        await fetch(`${SERVER_URL}/api/cancel-habit-reminder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ habitId: habit.id }),
        });
      }
    } catch (err) {
      console.warn('Habit reminder sync failed:', err);
    }
  };

  const cancelHabitReminderOnServer = async (habitId: string) => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await fetch(`${SERVER_URL}/api/cancel-habit-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId }),
      });
    } catch {}
  };

  // ---------- Notification setup ----------
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions().catch(() => {});
      LocalNotifications.createChannel({
        id: 'task-reminders-silent',
        name: 'Silent Task Reminders',
        description: 'Silent heads-up before a task is due',
        importance: 2,
        visibility: 1,
        vibration: false,
        lights: true,
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const setupPush = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') return;
        await PushNotifications.register();
        PushNotifications.addListener('registration', async (token) => {
          console.log('📱 FCM TOKEN RECEIVED:', token.value);
          try {
            const userId = localStorage.getItem('taskflow_user_id') || 'test-user-123';
            await fetch(`${SERVER_URL}/api/register-device`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, fcmToken: token.value }),
            });
          } catch {}
        });
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('🔔 Push received:', notification);
        });
      } catch {}
    };
    setupPush();
  }, []);

  // Sync tasks from server
  const syncTasksFromServer = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const userId = localStorage.getItem('taskflow_user_id') || 'test-user-123';
      const response = await fetch(`${SERVER_URL}/api/tasks/${userId}`);
      const data = await response.json();
      if (!data.success || !data.tasks) return;
      setTasks((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const newTasks: Task[] = [];
        for (const record of data.tasks) {
          if (record.fullTask && !existingIds.has(record.fullTask.id)) {
            newTasks.push(record.fullTask);
          }
        }
        if (newTasks.length === 0) return prev;
        return [...newTasks, ...prev];
      });
    } catch {}
  };

  useEffect(() => {
    syncTasksFromServer();
    const handler = () => { if (document.visibilityState === 'visible') syncTasksFromServer(); };
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('focus', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('focus', handler);
    };
  }, []);

  // 🎯 Re-sync ALL habit reminders on boot — ONLY ONCE per app session
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (hasSyncedHabitsRef.current) return; // 🔑 Skip if already synced this session
    hasSyncedHabitsRef.current = true;

    const active = habits.filter((h) => !h.archivedAt);
    active.forEach((h) => {
      if (h.reminderEnabled && h.reminderTime) {
        syncHabitReminderToServer(h);
      }
    });
    // eslint-disable-next-line
  }, []);

  // Schedule reminders for existing tasks — only once per session
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (hasSyncedTasksRef.current) return;
    hasSyncedTasksRef.current = true;

    tasks.forEach((task) => {
      if (task.quadrant === 'do_first' && task.status !== 'completed' && task.dueDate) {
        scheduleTaskReminder(task);
      }
    });
    // eslint-disable-next-line
  }, []);

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

  useEffect(() => {
    const handleTasksUpdated = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { try { setTasks(JSON.parse(saved)); } catch {} }
    };
    window.addEventListener('tasks-updated', handleTasksUpdated);
    return () => window.removeEventListener('tasks-updated', handleTasksUpdated);
  }, []);

  // Persist to localStorage
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {} }, [tasks]);
  useEffect(() => { try { localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits)); } catch {} }, [habits]);
  useEffect(() => { try { localStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(checkIns)); } catch {} }, [checkIns]);

  // ---------- UI State ----------
  const [activeTab, setActiveTab] = useState<TabView>('matrix');
  const [deviceMode, setDeviceMode] = useState<DeviceFrameMode>('iphone');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultQuadrant, setDefaultQuadrant] = useState<QuadrantId>('do_first');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isFocusTimerOpen, setIsFocusTimerOpen] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // ---------- Task handlers ----------
  const handleToggleStatus = async (taskId: string) => {
    cancelTaskReminder(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const isNowDone = task.status !== 'completed';

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: isNowDone ? 'completed' : 'todo', completedAt: isNowDone ? new Date().toISOString() : undefined }
          : t
      )
    );

    if (isNowDone) {
      playAudioChime('success');
      const nextTask = await completeTaskOnServer(taskId);
      if (nextTask) {
        setTasks((prev) => [nextTask, ...prev]);
        setTimeout(() => scheduleTaskReminder(nextTask), 200);
      }
    }
  };

  const handleMoveTaskQuadrant = (taskId: string, targetQuadrant: QuadrantId) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, quadrant: targetQuadrant } : t)));
    playAudioChime('beep');
  };

  const handleImportTasks = (newTasks: Task[], mode: 'replace' | 'append') => {
    if (mode === 'replace') setTasks(newTasks);
    else setTasks((prev) => [...newTasks, ...prev]);
  };

  const handleStartFocus = (task: Task) => { setFocusTask(task); setIsFocusTimerOpen(true); };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => {
    if (taskData.id) {
      cancelTaskReminder(taskData.id);
      const updatedTask = { ...taskData, id: taskData.id } as Task;
      setTasks((prev) => prev.map((t) => (t.id === taskData.id ? { ...t, ...taskData } : t)));
      scheduleTaskReminder({ ...updatedTask, createdAt: new Date().toISOString() } as Task);
      playAudioChime('beep');
    } else {
      const newTask: Task = {
        ...taskData,
        id: `task-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [newTask, ...prev]);
      scheduleTaskReminder(newTask);
      playAudioChime('beep');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    cancelTaskReminder(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    playAudioChime('beep');
  };

  const handleOpenNewTask = (quadrant: QuadrantId = 'do_first') => {
    setEditingTask(null); setDefaultQuadrant(quadrant); setIsTaskModalOpen(true);
  };

  const handleRestoreFromArchive = (taskId: string) => {
    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, archivedAt: undefined, status: 'todo' as const, completedAt: undefined } : t
    ));
  };

  const handlePermanentDelete = (taskId: string) => {
    cancelTaskReminder(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleEditTask = (task: Task) => { setEditingTask(task); setIsTaskModalOpen(true); };

  // ---------- Habit handlers ----------
  const handleSaveHabit = (habitData: Omit<Habit, 'id' | 'createdAt'> & { id?: string }) => {
    if (habitData.id) {
      const updatedHabit = { ...habitData, id: habitData.id } as Habit;
      setHabits((prev) => prev.map((h) => (h.id === habitData.id ? updatedHabit : h)));
      syncHabitReminderToServer(updatedHabit);
    } else {
      const newHabit: Habit = {
        ...habitData,
        id: `habit-${Date.now()}`,
        createdAt: new Date().toISOString(),
      } as Habit;
      setHabits((prev) => [newHabit, ...prev]);
      if (newHabit.reminderEnabled && newHabit.reminderTime) {
        syncHabitReminderToServer(newHabit);
      }
    }
    triggerHaptic('success');
  };

  const handleDeleteHabit = (habitId: string) => {
    cancelHabitReminderOnServer(habitId);
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setCheckIns((prev) => prev.filter((ci) => ci.habitId !== habitId));
    triggerHaptic('success');
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setIsHabitModalOpen(true);
  };

  const handleToggleCheckIn = (habitId: string, date: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    setCheckIns((prev) => {
      const existing = prev.find((ci) => ci.habitId === habitId && ci.date === date);

      if (habit.goalType === 'count') {
        if (!existing) return prev;
        if (existing.count <= 1) {
          return prev.filter((ci) => ci.id !== existing.id);
        }
        return prev.map((ci) => ci.id === existing.id ? { ...ci, count: ci.count - 1 } : ci);
      } else {
        if (existing) return prev.filter((ci) => ci.id !== existing.id);
        return [...prev, {
          id: `${habitId}_${date}`,
          habitId, date, count: 1,
          completedAt: new Date().toISOString(),
        }];
      }
    });
  };

  const handleIncrementCount = (habitId: string, date: string) => {
    setCheckIns((prev) => {
      const existing = prev.find((ci) => ci.habitId === habitId && ci.date === date);
      if (existing) {
        return prev.map((ci) =>
          ci.id === existing.id
            ? { ...ci, count: ci.count + 1, completedAt: new Date().toISOString() }
            : ci
        );
      }
      return [...prev, {
        id: `${habitId}_${date}`,
        habitId, date, count: 1,
        completedAt: new Date().toISOString(),
      }];
    });
  };

  const handleOpenNewHabit = () => {
    setEditingHabit(null);
    setIsHabitModalOpen(true);
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const urgentCount = tasks.filter((t) => t.quadrant === 'do_first' && t.status !== 'completed').length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 overflow-x-hidden w-full">
      <OfflineIndicator />
      <div className="flex-1 flex flex-col w-full">
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 min-h-full transition-colors">
          <Header
            completedCount={completedCount}
            totalCount={tasks.length}
            streakCount={streakData.currentStreak}
            deviceMode={deviceMode}
            onSetDeviceMode={setDeviceMode}
            onOpenNewTask={() => handleOpenNewTask('do_first')}
            onOpenVoiceTask={() => setIsVoiceModalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenFocusTimer={() => { setFocusTask(null); setIsFocusTimerOpen(true); }}
          />
          <main className="flex-1 px-4 py-3.5 pb-24 overflow-y-auto">
            {activeTab === 'matrix' && (
              uiDesign === 'neumorphic' ? (
                <SoftNeumorphicView tasks={activeTasks} onToggleStatus={handleToggleStatus} onDeleteTask={handleDeleteTask} />
              ) : uiDesign === 'stacked' ? (
                <StackedCardsView tasks={activeTasks} onToggleStatus={handleToggleStatus} onDeleteTask={handleDeleteTask} />
              ) : uiDesign === 'tarot' ? (
                <TarotDeckView tasks={activeTasks} onToggleStatus={handleToggleStatus} onDeleteTask={handleDeleteTask} />
              ) : uiDesign === 'radial' ? (
                <CircularRadialView tasks={activeTasks} onToggleStatus={handleToggleStatus} onDeleteTask={handleDeleteTask} />
              ) : uiDesign === 'hive' ? (
                <HoneycombHiveView tasks={activeTasks} onToggleStatus={handleToggleStatus} onDeleteTask={handleDeleteTask} />
              ) : uiDesign === 'vending' ? (
                <VendingMachineView tasks={activeTasks} onToggleStatus={handleToggleStatus} onDeleteTask={handleDeleteTask} />
              ) : uiDesign === 'detective' ? (
                <DetectiveBoardView tasks={activeTasks} onToggleStatus={handleToggleStatus} onDeleteTask={handleDeleteTask} />
              ) : (
                <PriorityMatrixView tasks={activeTasks} onToggleStatus={handleToggleStatus} onDeleteTask={handleDeleteTask} onQuadrantSelect={setDefaultQuadrant} />
              )
            )}
            {activeTab === 'list' && (
              <PriorityListView tasks={tasks} onToggleStatus={handleToggleStatus} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} onOpenNewTask={() => handleOpenNewTask('do_first')} onOpenVoiceTask={() => setIsVoiceModalOpen(true)} onStartFocus={handleStartFocus} onMoveTaskQuadrant={handleMoveTaskQuadrant} />
            )}
            {activeTab === 'timeline' && <DailyTimelineView tasks={tasks} onToggleStatus={handleToggleStatus} />}
            {activeTab === 'analytics' && <ProgressAnalyticsView tasks={tasks} />}
            {activeTab === 'habits' && (
              <HabitView
                habits={habits}
                checkIns={checkIns}
                onToggleCheckIn={handleToggleCheckIn}
                onIncrementCount={handleIncrementCount}
                onEditHabit={handleEditHabit}
                onDeleteHabit={handleDeleteHabit}
                onOpenNewHabit={handleOpenNewHabit}
              />
            )}
            {activeTab === 'archive' && <ArchiveView tasks={tasks} onRestore={handleRestoreFromArchive} onDelete={handlePermanentDelete} />}
            {activeTab === 'export' && <NativePackagingHub onOpenInstallModal={() => setIsInstallModalOpen(true)} />}
          </main>
          {activeTab !== 'habits' && (
            <FloatingActionButton onNewTask={() => handleOpenNewTask(defaultQuadrant)} onPushToTalk={() => setIsVoiceModalOpen(true)} />
          )}
          <BottomTabBar activeTab={activeTab} onChangeTab={setActiveTab} urgentCount={urgentCount} />
        </div>
      </div>

      <VoiceTaskModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        quadrant={defaultQuadrant}
        onAddTask={(text, quad, detectedDue) => {
          handleSaveTask({
            title: text,
            description: '',
            quadrant: quad,
            status: 'todo',
            priority: 'urgent',
            category: 'Engineering',
            estimatedMinutes: 30,
            dueDate: detectedDue || new Date(Date.now() + 3600000).toISOString(),
            impactScore: 3,
            effortScore: 3,
          } as any);
        }}
      />

      <TaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onSaveTask={handleSaveTask} editingTask={editingTask} defaultQuadrant={defaultQuadrant} />

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => { setIsHabitModalOpen(false); setEditingHabit(null); }}
        onSaveHabit={handleSaveHabit}
        editingHabit={editingHabit}
      />

      <PWAInstallModal isOpen={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} />
      <FocusTimerWidget isOpen={isFocusTimerOpen} onClose={() => setIsFocusTimerOpen(false)} activeTask={focusTask} onCompleteTask={(taskId) => { handleToggleStatus(taskId); setIsFocusTimerOpen(false); }} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} tasks={tasks} onImportTasks={handleImportTasks} onOpenInstallModal={() => setIsInstallModalOpen(true)} />
    </div>
  );
}