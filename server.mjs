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
const delegateCollection = db.collection('delegates');
const prefsCollection = db.collection('preferences');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ============================================================
//                STALE TOKEN CLEANUP HELPER
// ============================================================
const STALE_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
];

async function handleStaleToken(externalId, err) {
  const code = err?.code || err?.errorInfo?.code;
  if (!STALE_TOKEN_CODES.includes(code)) return false;
  try {
    await tokensCollection.doc(externalId).delete();
    console.log(`🧹 Deleted stale FCM token for user: ${externalId}`);
  } catch (cleanupErr) {
    console.error('Failed to delete stale token:', cleanupErr);
  }
  return true;
}

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
        const cleaned = await handleStaleToken(task.externalId, err);
        if (!cleaned) {
          console.error('❌ Error sending push:', err);
        }
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

function computeNextHabitFire(habit, fromTimeMs = Date.now()) {
  const offsetMs = (habit.timezoneOffsetMinutes || 0) * 60000;
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
        const cleaned = await handleStaleToken(habit.externalId, err);
        if (!cleaned) {
          console.error('❌ Habit push error:', err);
        }
      }
    }

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
//                  USER PREFERENCES (theme etc.)
// ============================================================

/** GET /api/preferences/:userId → { success, preferences | null } */
app.get('/api/preferences/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const doc = await prefsCollection.doc(userId).get();
    if (!doc.exists) return res.json({ success: true, preferences: null });
    res.json({ success: true, preferences: doc.data() });
  } catch (err) {
    console.error('❌ preferences get failed:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

/** POST /api/preferences/:userId  body: { uiDesign } */
app.post('/api/preferences/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const { uiDesign } = req.body ?? {};
  if (typeof uiDesign !== 'string' || !uiDesign) {
    return res.status(400).json({ error: 'uiDesign required' });
  }
  try {
    await prefsCollection.doc(userId).set(
      { uiDesign, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    console.log(`🎨 Saved preferences for ${userId} → ${uiDesign}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ preferences set failed:', err);
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

// ============================================================
//                    DELEGATE HUB
// ============================================================

/**
 * POST /api/delegate/create
 * Creates a public-shareable delegate record.
 */
app.post('/api/delegate/create', async (req, res) => {
  const { taskId, title, description, dueDate, externalId, senderName } = req.body;
  if (!taskId || !title) return res.status(400).json({ error: 'Missing taskId or title' });
  try {
    const delegateId = `del-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await delegateCollection.doc(delegateId).set({
      delegateId,
      taskId,
      title,
      description: description || '',
      dueDate: dueDate || null,
      externalId: externalId || '',
      senderName: senderName || 'A teammate',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`🤝 Delegate created: ${delegateId} — "${title}"`);
    res.json({ success: true, delegateId });
  } catch (err) {
    console.error('delegate/create error:', err);
    res.status(500).json({ error: 'Failed to create delegate' });
  }
});

/**
 * GET /api/delegate/:delegateId
 * Returns the current status and info.
 */
app.get('/api/delegate/:delegateId', async (req, res) => {
  const { delegateId } = req.params;
  try {
    const doc = await delegateCollection.doc(delegateId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, task: doc.data() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

/**
 * POST /api/delegate/:delegateId/complete
 */
app.post('/api/delegate/:delegateId/complete', async (req, res) => {
  const { delegateId } = req.params;
  const { completedBy } = req.body || {};
  try {
    const doc = await delegateCollection.doc(delegateId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    await delegateCollection.doc(delegateId).update({
      status: 'completed',
      completedBy: completedBy || 'Anonymous',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`✅ Delegate completed: ${delegateId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('delegate/complete error:', err);
    res.status(500).json({ error: 'Failed to complete' });
  }
});

/**
 * POST /api/delegate/:delegateId/reject
 */
app.post('/api/delegate/:delegateId/reject', async (req, res) => {
  const { delegateId } = req.params;
  const { reason } = req.body || {};
  try {
    const doc = await delegateCollection.doc(delegateId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    await delegateCollection.doc(delegateId).update({
      status: 'rejected',
      rejectionReason: reason || '',
      updatedAt: new Date().toISOString(),
    });
    console.log(`❌ Delegate rejected: ${delegateId}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject' });
  }
});

/**
 * GET /delegate/:delegateId
 * Public HTML page shown to the recipient.
 */
app.get('/delegate/:delegateId', async (req, res) => {
  const { delegateId } = req.params;
  let task = null;
  try {
    const doc = await delegateCollection.doc(delegateId).get();
    if (doc.exists) task = doc.data();
  } catch {}

  if (!task) {
    return res.status(404).type('html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Task not found</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:-apple-system,sans-serif;padding:40px;text-align:center;color:#334155;background:#f8fafc"><div style="font-size:60px;margin-bottom:20px">🔍</div><h1 style="margin:0 0 8px">Task not found</h1><p style="color:#64748b">This link may have been revoked or never existed.</p></body></html>`);
  }

  const status = task.status;
  const statusColor = status === 'completed' ? '#059669' : status === 'rejected' ? '#E11D48' : '#4F46E5';
  const statusLabel = status === 'completed' ? 'Completed' : status === 'rejected' ? 'Declined' : 'Pending';
  const dueLine = task.dueDate
    ? new Date(task.dueDate).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'No specific time';

  // simple HTML escape
  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(task.title)} — Delegated task</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#0f172a;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{max-width:480px;width:100%;background:#fff;border-radius:24px;box-shadow:0 20px 60px rgba(15,23,42,0.1);overflow:hidden}
    .head{padding:24px;background:linear-gradient(135deg,#6366F1,#7C3AED);color:#fff}
    .head .eyebrow{margin:0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:0.9}
    .head h1{margin:8px 0 0;font-size:20px;font-weight:800;line-height:1.25}
    .body{padding:24px}
    .status{display:inline-block;padding:5px 12px;border-radius:100px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;background:${statusColor}20;color:${statusColor};margin-bottom:16px}
    .field{margin:16px 0}
    .label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin-bottom:4px}
    .value{font-size:14px;color:#0f172a;line-height:1.5;white-space:pre-wrap}
    .actions{display:flex;gap:10px;margin-top:24px}
    .btn{flex:1;padding:14px;border-radius:14px;border:none;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;transition:opacity 0.15s,transform 0.1s}
    .btn:active{transform:scale(0.97)}
    .btn:disabled{opacity:0.6;cursor:not-allowed}
    .btn-primary{background:#4F46E5;color:#fff}
    .btn-secondary{background:#e2e8f0;color:#334155}
    .note{margin-top:18px;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6}
    .done{padding:36px 24px;text-align:center}
    .done-emoji{font-size:56px;margin-bottom:14px}
    .done h2{margin:0 0 8px;font-size:19px;color:#059669}
    .done p{margin:0;font-size:13px;color:#64748b;line-height:1.5}
    .footer{padding:16px 24px;border-top:1px solid #f1f5f9;background:#f8fafc;text-align:center}
    .footer p{margin:0;font-size:10px;color:#94a3b8;font-weight:600;letter-spacing:1px;text-transform:uppercase}
  </style>
</head>
<body>
  <div class="card">
    <div class="head">
      <p class="eyebrow">Delegated task</p>
      <h1>${esc(task.title)}</h1>
    </div>
    <div class="body">
      <span class="status">${statusLabel}</span>
      <div class="field">
        <div class="label">From</div>
        <div class="value">${esc(task.senderName || 'A teammate')}</div>
      </div>
      ${task.description ? `<div class="field"><div class="label">Notes</div><div class="value">${esc(task.description)}</div></div>` : ''}
      <div class="field">
        <div class="label">Due</div>
        <div class="value">${esc(dueLine)}</div>
      </div>
      ${status === 'pending' ? `
        <div class="actions">
          <button class="btn btn-secondary" id="rejectBtn">Can't do</button>
          <button class="btn btn-primary" id="completeBtn">Mark as done</button>
        </div>
      ` : ''}
      <p class="note">Takes a second — no account needed.</p>
    </div>
    <div class="footer">
      <p>Powered by Task Priority</p>
    </div>
  </div>
  <script>
    const did = ${JSON.stringify(delegateId)};
    const api = ${JSON.stringify((req.protocol || 'https') + '://' + req.get('host'))};
    const complete = document.getElementById('completeBtn');
    const reject = document.getElementById('rejectBtn');
    if (complete) complete.addEventListener('click', async () => {
      complete.textContent = 'Saving...';
      complete.disabled = true;
      try {
        const r = await fetch(api + '/api/delegate/' + did + '/complete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({}) });
        if (!r.ok) throw new Error('bad');
        document.querySelector('.body').innerHTML = '<div class="done"><div class="done-emoji">🎉</div><h2>Thank you!</h2><p>The sender has been notified.</p></div>';
      } catch (e) {
        complete.textContent = 'Try again';
        complete.disabled = false;
      }
    });
    if (reject) reject.addEventListener('click', async () => {
      reject.textContent = 'Sending...';
      reject.disabled = true;
      try {
        const r = await fetch(api + '/api/delegate/' + did + '/reject', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({}) });
        if (!r.ok) throw new Error('bad');
        document.querySelector('.body').innerHTML = '<div class="done"><div class="done-emoji">👋</div><h2>Declined</h2><p>They\\'ll see your reply in the app.</p></div>';
      } catch (e) {
        reject.textContent = 'Try again';
        reject.disabled = false;
      }
    });
  </script>
</body>
</html>`;

  res.set('Content-Type', 'text/html; charset=utf-8').send(html);
});

// Health check
app.get('/', (req, res) => {
  res.send('Task Priority Server is alive! 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});