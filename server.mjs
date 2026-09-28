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

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const scheduledTimers = {};

// 🔁 Compute the next due date from a recurrence rule
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

// Helper: create + schedule a next occurrence
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

// 4. Send push, then reschedule if recurring
async function sendPushForTask(taskId) {
  console.log(`🔔 Timer fired for task: ${taskId}`);
  try {
    const taskDoc = await tasksCollection.doc(taskId).get();
    if (!taskDoc.exists) {
      console.log(`⏭️ Task ${taskId} no longer exists.`);
      return;
    }
    const task = taskDoc.data();

    // Send push
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
    } else {
      console.log(`❌ No FCM token for user ${task.externalId}`);
    }

    // Auto-create next occurrence if recurring
    await createNextOccurrence(task);

    // Delete the fired task
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

  scheduledTimers[task.taskId] = setTimeout(() => {
    sendPushForTask(task.taskId);
  }, delay);

  return true;
}

// On boot: reload pending tasks
async function rescheduleAll() {
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

    for (const id of toDelete) {
      await tasksCollection.doc(id).delete();
    }
  } catch (err) {
    console.error('Failed to reschedule:', err);
  }
}

rescheduleAll();

// ROUTE: Register device token
app.post('/api/register-device', async (req, res) => {
  const { userId, fcmToken } = req.body;
  if (!userId || !fcmToken) {
    return res.status(400).json({ error: 'userId and fcmToken are required' });
  }
  try {
    await tokensCollection.doc(userId).set({
      fcmToken,
      updatedAt: new Date().toISOString()
    });
    console.log(`📱 Device registered! User: ${userId}`);
    res.json({ success: true, message: "Device registered" });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// ROUTE: Schedule a reminder (with recurrence + full task)
app.post('/api/schedule-reminder', async (req, res) => {
  const { externalId, title, dueTime, taskId, recurrence, fullTask } = req.body;
  console.log("✅ Reminder request:", { externalId, title, dueTime, taskId, recurrence: recurrence?.frequency || 'none' });

  if (!externalId || !dueTime || !taskId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

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
    res.json({ success: true, message: "Reminder scheduled", fireInMs: dueTimestamp - Date.now() });
  } catch (err) {
    console.error('Failed to schedule reminder:', err);
    res.status(500).json({ error: 'Failed to schedule reminder' });
  }
});

// ROUTE: Complete a reminder → server creates next occurrence
app.post('/api/complete-reminder', async (req, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: 'taskId is required' });

  try {
    const taskDoc = await tasksCollection.doc(taskId).get();
    if (!taskDoc.exists) {
      return res.json({ success: true, nextTask: null, message: 'Task not found (probably already fired)' });
    }
    const task = taskDoc.data();
    task.taskId = taskId;

    // Cancel timer if pending
    if (scheduledTimers[taskId]) {
      clearTimeout(scheduledTimers[taskId]);
      delete scheduledTimers[taskId];
      console.log(`🗑️ Cancelled pending timer for completed task: ${taskId}`);
    }

    // Create next occurrence if recurring
    const nextTask = await createNextOccurrence(task);

    // Delete original from Firestore
    await tasksCollection.doc(taskId).delete();

    res.json({ success: true, nextTask });
  } catch (err) {
    console.error('complete-reminder error:', err);
    res.status(500).json({ error: 'Failed to complete reminder' });
  }
});

// ROUTE: Cancel a reminder (delete without recurrence)
app.post('/api/cancel-reminder', async (req, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: 'taskId is required' });

  if (scheduledTimers[taskId]) {
    clearTimeout(scheduledTimers[taskId]);
    delete scheduledTimers[taskId];
    console.log(`🗑️ Cancelled timer for task: ${taskId}`);
  }

  try {
    await tasksCollection.doc(taskId).delete();
  } catch (err) {
    console.error('Failed to delete task:', err);
  }

  res.json({ success: true, message: "Reminder cancelled" });
});

// ROUTE: Get all pending tasks for a user (used by app to sync)
app.get('/api/tasks/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

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
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('Task Priority Server is alive! 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});