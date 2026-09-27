/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
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
      fireAt = dueTime; // <--- Fire EXACTLY at due time for the loud alarm
    } else {
      console.log('⏭️ Skipping overdue task:', task.title);
      return;
    }

    // 🔍 DEBUG LOGS
    console.log('🔍 DEBUG now =', new Date(now).toLocaleString(), '(' + now + ')');
    console.log('🔍 DEBUG dueTime =', new Date(dueTime).toLocaleString(), '(' + dueTime + ')');
    console.log('🔍 DEBUG fireAt =', new Date(fireAt).toLocaleString(), '(' + fireAt + ')');
    console.log('🔍 DEBUG diff (ms) =', fireAt - now);

    // --- Save pending alarm for tracking ---
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

    // --- Native Android: use ONLY the custom Java AlarmService now ---
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('🔔 Calling AlarmNative.startAlarm with fireAt=' + fireAt);
        await AlarmNative.startAlarm({
          title: task.title,
          taskId: task.id,
          fireAt: String(fireAt), // <--- Sending as String so Java gets the right number!
        });
        console.log('🔔 AlarmNative call returned successfully');
      } catch (nativeErr) {
        console.warn('Native alarm service not available:', nativeErr);
      }

      // --- Local Notification for 2 minutes BEFORE the due time (SILENT) ---
      try {
        const notifId = hashTaskId(task.id) + 1; // Different ID from native alarm
        await LocalNotifications.schedule({
          notifications: [{
            id: notifId,
            title: '⏰ Task Due Soon: ' + task.title,
            body: 'This task is due in 2 minutes.',
            schedule: { at: new Date(dueTime - 2 * 60 * 1000) }, // <--- EXACTLY 2 minutes before
            channelId: 'task-reminders-silent', // <--- Using the silent channel we just created
            smallIcon: 'ic_stat_onesignal_default',
            extra: { taskId: task.id },
          }]
        });
        console.log('🔔 Silent Notification scheduled for 2 mins before due time:', new Date(dueTime - 2 * 60 * 1000).toLocaleString());
      } catch (notifErr) {
        console.warn('Local notification failed:', notifErr);
      }
    }

    // --- Backend backup (for when phone is off) ---
    try {
      const userId = localStorage.getItem('taskflow_user_id') || 'test-user-123';
      const response = await fetch('http://localhost:5000/api/schedule-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalId: userId,
          title: task.title,
          dueTime: task.dueDate,
          taskId: task.id,
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
      // 1. Cancel the loud ring from Java
      try {
        await AlarmNative.stopAlarm({ taskId });
      } catch (e) {}

      // 2. Cancel the silent Local Notification
      try {
        await LocalNotifications.cancel({
          notifications: [{ id: hashTaskId(taskId) + 1 }]
        });
      } catch (e) {}

      // 3. Cancel the server-side scheduled push
      try {
        await fetch('http://localhost:5000/api/cancel-reminder', {
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

      // ✅ CREATE THE SILENT CHANNEL (This was the missing piece!)
      LocalNotifications.createChannel({
        id: 'task-reminders-silent',
        name: 'Silent Task Reminders',
        description: 'Silent heads-up before a task is due',
        importance: 2, // 2 = Low importance (No sound)
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
        // 1. Request permission
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        
        if (permStatus.receive !== 'granted') {
          console.warn('User denied push notification permission!');
          return;
        }

        // 2. Register with FCM
        await PushNotifications.register();

        // 3. Listen for the token
        PushNotifications.addListener('registration', async (token) => {
          console.log('📱 FCM TOKEN RECEIVED:', token.value);
          
          // Send token to our server!
          try {
            const userId = localStorage.getItem('taskflow_user_id') || 'test-user-123';
            const response = await fetch('http://localhost:5000/api/register-device', {
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

        // 4. Listen for push notifications arriving
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

  const handleToggleStatus = (taskId: string) => {
    cancelTaskReminder(taskId);
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