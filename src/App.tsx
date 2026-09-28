/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useDevicePerformance } from './hooks/useDevicePerformance';
import { Task, TabView, DeviceFrameMode, QuadrantId, Recurrence } from './types';
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

// ✅ Live server URL (deployed on Render)
const SERVER_URL = 'https://task-priority-server-pir6.onrender.com';

// ✅ Native Alarm plugin bridge (calls Java AlarmService)
const AlarmNative = registerPlugin<{
  startAlarm: (options: { title: string; taskId: string; fireAt?: string }) => Promise<{ success: boolean }>;
  stopAlarm: (options?: { taskId?: string }) => Promise<{ success: boolean }>;
}>('AlarmNative');

// Convert taskId string to a stable 32-bit int for LocalNotifications
const hashTaskId = (taskId: string): number => {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = ((hash << 5) - hash) + taskId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

// 🔁 Calculate the next due date for a recurring task
function computeNextDueDate(fromISO: string, rec: Recurrence): string | null {
  const from = new Date(fromISO);
  if (isNaN(from.getTime())) return null;
  const now = Date.now();

  const advance = (d: Date): Date => {
    const next = new Date(d.getTime());
    const interval = Math.max(1, rec.interval || 1);
    switch (rec.frequency) {
      case 'daily': {
        next.setDate(next.getDate() + interval);
        break;
      }
      case 'weekdays': {
        do {
          next.setDate(next.getDate() + 1);
        } while (next.getDay() === 0 || next.getDay() === 6);
        break;
      }
      case 'weekly': {
        const days = (rec.daysOfWeek && rec.daysOfWeek.length > 0) ? [...rec.daysOfWeek].sort((a,b) => a-b) : [from.getDay()];
        const curDay = next.getDay();
        let found: number | null = null;
        for (const day of days) {
          if (day > curDay) { found = day; break; }
        }
        if (found !== null) {
          next.setDate(next.getDate() + (found - curDay));
        } else {
          const daysUntilNextWeek = 7 - curDay + days[0];
          next.setDate(next.getDate() + daysUntilNextWeek + (interval - 1) * 7);
        }
        break;
      }
      case 'monthly': {
        const target = rec.dayOfMonth || from.getDate();
        next.setMonth(next.getMonth() + interval);
        const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(target, daysInMonth));
        break;
      }
      case 'yearly': {
        next.setFullYear(next.getFullYear() + interval);
        break;
      }
    }
    return next;
  };

  // Advance until the candidate is in the future
  let candidate = advance(from);
  let iterations = 0;
  while (candidate.getTime() <= now && iterations < 200) {
    candidate = advance(candidate);
    iterations++;
  }

  // Respect optional endDate
  if (rec.endDate) {
    const end = new Date(rec.endDate);
    if (!isNaN(end.getTime()) && candidate.getTime() > end.getTime()) {
      return null;
    }
  }

  return candidate.toISOString();
}

export default function App() {
  useDevicePerformance();
  const { uiDesign } = useUIDesign();

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return [];
  });

  const streakData = useStreak(tasks.filter((t) => t.status === 'completed').length);

  const activeTasks = tasks.filter((t) => !t.archivedAt);
  const archivedTasks = tasks.filter((t) => t.archivedAt);

  // --- SCHEDULE ALARM (native service + backend) ---
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
    } else {
      console.log('⏭️ Skipping overdue task:', task.title);
      return;
    }

    console.log('🔍 DEBUG now =', new Date(now).toLocaleString(), '(' + now + ')');
    console.log('🔍 DEBUG dueTime =', new Date(dueTime).toLocaleString(), '(' + dueTime + ')');
    console.log('🔍 DEBUG fireAt =', new Date(fireAt).toLocaleString(), '(' + fireAt + ')');
    console.log('🔍 DEBUG diff (ms) =', fireAt - now);

    try {
      const pendingAlarms = JSON.parse(localStorage.getItem('taskflow_pending_alarms') || '{}');
      pendingAlarms[hashTaskId(task.id)] = {
        fireAt,
        title: task.title,
        taskId: task.id,
      };
      localStorage.setItem('taskflow_pending_alarms', JSON.stringify(pendingAlarms));
    } catch (err) {
      console.warn('Failed to save pending alarm:', err);
    }

    if (Capacitor.isNativePlatform()) {
      try {
        console.log('🔔 Calling AlarmNative.startAlarm with fireAt=' + fireAt);
        await AlarmNative.startAlarm({
          title: task.title,
          taskId: task.id,
          fireAt: String(fireAt),
        });
        console.log('🔔 AlarmNative call returned successfully');
      } catch (nativeErr) {
        console.warn('Native alarm service not available:', nativeErr);
      }

      try {
        const notifId = hashTaskId(task.id) + 1;
        await LocalNotifications.schedule({
          notifications: [{
            id: notifId,
            title: '⏰ Task Due Soon: ' + task.title,
            body: 'This task is due in 2 minutes.',
            schedule: { at: new Date(dueTime - 2 * 60 * 1000) },
            channelId: 'task-reminders-silent',
            smallIcon: 'ic_stat_onesignal_default',
            extra: { taskId: task.id },
          }]
        });
        console.log('🔔 Silent Notification scheduled for 2 mins before due time:', new Date(dueTime - 2 * 60 * 1000).toLocaleString());
      } catch (notifErr) {
        console.warn('Local notification failed:', notifErr);
      }
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
          recurrence: task.recurrence, // 🔑 NEW: send recurrence rule to server
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        console.log('✅ Backend backup scheduled:', data.message);
      }
    } catch (err) {
      console.warn('Backend backup skipped (this is okay):', err);
    }
  };

  const cancelTaskReminder = async (taskId: string) => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      try {
        await AlarmNative.stopAlarm({ taskId });
      } catch (e) {}

      try {
        await LocalNotifications.cancel({
          notifications: [{ id: hashTaskId(taskId) + 1 }]
        });
      } catch (e) {}

      try {
        await fetch(`${SERVER_URL}/api/cancel-reminder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId }),
        });
        console.log('🗑️ Server timer cancelled for:', taskId);
      } catch (e) {
        console.warn('Server cancel skipped (offline):', e);
      }

      console.log('🗑️ Cancelled all alarms for:', taskId);
    } catch (err) {
      // ignore
    }
  };
  // ----------------------------------------

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions()
        .then((res) => console.log('LocalNotifications permission:', res))
        .catch((err) => console.warn('LocalNotifications error:', err));

      LocalNotifications.createChannel({
        id: 'task-reminders-silent',
        name: 'Silent Task Reminders',
        description: 'Silent heads-up before a task is due',
        importance: 2,
        visibility: 1,
        vibration: false,
        lights: true,
      }).catch((err) => console.warn('Failed to create silent channel:', err));
    }
  }, []);

  // --- SETUP PUSH NOTIFICATIONS (FCM) ---
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupPush = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('User denied push notification permission!');
          return;
        }

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          console.log('📱 FCM TOKEN RECEIVED:', token.value);

          try {
            const userId = localStorage.getItem('taskflow_user_id') || 'test-user-123';
            const response = await fetch(`${SERVER_URL}/api/register-device`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: userId, fcmToken: token.value }),
            });
            const data = await response.json();
            if (data.success) {
              console.log('✅ Token successfully registered with the server!');
            }
          } catch (err) {
            console.warn('Failed to register token with server:', err);
          }
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('🔔 Push notification received:', notification);
        });

      } catch (err) {
        console.error('Push setup failed:', err);
      }
    };

    setupPush();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    tasks.forEach((task) => {
      if (task.quadrant === 'do_first' && task.status !== 'completed' && task.dueDate) {
        scheduleTaskReminder(task);
      }
    });
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

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultQuadrant, setDefaultQuadrant] = useState<QuadrantId>('do_first');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isFocusTimerOpen, setIsFocusTimerOpen] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const due = getDueTasks(tasks);
      if (due.length > 0) {
        sendBrowserNotification('Tasks Due Today 📌', {
          body: `You have ${due.length} high-priority or scheduled task(s) for today.`,
        });
      }
    }
  }, []);

  // 🔁 Toggle status + auto-create next occurrence for recurring tasks
  const handleToggleStatus = (taskId: string) => {
    cancelTaskReminder(taskId);

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isNowDone = task.status !== 'completed';

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: isNowDone ? 'completed' : 'todo',
              completedAt: isNowDone ? new Date().toISOString() : undefined,
            }
          : t
      )
    );

    if (isNowDone) {
      playAudioChime('success');

      if (task.recurrence) {
        const nextDue = computeNextDueDate(task.dueDate, task.recurrence);
        if (nextDue) {
          const nextTask: Task = {
            ...task,
            id: `task-${Date.now()}-recur`,
            status: 'todo',
            dueDate: nextDue,
            createdAt: new Date().toISOString(),
            completedAt: undefined,
            archivedAt: undefined,
          };
          console.log('🔁 Auto-created next occurrence:', nextTask.title, '→', nextDue);
          setTasks((prev) => [nextTask, ...prev]);
          setTimeout(() => scheduleTaskReminder(nextTask), 100);
        } else {
          console.log('🔁 Recurrence ended (no more occurrences)');
        }
      }
    }
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
      cancelTaskReminder(taskData.id);
      const updatedTask = { ...taskData, id: taskData.id } as Task;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskData.id
            ? { ...t, ...taskData }
            : t
        )
      );
      scheduleTaskReminder({
        ...updatedTask,
        createdAt: new Date().toISOString(),
      } as Task);
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
    setEditingTask(null);
    setDefaultQuadrant(quadrant);
    setIsTaskModalOpen(true);
  };

  const handleRestoreFromArchive = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, archivedAt: undefined, status: 'todo' as const, completedAt: undefined }
          : t
      )
    );
  };

  const handlePermanentDelete = (taskId: string) => {
    cancelTaskReminder(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
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
                  onDeleteTask={handleDeleteTask}
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

          <BottomTabBar
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            urgentCount={urgentCount}
          />
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