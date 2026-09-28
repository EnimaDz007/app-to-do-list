import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// 1. Initialize Firebase Admin
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log('🔑 Loaded Firebase credentials from environment variable.');
} else {
  serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));
  console.log('📄 Loaded Firebase credentials from local file.');
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const tokensCollection = db.collection('tokens');
const tasksCollection = db.collection('tasks');
const habitRemindersCollection = db.collection('habitReminders');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ============================================================
//                    TASK TIMERS
// ============================================================
const scheduledTimers = {};

function computeNextDueDate(fromISO, rec) {
  if (!rec || !rec.frequency) return null;
  const from = new Date(fromISO);
  if (isNaN(from.getTime())) return null;
  const now = Date.now();

  const advance = (d) => {
    const next = new Date(d.getTime());
    const interval = Math.max(1, rec.interval || 1);
    switch (rec.frequency) {
      case 'daily':
        next.setDate(next.getDate() + interval);
        break;
      case 'weekdays':
        do { next.setDate(next.getDate() + 1); }
        while (next.getDay() === 0 || next.getDay() === 6);
        break;
      case 'weekly': {
        const days = (rec.daysOfWeek && rec.daysOfWeek.length > 0)
          ? [...rec.daysOfWeek].sort((a, b) => a - b)
          : [from.getDay()];
        const curDay = next.getDay();
        let found = null;
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
      case 'yearly':
        next.setFullYear(next.getFullYear() + interval);
        break;
      default:
        return null;
    }
    return next;
  };

  let candidate = advance(from);
  let iterations = 0;
  while (candidate.getTime() <= now && iterations < 200) {
    candidate = advance(candidate);
    iterations++;
  }

  if (rec.endDate) {
    const end = new Date(rec.endDate);
    if (!isNaN(end.getTime()) && candidate.getTime() > end.getTime()) {
      return null;
    }
  }

  return candidate.toISOString();
}

async function createNextOccurrence(task) {
  if (!task.recurrence || !task.recurrence.frequency) return null;
  if (!task.fullTask) return null;

  const nextDue = computeNextDueDate(task.dueTime, task.recurrence);
  if (!nextDue) {
    console.log(`🔁 Recurrence ended for "${task.title}"`);
    return null;
  }

  const nextTaskId = `${task.taskId}-recur-${Date.now()}`;
  const nextFullTask = {
    ...task.fullTask,
    id: nextTaskId,
    dueDate: nextDue,
    status: 'todo',
    completedAt: undefined,
    archivedAt: undefined,
    createdAt: new Date().toISOString(),
  };

  const nextRecord = {
    externalId: task.externalId,
    title: task.title,
    dueTime: nextDue,
    taskId: nextTaskId,
    recurrence: task.recurrence,
    fullTask: nextFullTask,
  };

  await tasksCollection.doc(nextTaskId).set(nextRecord);
  console.log(`🔁 Auto-created next occurrence: "${task.title}" → ${nextDue}`);
  scheduleTask(nextRecord);
  return nextFullTask;
}

async function sendPushForTask(taskId) {
  console.log(`🔔 Timer fired for task: ${taskId}`);
  try {
    const taskDoc = await tasksCollection.doc(taskId).get();
    if (!taskDoc.exists) return;
    const task = taskDoc.data();

    const tokenDoc = await tokensCollection.doc(task.externalId).get();
    if (tokenDoc.exists) {
      const fcmToken = tokenDoc.data().fcmToken;
      try {
        const response = await getMessaging().send({
          token: fcmToken,
          notification: {
            title: '⏰ ' + task.title,
            body: 'Your task is due now!'
          },
          android: {
            priority: 'high',
            notification: { channelId: 'task-reminders-critical' }
          }
        });
        console.log(`🚀 Auto-push sent for "${task.title}":`, response);
      } catch (err) {
        console.error('❌ Error sending push:', err);
      }
    }

    await createNextOccurrence(task);
    await tasksCollection.doc(taskId).delete();
  } catch (error) {
    console.error('❌ sendPushForTask error:', error);
  }
  delete scheduledTimers[taskId];
}

function scheduleTask(task) {
  if (scheduledTimers[task.taskId]) {
    clearTimeout(scheduledTimers[task.taskId]);
    delete scheduledTimers[task.taskId];
  }
  const dueTimestamp = new Date(task.dueTime).getTime();
  const delay = dueTimestamp - Date.now();
  if (delay <= 0) {
    console.log(`⏭️ Task "${task.title}" is already overdue. Skipping.`);
    return false;
  }
  const delaySeconds = Math.round(delay / 1000);
  console.log(`⏰ Scheduling push for "${task.title}" in ${delaySeconds}s (${new Date(task.dueTime).toLocaleString()})`);
  scheduledTimers[task.taskId] = setTimeout(() => sendPushForTask(task.taskId), delay);
  return true;
}

async function rescheduleAllTasks() {
  try {
    const snapshot = await tasksCollection.get();
    if (snapshot.empty) {
      console.log('📂 No pending tasks in Firestore.');
      return;
    }
    console.log(`🔄 Rescheduling ${snapshot.size} pending task(s) from Firestore...`);
    const toDelete = [];
    snapshot.forEach((doc) => {
      const task = doc.data();
      task.taskId = doc.id;
      const ok = scheduleTask(task);
      if (!ok) toDelete.push(doc.id);
    });
    for (const id of toDelete) await tasksCollection.doc(id).delete();
  } catch (err) {
    console.error('Failed to reschedule tasks:', err);
  }
}

// ============================================================
//                    HABIT TIMERS
// ============================================================
const scheduledHabitTimers = {};

// Compute the next UTC timestamp at which this habit should fire
function computeNextHabitFire(habit, fromTimeMs = Date.now()) {
  const offsetMs = (habit.timezoneOffsetMinutes || 0) * 60000;
  // "User local now" represented as a pseudo-UTC date
  const userLocalNow = new Date(fromTimeMs - offsetMs);
  const [hh, mm] = (habit.reminderTime || '09:00').split(':').map(Number);
  const days = (habit.daysOfWeek && habit.daysOfWeek.length > 0)
    ? habit.daysOfWeek
    : [0, 1, 2, 3, 4, 5, 6];

  const candidate = new Date(userLocalNow);
  candidate.setHours(hh, mm, 0, 0);

  for (let i = 0; i < 14; i++) {
    if (days.includes(candidate.getDay()) && candidate.getTime() > userLocalNow.getTime()) {
      return new Date(candidate.getTime() + offsetMs);
    }
    candidate.setDate(candidate.getDate() + 1);
  }
  return null;
}

async function sendHabitPush(habitId) {
  console.log(`🔔 Habit timer fired: ${habitId}`);
  try {
    const doc = await habitRemindersCollection.doc(habitId).get();
    if (!doc.exists) {
      console.log(`⏭️ Habit ${habitId} no longer exists.`);
      return;
    }
    const habit = doc.data();

    const tokenDoc = await tokensCollection.doc(habit.externalId).get();
    if (tokenDoc.exists) {
      const fcmToken = tokenDoc.data().fcmToken;
      try {
        const response = await getMessaging().send({
          token: fcmToken,
          notification: {
            title: `${habit.emoji || '🎯'} Time for: ${habit.name}`,
            body: 'Keep your streak alive! 🔥'
          },
          android: {
            priority: 'high',
            notification: { channelId: 'task-reminders-critical' }
          }
        });
        console.log(`🚀 Habit push sent for "${habit.name}":`, response);
      } catch (err) {
        console.error('❌ Habit push error:', err);
      }
    }

    // Reschedule for next occurrence
    scheduleHabitReminder(habit);
  } catch (err) {
    console.error('sendHabitPush error:', err);
  }
}

function scheduleHabitReminder(habit) {
  const habitId = habit.habitId;
  if (scheduledHabitTimers[habitId]) {
    clearTimeout(scheduledHabitTimers[habitId]);
    delete scheduledHabitTimers[habitId];
  }
  const next = computeNextHabitFire(habit);
  if (!next) {
    console.log(`⏭️ No next fire for habit "${habit.name}"`);
    return false;
  }
  const delay = next.getTime() - Date.now();
  if (delay <= 0) return false;

  const delaySeconds = Math.round(delay / 1000);
  console.log(`⏰ Habit reminder for "${habit.name}" in ${delaySeconds}s (${next.toLocaleString()})`);

  scheduledHabitTimers[habitId] = setTimeout(() => sendHabitPush(habitId), delay);
  return true;
}

async function rescheduleAllHabitReminders() {
  try {
    const snapshot = await habitRemindersCollection.get();
    if (snapshot.empty) {
      console.log('📂 No habit reminders in Firestore.');
      return;
    }
    console.log(`🔄 Rescheduling ${snapshot.size} habit reminder(s)...`);
    snapshot.forEach((doc) => {
      const habit = doc.data();
      habit.habitId = doc.id;
      scheduleHabitReminder(habit);
    });
  } catch (err) {
    console.error('Failed to reschedule habits:', err);
  }
}

// ============================================================
//                    BOOT
// ============================================================
(async () => {
  await rescheduleAllTasks();
  await rescheduleAllHabitReminders();
})();

// ============================================================
//                    TASK ROUTES
// ============================================================
app.post('/api/register-device', async (req, res) => {
  const { userId, fcmToken } = req.body;
  if (!userId || !fcmToken) return res.status(400).json({ error: 'Missing fields' });
  try {
    await tokensCollection.doc(userId).set({ fcmToken, updatedAt: new Date().toISOString() });
    console.log(`📱 Device registered! User: ${userId}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register device' });
  }
});

app.post('/api/schedule-reminder', async (req, res) => {
  const { externalId, title, dueTime, taskId, recurrence, fullTask } = req.body;
  console.log("✅ Reminder request:", { externalId, title, dueTime, taskId, recurrence: recurrence?.frequency || 'none' });
  if (!externalId || !dueTime || !taskId) return res.status(400).json({ error: 'Missing required fields' });

  const dueTimestamp = new Date(dueTime).getTime();
  if (isNaN(dueTimestamp) || dueTimestamp <= Date.now()) {
    return res.status(400).json({ error: 'Invalid or overdue dueTime' });
  }

  try {
    const taskRecord = { externalId, title, dueTime, taskId };
    if (recurrence && recurrence.frequency) taskRecord.recurrence = recurrence;
    if (fullTask) taskRecord.fullTask = fullTask;
    await tasksCollection.doc(taskId).set(taskRecord);
    scheduleTask(taskRecord);
    res.json({ success: true, fireInMs: dueTimestamp - Date.now() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to schedule reminder' });
  }
});

app.post('/api/complete-reminder', async (req, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: 'taskId required' });
  try {
    const doc = await tasksCollection.doc(taskId).get();
    if (!doc.exists) return res.json({ success: true, nextTask: null });
    const task = doc.data();
    task.taskId = taskId;
    if (scheduledTimers[taskId]) {
      clearTimeout(scheduledTimers[taskId]);
      delete scheduledTimers[taskId];
    }
    const nextTask = await createNextOccurrence(task);
    await tasksCollection.doc(taskId).delete();
    res.json({ success: true, nextTask });
  } catch (err) {
    console.error('complete-reminder error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/cancel-reminder', async (req, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: 'taskId required' });
  if (scheduledTimers[taskId]) {
    clearTimeout(scheduledTimers[taskId]);
    delete scheduledTimers[taskId];
  }
  try { await tasksCollection.doc(taskId).delete(); } catch {}
  res.json({ success: true });
});

app.get('/api/tasks/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const snapshot = await tasksCollection.where('externalId', '==', userId).get();
    const tasks = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({
        taskId: doc.id,
        title: data.title,
        dueTime: data.dueTime,
        recurrence: data.recurrence || null,
        fullTask: data.fullTask || null,
      });
    });
    console.log(`📤 Sync request for user ${userId} → ${tasks.length} task(s)`);
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ============================================================
//                    HABIT ROUTES
// ============================================================
app.post('/api/schedule-habit-reminder', async (req, res) => {
  const { habitId, externalId, name, emoji, reminderTime, daysOfWeek, timezoneOffsetMinutes } = req.body;
  if (!habitId || !externalId || !reminderTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const habit = {
    externalId,
    name: name || 'Habit',
    emoji: emoji || '🎯',
    reminderTime,
    daysOfWeek: (daysOfWeek && daysOfWeek.length > 0) ? daysOfWeek : null,
    timezoneOffsetMinutes: typeof timezoneOffsetMinutes === 'number' ? timezoneOffsetMinutes : 0,
    updatedAt: new Date().toISOString(),
  };

  try {
    await habitRemindersCollection.doc(habitId).set(habit);
    habit.habitId = habitId;
    scheduleHabitReminder(habit);
    console.log(`✅ Habit reminder scheduled: "${name}" at ${reminderTime}`);
    res.json({ success: true });
  } catch (err) {
    console.error('schedule-habit error:', err);
    res.status(500).json({ error: 'Failed to schedule habit' });
  }
});

app.post('/api/cancel-habit-reminder', async (req, res) => {
  const { habitId } = req.body;
  if (!habitId) return res.status(400).json({ error: 'habitId required' });
  if (scheduledHabitTimers[habitId]) {
    clearTimeout(scheduledHabitTimers[habitId]);
    delete scheduledHabitTimers[habitId];
  }
  try { await habitRemindersCollection.doc(habitId).delete(); } catch {}
  console.log(`🗑️ Cancelled habit reminder: ${habitId}`);
  res.json({ success: true });
});

// Health check
app.get('/', (req, res) => {
  res.send('Task Priority Server is alive! 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});