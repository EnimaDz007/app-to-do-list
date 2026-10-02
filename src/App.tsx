/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useDevicePerformance } from './hooks/useDevicePerformance';
import { Task, TabView, DeviceFrameMode, QuadrantId, Habit, HabitCheckIn, Milestone, DelegateStatus, Subtask, Template } from './types';
import { INITIAL_TASKS } from './data/initialTasks';
import { getDefaultTemplates } from './data/defaultTemplates';
import { loadTemplates, saveTemplates, makeTemplateFromTask } from './utils/templateHelpers';
import { Header } from './components/Header';
import { BottomTabBar } from './components/BottomTabBar';
import { ArchiveView } from './components/ArchiveView';
import { useStreak } from './hooks/useStreak';
import { useKarma } from './hooks/useKarma';
import { KarmaView } from './components/KarmaView';
import { OnboardingScreen } from './components/OnboardingScreen';
import { FloatingActionButton } from './components/FloatingActionButton';
import { PriorityMatrixView } from './components/PriorityMatrixView';
import { SoftNeumorphicView } from './components/SoftNeumorphicView';
import { StackedCardsView } from './components/StackedCardsView';
import { TarotDeckView } from './components/TarotDeckView';
import { CircularRadialView } from './components/CircularRadialView';
import { HoneycombHiveView } from './components/HoneycombHiveView';
import { VendingMachineView } from './components/VendingMachineView';
import { DetectiveBoardView } from './components/DetectiveBoardView';
import { PriorityBoardView } from './components/PriorityBoardView';
import { useUIDesign } from './hooks/useUIDesign';
import { useThemeTransition } from './hooks/useThemeTransition';
import { ThemeTransitionOverlay } from './components/ThemeTransitionOverlay';
import { PriorityListView } from './components/PriorityListView';
import { CalendarHubView } from './components/CalendarHubView';
import { MoreSheet } from './components/MoreSheet';
import { ProgressAnalyticsView } from './components/ProgressAnalyticsView';
import { WeeklyReviewView } from './components/WeeklyReviewView';
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
import { CommandPalette, CommandItem } from './components/CommandPalette';
import { MilestoneBanner } from './components/MilestoneBanner';
import { MilestoneModal } from './components/MilestoneModal';
import { DelegateShareModal } from './components/DelegateShareModal';
import { useTheme } from './context/ThemeContext';
import { useLanguage } from './context/LanguageContext';
import {
  playAudioChime,
  getDueTasks,
  sendBrowserNotification,
  registerNotificationActions,
  snoozeTaskReminder,
  TASK_ACTION_TYPE,
  ACTION_SNOOZE,
  ACTION_DONE,
} from './utils/notifications';
import {
  DailyDigestConfig,
  DEFAULT_DIGEST_CONFIG,
  getDigestNotificationIds,
  computeDigestSchedule,
  buildDigestBody,
} from './utils/dailyDigest';
import {
  EscalationConfig,
  DEFAULT_ESCALATION_CONFIG,
  scheduleNagsForTask,
  cancelNagsForTask,
  NAG_CHANNEL_ID,
} from './utils/escalatingNags';
import { getDelegateStatus } from './utils/delegateShare';
import { syncWidgetData } from './utils/widgetBridge';
import { Mic } from 'lucide-react';
import { triggerHaptic } from './utils/haptics';

const STORAGE_KEY = 'taskflow_tasks_list';
const HABITS_STORAGE_KEY = 'taskflow_habits_list';
const CHECKINS_STORAGE_KEY = 'taskflow_habit_checkins';
const MILESTONES_STORAGE_KEY = 'taskflow_milestones';
const DAILY_DIGEST_STORAGE_KEY = 'taskflow_daily_digest';
const ESCALATION_STORAGE_KEY = 'taskflow_escalation';
const ONBOARDING_SEEN_KEY = 'taskflow_onboarding_seen';
const SERVER_URL = 'https://task-priority-server-pir6.onrender.com';

const OVERDUE_NOTIFICATION_ID = 999_998;

const KARMA_PER_QUADRANT: Record<QuadrantId, number> = {
  do_first: 5,
  schedule: 3,
  delegate: 2,
  eliminate: 1,
};

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

const computeNextDueDate = (dueDate: string | undefined, recurrence: string): string => {
  const base = dueDate ? new Date(dueDate) : new Date();
  const next = new Date(base);
  switch (recurrence) {
    case 'daily':   next.setDate(next.getDate() + 1); break;
    case 'weekly':  next.setDate(next.getDate() + 7); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
    case 'yearly':  next.setFullYear(next.getFullYear() + 1); break;
    default:        next.setDate(next.getDate() + 1);
  }
  return next.toISOString();
};

async function scheduleDailyDigests(config: DailyDigestConfig, tasks: Task[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({
      notifications: getDigestNotificationIds().map((id) => ({ id })),
    });
  } catch { /* noop */ }
  if (!config.enabled) return;
  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return;
    }
  } catch { return; }
  const occurrences = computeDigestSchedule(config.time);
  if (occurrences.length === 0) return;
  const notifications = occurrences.map(({ id, when }) => ({
    id,
    title: '🌅 Morning Digest',
    body: buildDigestBody(when, tasks),
    schedule: { at: when },
    extra: { type: 'digest' },
  }));
  try {
    await LocalNotifications.schedule({ notifications });
  } catch (err) {
    console.warn('Failed to schedule daily digests:', err);
  }
}

export default function App() {
  useDevicePerformance();
  const { uiDesign } = useUIDesign();
  const themeTransition = useThemeTransition();
  const { toggleTheme } = useTheme();
  const { language } = useLanguage();

  const hasSyncedHabitsRef = useRef(false);
  const hasSyncedTasksRef = useRef(false);

  const tasksRef = useRef<Task[]>([]);
  const escalationRef = useRef<EscalationConfig>(DEFAULT_ESCALATION_CONFIG);
  const handleToggleStatusRef = useRef<((id: string) => Promise<void>) | null>(null);

  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    try {
      const seen = localStorage.getItem(ONBOARDING_SEEN_KEY);
      return seen !== 'true';
    } catch {
      return true;
    }
  });

  const handleOnboardingComplete = () => {
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    } catch {}
    setShowOnboarding(false);
    triggerHaptic('success');
  };

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

  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    try {
      const saved = localStorage.getItem(MILESTONES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [customTemplates, setCustomTemplates] = useState<Template[]>(() => loadTemplates());

  const [dailyDigest, setDailyDigest] = useState<DailyDigestConfig>(() => {
    try {
      const saved = localStorage.getItem(DAILY_DIGEST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          enabled: !!parsed.enabled,
          time: typeof parsed.time === 'string' ? parsed.time : DEFAULT_DIGEST_CONFIG.time,
        };
      }
    } catch {}
    return DEFAULT_DIGEST_CONFIG;
  });

  const [escalation, setEscalation] = useState<EscalationConfig>(() => {
    try {
      const saved = localStorage.getItem(ESCALATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (['off', 'gentle', 'normal', 'aggressive'].includes(parsed.intensity)) {
          return { intensity: parsed.intensity };
        }
      }
    } catch {}
    return DEFAULT_ESCALATION_CONFIG;
  });

  const allTemplates = useMemo<Template[]>(
    () => [...getDefaultTemplates(language as 'en' | 'fr' | 'ar'), ...customTemplates],
    [customTemplates, language]
  );

  const streakData = useStreak(tasks.filter((t) => t.status === 'completed').length);
  const karma = useKarma(tasks, habits, checkIns, milestones, streakData.currentStreak);
  const activeTasks = tasks.filter((t) => !t.archivedAt);
  const archivedTasks = tasks.filter((t) => t.archivedAt);

  const [karmaPopup, setKarmaPopup] = useState<{ id: number; amount: number } | null>(null);
  const showKarmaPopup = (amount: number) => {
    if (amount === 0) return;
    const id = Date.now();
    setKarmaPopup({ id, amount });
    setTimeout(() => {
      setKarmaPopup((prev) => (prev?.id === id ? null : prev));
    }, 1400);
  };

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
            actionTypeId: TASK_ACTION_TYPE,
            extra: { taskId: task.id, quadrant: task.quadrant },
          }]
        });
      } catch {}

      try {
        await scheduleNagsForTask(task, escalationRef.current.intensity);
      } catch (err) {
        console.warn('Nag scheduling failed:', err);
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
      try { await cancelNagsForTask(taskId); } catch {}
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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
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
    LocalNotifications.createChannel({
      id: NAG_CHANNEL_ID,
      name: 'Escalating Nags',
      description: 'Repeated reminders for overdue tasks',
      importance: 4,
      visibility: 1,
      vibration: true,
      lights: true,
    }).catch(() => {});

    registerNotificationActions();
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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (hasSyncedHabitsRef.current) return;
    hasSyncedHabitsRef.current = true;

    const active = habits.filter((h) => !h.archivedAt);
    active.forEach((h) => {
      if (h.reminderEnabled && h.reminderTime) {
        syncHabitReminderToServer(h);
      }
    });
    // eslint-disable-next-line
  }, []);

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
    if (!Capacitor.isNativePlatform()) return;

    const overdue = tasks.filter((t) =>
      t.quadrant === 'do_first' &&
      t.status !== 'completed' &&
      !t.archivedAt &&
      t.dueDate &&
      new Date(t.dueDate).getTime() < Date.now()
    );

    if (overdue.length === 0) {
      LocalNotifications.cancel({
        notifications: [{ id: OVERDUE_NOTIFICATION_ID }],
      }).catch(() => {});
      return;
    }

    const preview = overdue.slice(0, 3).map((t) => `• ${t.title}`).join('\n');
    const extraLine = overdue.length > 3 ? `\n…and ${overdue.length - 3} more` : '';

    LocalNotifications.schedule({
      notifications: [{
        id: OVERDUE_NOTIFICATION_ID,
        title: `⚠️ ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
        body: preview + extraLine,
        schedule: { at: new Date(Date.now() + 500) },
        channelId: 'task-reminders-silent',
        extra: { type: 'overdue' },
      }],
    }).catch(() => {});
  }, [tasks]);

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

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {} }, [tasks]);
  useEffect(() => { try { localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits)); } catch {} }, [habits]);
  useEffect(() => { try { localStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(checkIns)); } catch {} }, [checkIns]);
  useEffect(() => { try { localStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(milestones)); } catch {} }, [milestones]);
  useEffect(() => { try { localStorage.setItem(DAILY_DIGEST_STORAGE_KEY, JSON.stringify(dailyDigest)); } catch {} }, [dailyDigest]);
  useEffect(() => { try { localStorage.setItem(ESCALATION_STORAGE_KEY, JSON.stringify(escalation)); } catch {} }, [escalation]);
  useEffect(() => { saveTemplates(customTemplates); }, [customTemplates]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void syncWidgetData(
        tasks,
        streakData.currentStreak,
        karma.total,
        karma.level.emoji,
        karma.level.name,
        karma.progressToNext,
      );
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [tasks, streakData.currentStreak, karma.total, karma.level.emoji, karma.level.name, karma.progressToNext]);

  useEffect(() => {
    scheduleDailyDigests(dailyDigest, tasksRef.current);
    // eslint-disable-next-line
  }, [dailyDigest]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scheduleDailyDigests(dailyDigest, tasksRef.current);
    }, 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
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
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isCmdkOpen, setIsCmdkOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [delegatedTaskShare, setDelegatedTaskShare] = useState<Task | null>(null);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isKarmaOpen, setIsKarmaOpen] = useState(false);

  const handleShareTask = (task: Task) => {
    setDelegatedTaskShare(task);
  };

  const handleDelegateIdCreated = (taskId: string, delegateId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, delegateId, delegateStatus: 'pending' }
          : t
      )
    );
    setDelegatedTaskShare((prev) =>
      prev && prev.id === taskId ? { ...prev, delegateId, delegateStatus: 'pending' } : prev
    );
  };

  const handleDelegateStatusChanged = (
    taskId: string,
    status: DelegateStatus,
    completedBy?: string
  ) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const next: Task = { ...t, delegateStatus: status };
        if (status === 'completed') {
          next.delegateCompletedBy = completedBy || 'recipient';
          next.delegateCompletedAt = new Date().toISOString();
        }
        return next;
      })
    );
    setDelegatedTaskShare((prev) =>
      prev && prev.id === taskId ? { ...prev, delegateStatus: status, delegateCompletedBy: completedBy } : prev
    );

    if (status === 'completed') {
      const task = tasksRef.current.find((t) => t.id === taskId);
      if (task && task.status !== 'completed') {
        setTimeout(() => {
          handleToggleStatusRef.current?.(taskId);
        }, 400);
      }
    }
  };

  useEffect(() => {
    const checkDelegates = async () => {
      const pendingDelegates = tasksRef.current.filter(
        (t) => t.delegateId && t.status !== 'completed' && t.delegateStatus !== 'completed'
      );
      if (pendingDelegates.length === 0) return;
      for (const task of pendingDelegates) {
        if (!task.delegateId) continue;
        const res = await getDelegateStatus(task.delegateId);
        if (!res) continue;
        if (res.status !== task.delegateStatus) {
          handleDelegateStatusChanged(task.id, res.status, res.completedBy);
        }
      }
    };

    const initialTimer = setTimeout(checkDelegates, 3000);
    const handler = () => {
      if (document.visibilityState === 'visible') checkDelegates();
    };
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('focus', handler);
    return () => {
      clearTimeout(initialTimer);
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('focus', handler);
    };
    // eslint-disable-next-line
  }, []);

  const routeTaskTap = (taskId?: string, quadrant?: QuadrantId) => {
    if (taskId && quadrant) {
      setActiveTab('matrix');
      triggerHaptic('medium');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-quadrant', {
          detail: { quadrant, taskId },
        }));
      }, 350);
    } else if (taskId) {
      setActiveTab('matrix');
      triggerHaptic('medium');
    }
  };

  const routeHabitTap = (habitId?: string) => {
    if (!habitId) return;
    setActiveTab('habits');
    triggerHaptic('medium');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-habit', {
        detail: { habitId },
      }));
    }, 350);
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listenerPromise = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (event) => {
        const actionId = event.actionId;
        const extra = event.notification.extra as
          | { taskId?: string; quadrant?: QuadrantId; habitId?: string; type?: string; isNag?: boolean }
          | undefined;
        if (!extra) return;

        if (actionId === ACTION_SNOOZE && extra.taskId) {
          const task = tasksRef.current.find((t) => t.id === extra.taskId);
          if (task) {
            triggerHaptic('light');
            snoozeTaskReminder(task, 10);
          }
          return;
        }

        if (actionId === ACTION_DONE && extra.taskId) {
          triggerHaptic('success');
          handleToggleStatusRef.current?.(extra.taskId);
          return;
        }

        if (extra.type === 'overdue') {
          setActiveTab('matrix');
          triggerHaptic('light');
          return;
        }

        if (extra.type === 'digest') {
          setActiveTab('review');
          triggerHaptic('light');
          return;
        }

        if (extra.habitId) {
          routeHabitTap(extra.habitId);
        } else {
          routeTaskTap(extra.taskId, extra.quadrant);
        }
      }
    );
    return () => { listenerPromise.then((l) => l.remove()).catch(() => {}); };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listenerPromise = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        const data = action.notification.data as any;
        if (!data) return;
        const taskId = data.taskId as string | undefined;
        const quadrant = data.quadrant as QuadrantId | undefined;
        const habitId = data.habitId as string | undefined;

        if (habitId) {
          routeHabitTap(habitId);
        } else if (taskId) {
          routeTaskTap(taskId, quadrant);
        }
      }
    );
    return () => { listenerPromise.then((l) => l.remove()).catch(() => {}); };
    // eslint-disable-next-line
  }, []);

  const handleToggleStatus = async (taskId: string) => {
    cancelTaskReminder(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const isNowDone = task.status !== 'completed';

    if (isNowDone) {
      const karmaAmount = KARMA_PER_QUADRANT[task.quadrant] ?? 1;
      showKarmaPopup(karmaAmount);
    } else {
      const karmaAmount = KARMA_PER_QUADRANT[task.quadrant] ?? 1;
      showKarmaPopup(-karmaAmount);
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: isNowDone ? 'completed' : 'todo', completedAt: isNowDone ? new Date().toISOString() : undefined }
          : t
      )
    );

    if (isNowDone) {
      playAudioChime('success');
      const nextTaskFromServer = await completeTaskOnServer(taskId);

      if (nextTaskFromServer) {
        setTasks((prev) => [nextTaskFromServer, ...prev]);
        setTimeout(() => scheduleTaskReminder(nextTaskFromServer), 200);
      } else {
        const recurrence = (task as any).recurrence;
        if (recurrence && recurrence !== 'none') {
          const localNext: Task = {
            ...task,
            id: `task-${Date.now()}`,
            status: 'todo',
            completedAt: undefined,
            archivedAt: undefined,
            createdAt: new Date().toISOString(),
            dueDate: computeNextDueDate(task.dueDate, recurrence),
          };
          setTasks((prev) => [localNext, ...prev]);
          setTimeout(() => scheduleTaskReminder(localNext), 200);
        }
      }
    }
  };

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    escalationRef.current = escalation;
  }, [escalation]);

  useEffect(() => {
    handleToggleStatusRef.current = handleToggleStatus;
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    (async () => {
      for (const task of tasksRef.current) {
        await cancelNagsForTask(task.id);
        if (
          task.status !== 'completed' &&
          !task.archivedAt &&
          task.dueDate &&
          task.quadrant !== 'eliminate'
        ) {
          await scheduleNagsForTask(task, escalation.intensity);
        }
      }
    })();
    // eslint-disable-next-line
  }, [escalation.intensity]);

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

  const handleUpdateSubtasks = (taskId: string, nextSubtasks: Subtask[]) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, subtasks: nextSubtasks } : t))
    );
  };

  const handleSaveAsTemplate = (task: Task) => {
    const defaultName = task.title;
    const name = window.prompt('Save as template — name it:', defaultName);
    if (!name || !name.trim()) return;

    const emoji = window.prompt('Pick an emoji for this template:', '📋') || '📋';
    const template = makeTemplateFromTask(task, name.trim().slice(0, 60), emoji.trim() || '📋');

    setCustomTemplates((prev) => [...prev, template]);
    triggerHaptic('success');
    playAudioChime('success');
  };

  const handleDeleteTemplate = (templateId: string) => {
    setCustomTemplates((prev) => prev.filter((t) => t.id !== templateId));
    triggerHaptic('medium');
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

    const existingCheckIn = checkIns.find((ci) => ci.habitId === habitId && ci.date === date);
    if (!existingCheckIn) {
      showKarmaPopup(2);
    } else {
      showKarmaPopup(-2);
    }

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
    showKarmaPopup(1);

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

  const handleSaveMilestone = (milestone: Milestone) => {
    setMilestones((prev) => {
      const existing = prev.findIndex((m) => m.id === milestone.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = milestone;
        return next;
      }
      return [...prev, milestone];
    });
    triggerHaptic('success');
  };

  const handleDeleteMilestone = (id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const urgentCount = tasks.filter((t) => t.quadrant === 'do_first' && t.status !== 'completed').length;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCmdkOpen((v) => !v);
      }
      if (e.key === 'Escape' && isCmdkOpen) {
        setIsCmdkOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isCmdkOpen]);

  const commandItems = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];

    const tabs: { id: TabView; label: string; emoji: string }[] = [
      { id: 'matrix',    label: 'Matrix',        emoji: '🔲' },
      { id: 'list',      label: 'Tasks',         emoji: '📋' },
      { id: 'timeline',  label: 'Daily Timeline',emoji: '📅' },
      { id: 'calendar',  label: 'Month Calendar',emoji: '🗓️' },
      { id: 'flow',      label: 'Flow Timeline', emoji: '📊' },
      { id: 'habits',    label: 'Habits',        emoji: '🎯' },
      { id: 'analytics', label: 'Analytics',     emoji: '📈' },
      { id: 'review',    label: 'Weekly Review', emoji: '⭐' },
      { id: 'archive',   label: 'Archive',       emoji: '📦' },
    ];
    tabs.forEach((tb) => list.push({
      id: `nav-${tb.id}`,
      label: `Go to ${tb.label}`,
      category: 'Navigate',
      emoji: tb.emoji,
      keywords: tb.id,
      onSelect: () => { setActiveTab(tb.id); setIsCmdkOpen(false); },
    }));

    list.push({
      id: 'action-new-task',
      label: 'Create new task',
      category: 'Action',
      emoji: '➕',
      keywords: 'add todo new create',
      onSelect: () => { handleOpenNewTask(defaultQuadrant); setIsCmdkOpen(false); },
    });
    list.push({
      id: 'action-voice',
      label: 'Voice / type task',
      category: 'Action',
      emoji: '🎙️',
      keywords: 'dictate speak record microphone smart parse',
      onSelect: () => { setIsVoiceModalOpen(true); setIsCmdkOpen(false); },
    });
    list.push({
      id: 'action-focus',
      label: 'Start focus timer',
      category: 'Action',
      emoji: '⏱️',
      keywords: 'pomodoro deep work session',
      onSelect: () => { setFocusTask(null); setIsFocusTimerOpen(true); setIsCmdkOpen(false); },
    });
    list.push({
      id: 'action-theme',
      label: 'Toggle theme',
      category: 'Action',
      emoji: '🌓',
      keywords: 'dark light mode appearance',
      onSelect: () => { toggleTheme(); setIsCmdkOpen(false); },
    });
    list.push({
      id: 'action-settings',
      label: 'Open settings',
      category: 'Action',
      emoji: '⚙️',
      keywords: 'preferences config options',
      onSelect: () => { setIsSettingsOpen(true); setIsCmdkOpen(false); },
    });
    list.push({
      id: 'action-milestones',
      label: 'Manage milestones',
      category: 'Action',
      emoji: '🎯',
      keywords: 'countdown target goal deadline',
      onSelect: () => { setIsMilestoneModalOpen(true); setIsCmdkOpen(false); },
    });
    list.push({
      id: 'action-karma',
      label: 'View Karma',
      category: 'Action',
      emoji: '✨',
      keywords: 'points level progress achievement',
      onSelect: () => { setIsKarmaOpen(true); setIsCmdkOpen(false); },
    });

    tasks
      .filter((t) => t.status !== 'completed' && !t.archivedAt)
      .slice(0, 50)
      .forEach((t) => {
        const quadrantEmoji =
          t.quadrant === 'do_first' ? '🔥' :
          t.quadrant === 'schedule' ? '📅' :
          t.quadrant === 'delegate' ? '👥' : '🗑️';
        const contextKeywords = (t.contexts || []).join(' ');
        list.push({
          id: `task-${t.id}`,
          label: t.title,
          description: `${t.quadrant.replace('_', ' ')} · ${t.category}`,
          category: 'Task',
          emoji: quadrantEmoji,
          keywords: `${t.category} ${contextKeywords}`,
          onSelect: () => {
            setActiveTab('list');
            handleEditTask(t);
            setIsCmdkOpen(false);
          },
        });
      });

    habits
      .filter((h) => !h.archivedAt)
      .forEach((h) => list.push({
        id: `habit-${h.id}`,
        label: h.name,
        description: 'Habit',
        category: 'Habit',
        emoji: h.emoji,
        keywords: 'habit streak tracker',
        onSelect: () => {
          setActiveTab('habits');
          handleEditHabit(h);
          setIsCmdkOpen(false);
        },
      }));

    return list;
    // eslint-disable-next-line
  }, [tasks, habits, defaultQuadrant]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 overflow-x-hidden w-full">
      <OnboardingScreen
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />

      <OfflineIndicator />
      <div className="flex-1 flex flex-col w-full">
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 min-h-full transition-colors">
          <Header
            completedCount={completedCount}
            totalCount={tasks.length}
            streakCount={streakData.currentStreak}
            karmaTotal={karma.total}
            karmaEmoji={karma.level.emoji}
            deviceMode={deviceMode}
            onSetDeviceMode={setDeviceMode}
            onOpenNewTask={() => handleOpenNewTask('do_first')}
            onOpenVoiceTask={() => setIsVoiceModalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenFocusTimer={() => { setFocusTask(null); setIsFocusTimerOpen(true); }}
            onOpenMilestones={() => setIsMilestoneModalOpen(true)}
            onOpenKarma={() => setIsKarmaOpen(true)}
          />

          <MilestoneBanner
            milestones={milestones}
            onOpen={() => setIsMilestoneModalOpen(true)}
          />

          <main className="flex-1 px-4 py-3.5 pb-24 overflow-y-auto">
            {activeTab === 'matrix' && (
              uiDesign === 'kanban' ? (
                <PriorityBoardView
                  tasks={activeTasks}
                  onToggleStatus={handleToggleStatus}
                  onEditTask={handleEditTask}
                  onMoveTaskQuadrant={handleMoveTaskQuadrant}
                  onOpenNewTask={handleOpenNewTask}
                />
              ) : uiDesign === 'neumorphic' ? (
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
                <PriorityMatrixView
                  tasks={activeTasks}
                  onToggleStatus={handleToggleStatus}
                  onDeleteTask={handleDeleteTask}
                  onQuadrantSelect={setDefaultQuadrant}
                  onUpdateSubtasks={handleUpdateSubtasks}
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
                onUpdateSubtasks={handleUpdateSubtasks}
                onSaveAsTemplate={handleSaveAsTemplate}
                onQuickAdd={handleSaveTask}
              />
            )}
            {(activeTab === 'timeline' || activeTab === 'calendar' || activeTab === 'flow') && (
              <CalendarHubView
                tasks={tasks}
                activeSubTab={activeTab as 'timeline' | 'calendar' | 'flow'}
                onChangeSubTab={(sub) => setActiveTab(sub)}
                onToggleStatus={handleToggleStatus}
                onEditTask={handleEditTask}
              />
            )}
            {activeTab === 'analytics' && <ProgressAnalyticsView tasks={tasks} />}
            {activeTab === 'review' && (
              <WeeklyReviewView
                tasks={tasks}
                habits={habits}
                checkIns={checkIns}
                streakCount={streakData.currentStreak}
              />
            )}
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
            {activeTab === 'export' && (
              <NativePackagingHub
                tasks={tasks}
                habits={habits}
                checkIns={checkIns}
                milestones={milestones}
                onOpenInstallModal={() => setIsInstallModalOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}
          </main>
          {activeTab !== 'habits' && (
            <FloatingActionButton onNewTask={() => handleOpenNewTask(defaultQuadrant)} onPushToTalk={() => setIsVoiceModalOpen(true)} />
          )}
          <BottomTabBar
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onOpenMore={() => setIsMoreSheetOpen(true)}
            urgentCount={urgentCount}
          />
        </div>
      </div>

      {karmaPopup && (
        <div
          key={karmaPopup.id}
          className="fixed left-1/2 bottom-32 z-[95] -translate-x-1/2 pointer-events-none select-none"
          style={{ animation: 'karmaFloat 1.4s ease-out forwards' }}
        >
          <div
            className={`px-4 py-2 rounded-2xl shadow-2xl text-white font-black text-base flex items-center gap-1.5 ${
              karmaPopup.amount > 0
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                : 'bg-gradient-to-r from-rose-500 to-orange-500'
            }`}
          >
            <span>✨</span>
            <span>{karmaPopup.amount > 0 ? '+' : ''}{karmaPopup.amount} Karma</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes karmaFloat {
          0%   { opacity: 0; transform: translate(-50%, 20px) scale(0.7); }
          15%  { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
          30%  { transform: translate(-50%, -4px) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -60px) scale(0.9); }
        }
      `}</style>

      <MoreSheet
        isOpen={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <VoiceTaskModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        quadrant={defaultQuadrant}
        onAddTask={(parsed) => {
          handleSaveTask({
            title: parsed.title,
            description: parsed.description,
            quadrant: parsed.quadrant,
            status: 'todo',
            priority: parsed.priority,
            category: parsed.category,
            contexts: parsed.contexts,
            estimatedMinutes: parsed.estimatedMinutes,
            dueDate: parsed.dueDate,
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
        onShareTask={handleShareTask}
        templates={allTemplates}
        onDeleteTemplate={handleDeleteTemplate}
      />

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => { setIsHabitModalOpen(false); setEditingHabit(null); }}
        onSaveHabit={handleSaveHabit}
        editingHabit={editingHabit}
      />

      <PWAInstallModal isOpen={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} />
      <FocusTimerWidget isOpen={isFocusTimerOpen} onClose={() => setIsFocusTimerOpen(false)} activeTask={focusTask} onCompleteTask={(taskId) => { handleToggleStatus(taskId); setIsFocusTimerOpen(false); }} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        tasks={tasks}
        onImportTasks={handleImportTasks}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        dailyDigest={dailyDigest}
        onChangeDailyDigest={setDailyDigest}
        escalation={escalation}
        onChangeEscalation={setEscalation}
      />

      <CommandPalette
        isOpen={isCmdkOpen}
        onClose={() => setIsCmdkOpen(false)}
        items={commandItems}
      />

      <MilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        milestones={milestones}
        onSaveMilestone={handleSaveMilestone}
        onDeleteMilestone={handleDeleteMilestone}
      />

      <DelegateShareModal
        isOpen={!!delegatedTaskShare}
        task={delegatedTaskShare}
        onClose={() => setDelegatedTaskShare(null)}
        onDelegateIdCreated={handleDelegateIdCreated}
        onDelegateStatusChanged={handleDelegateStatusChanged}
      />

      <KarmaView
        isOpen={isKarmaOpen}
        onClose={() => setIsKarmaOpen(false)}
        karma={karma}
      />

      <ThemeTransitionOverlay target={themeTransition?.target ?? null} />
    </div>
  );
}