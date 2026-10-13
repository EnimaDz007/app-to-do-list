// ─────────────────────────────────────────────────────────────
//  FILE: server.mjs
//  MerakiList backend — secured with Clerk JWT verification,
//  CORS allowlist, rate limiting, ownership checks.
// ─────────────────────────────────────────────────────────────

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import {
  clerkMiddleware,
  requireAuth,
  getAuth,
} from '@clerk/express';
import fs from 'fs';

// ─── 1. Firebase Admin ─────────────────────────────────────
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log('🔑 Loaded Firebase credentials from environment variable.');
} else {
  serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));
  console.log('📄 Loaded Firebase credentials from local file.');
}
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const tokensCollection = db.collection('tokens');
const tasksCollection = db.collection('tasks');
const habitRemindersCollection = db.collection('habitReminders');
const delegateCollection = db.collection('delegates');
const prefsCollection = db.collection('preferences');
const syncTasksCollection = db.collection('syncTasks');
const syncHabitsCollection = db.collection('syncHabits');
const syncHabitCheckinsCollection = db.collection('syncHabitCheckins');
const syncMilestonesCollection = db.collection('syncMilestones');
const syncProjectsCollection = db.collection('syncProjects');

// ─── 2. App + CORS + body limits ───────────────────────────
const app = express();

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Capacitor native apps send no Origin header or use these schemes.
const NATIVE_ORIGINS = ['capacitor://localhost', 'ionic://localhost', 'http://localhost', 'https://localhost'];

app.use(
  cors({
    origin: (origin, cb) => {
      // Native mobile apps and server-to-server calls: no origin
      if (!origin) return cb(null, true);
      // Capacitor WebView
      if (NATIVE_ORIGINS.includes(origin)) return cb(null, true);
      // Explicit allowlist
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      // Localhost dev (any port)
      if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      return cb(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

// ─── 3. Rate limiting ──────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api/', apiLimiter);

// Stricter limit for write-heavy / push endpoints
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/register-device', writeLimiter);
app.use('/api/schedule-reminder', writeLimiter);
app.use('/api/schedule-habit-reminder', writeLimiter);

// ─── 4. Clerk auth middleware ──────────────────────────────
// Attaches req.auth to every request. requireAuth() then
// rejects any request without a valid session JWT.
app.use(clerkMiddleware());

// Helper: safe string length cap
const cap = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');

// ─── FCM stale-token helpers (unchanged) ───────────────────
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

// ─── Task timers (unchanged) ───────────────────────────────
const scheduledTimers = {};
const scheduledReminderTimers = {};

function computeNextDueDate(fromISO, rec) {
  if (!rec || !rec.frequency) return null;
  const from = new Date(fromISO);
  if (isNaN(from.getTime())) return null;
  const now = Date.now();

  const advance = (d) => {
    const next = new Date(d.getTime());
    const interval = Math.max(1, rec.interval || 1);
    switch (rec.frequency) {
      case 'daily': next.setDate(next.getDate() + interval); break;
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
        for (const day of days) { if (day > curDay) { found = day; break; } }
        if (found !== null) next.setDate(next.getDate() + (found - curDay));
        else next.setDate(next.getDate() + (7 - curDay + days[0]) + (interval - 1) * 7);
        break;
      }
      case 'monthly': {
        const target = rec.dayOfMonth || from.getDate();
        next.setMonth(next.getMonth() + interval);
        const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(target, daysInMonth));
        break;
      }
      case 'yearly': next.setFullYear(next.getFullYear() + interval); break;
      default: return null;
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
    if (!isNaN(end.getTime()) && candidate.getTime() > end.getTime()) return null;
  }
  return candidate.toISOString();
}

async function createNextOccurrence(task) {
  if (!task.recurrence || !task.recurrence.frequency) return null;
  if (!task.fullTask) return null;
  const nextDue = computeNextDueDate(task.dueTime, task.recurrence);
  if (!nextDue) { console.log(`🔁 Recurrence ended for "${task.title}"`); return null; }

  const nextTaskId = `${task.taskId}-recur-${Date.now()}`;
  const nextFullTask = {
    ...task.fullTask,
    id: nextTaskId,
    dueDate: nextDue,
    status: 'todo',
    completedAt: undefined,
    archivedAt: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const nextRecord = {
    externalId: task.externalId,
    title: task.title,
    dueTime: nextDue,
    taskId: nextTaskId,
    recurrence: task.recurrence,
    reminders: task.reminders,
    fullTask: nextFullTask,
  };
  await tasksCollection.doc(nextTaskId).set(nextRecord);
  console.log(`🔁 Auto-created next occurrence: "${task.title}" → ${nextDue}`);
  scheduleTask(nextRecord);
  scheduleTaskReminders(nextRecord);
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
        await getMessaging().send({
          token: fcmToken,
          notification: { title: '⏰ ' + task.title, body: 'Your task is due now!' },
          android: { priority: 'high', notification: { channelId: 'task-reminders-critical' } }
        });
        console.log(`🚀 Auto-push sent for "${task.title}"`);
      } catch (err) {
        const cleaned = await handleStaleToken(task.externalId, err);
        if (!cleaned) console.error('❌ Error sending push:', err);
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
  if (delay <= 0) return false;
  scheduledTimers[task.taskId] = setTimeout(() => sendPushForTask(task.taskId), delay);
  return true;
}

// ─── Custom reminders (unchanged) ──────────────────────────
function reminderBody(reminder) {
  if (!reminder || typeof reminder.minutesBefore !== 'number') return 'Your task is coming up.';
  const mins = reminder.minutesBefore;
  if (mins === 0) return 'Your task is due now.';
  if (mins < 60) return `Due in ${mins} min.`;
  if (mins < 1440) { const h = mins / 60; return `Due in ${h % 1 === 0 ? h : h.toFixed(1)}h.`; }
  const d = mins / 1440;
  return `Due in ${d % 1 === 0 ? d : d.toFixed(1)}d.`;
}

async function sendReminderPush(taskId, reminderId) {
  const key = `${taskId}::${reminderId}`;
  try {
    const taskDoc = await tasksCollection.doc(taskId).get();
    if (!taskDoc.exists) { delete scheduledReminderTimers[key]; return; }
    const task = taskDoc.data();
    const reminder = (task.reminders || []).find((r) => r.id === reminderId);
    if (!reminder) { delete scheduledReminderTimers[key]; return; }
    const tokenDoc = await tokensCollection.doc(task.externalId).get();
    if (tokenDoc.exists) {
      try {
        await getMessaging().send({
          token: tokenDoc.data().fcmToken,
          notification: { title: `⏰ ${task.title}`, body: reminderBody(reminder) },
          android: { priority: 'high', notification: { channelId: 'task-reminders-critical' } },
          data: { taskId, quadrant: task.quadrant || 'do_first', reminderId },
        });
      } catch (err) {
        const cleaned = await handleStaleToken(task.externalId, err);
        if (!cleaned) console.error('❌ Custom reminder push error:', err);
      }
    }
  } catch (err) { console.error('❌ sendReminderPush error:', err); }
  delete scheduledReminderTimers[key];
}

function scheduleTaskReminders(task) {
  const taskId = task.taskId;
  for (const key of Object.keys(scheduledReminderTimers)) {
    if (key.startsWith(`${taskId}::`)) {
      clearTimeout(scheduledReminderTimers[key]);
      delete scheduledReminderTimers[key];
    }
  }
  if (!task.reminders || !Array.isArray(task.reminders)) return;
  const now = Date.now();
  for (const r of task.reminders) {
    if (!r || !r.id || !r.fireAt) continue;
    const fireAt = new Date(r.fireAt).getTime();
    if (isNaN(fireAt) || fireAt <= now) continue;
    const delay = fireAt - now;
    if (delay > 30 * 24 * 60 * 60 * 1000) continue;
    const key = `${taskId}::${r.id}`;
    scheduledReminderTimers[key] = setTimeout(() => sendReminderPush(taskId, r.id), delay);
  }
}

async function rescheduleAllTasks() {
  try {
    const snapshot = await tasksCollection.get();
    if (snapshot.empty) return;
    console.log(`🔄 Rescheduling ${snapshot.size} pending task(s)...`);
    const toDelete = [];
    snapshot.forEach((doc) => {
      const task = doc.data();
      task.taskId = doc.id;
      if (!scheduleTask(task)) toDelete.push(doc.id);
      else scheduleTaskReminders(task);
    });
    for (const id of toDelete) await tasksCollection.doc(id).delete();
  } catch (err) { console.error('Failed to reschedule tasks:', err); }
}

// ─── Habit timers (unchanged) ──────────────────────────────
const scheduledHabitTimers = {};

function computeNextHabitFire(habit, fromTimeMs = Date.now()) {
  const offsetMs = (habit.timezoneOffsetMinutes || 0) * 60000;
  const userLocalNow = new Date(fromTimeMs - offsetMs);
  const [hh, mm] = (habit.reminderTime || '09:00').split(':').map(Number);
  const days = (habit.daysOfWeek && habit.daysOfWeek.length > 0) ? habit.daysOfWeek : [0,1,2,3,4,5,6];
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
  try {
    const doc = await habitRemindersCollection.doc(habitId).get();
    if (!doc.exists) return;
    const habit = doc.data();
    const tokenDoc = await tokensCollection.doc(habit.externalId).get();
    if (tokenDoc.exists) {
      try {
        await getMessaging().send({
          token: tokenDoc.data().fcmToken,
          notification: {
            title: `${habit.emoji || '🎯'} Time for: ${habit.name}`,
            body: 'Keep your streak alive! 🔥'
          },
          android: { priority: 'high', notification: { channelId: 'task-reminders-critical' } }
        });
      } catch (err) {
        const cleaned = await handleStaleToken(habit.externalId, err);
        if (!cleaned) console.error('❌ Habit push error:', err);
      }
    }
    scheduleHabitReminder(habit);
  } catch (err) { console.error('sendHabitPush error:', err); }
}

function scheduleHabitReminder(habit) {
  const habitId = habit.habitId;
  if (scheduledHabitTimers[habitId]) {
    clearTimeout(scheduledHabitTimers[habitId]);
    delete scheduledHabitTimers[habitId];
  }
  const next = computeNextHabitFire(habit);
  if (!next) return false;
  const delay = next.getTime() - Date.now();
  if (delay <= 0) return false;
  scheduledHabitTimers[habitId] = setTimeout(() => sendHabitPush(habitId), delay);
  return true;
}

async function rescheduleAllHabitReminders() {
  try {
    const snapshot = await habitRemindersCollection.get();
    snapshot.forEach((doc) => {
      const habit = doc.data();
      habit.habitId = doc.id;
      scheduleHabitReminder(habit);
    });
  } catch (err) { console.error('Failed to reschedule habits:', err); }
}

(async () => {
  await rescheduleAllTasks();
  await rescheduleAllHabitReminders();
})();

// ═══════════════════════════════════════════════════════════
//  AUTHENTICATED TASK ROUTES
//  Every route below requires a valid Clerk session JWT.
//  The userId is ALWAYS taken from the JWT — never from the body.
// ═══════════════════════════════════════════════════════════

app.post('/api/register-device', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  const { fcmToken } = req.body || {};
  if (!fcmToken || typeof fcmToken !== 'string') {
    return res.status(400).json({ error: 'fcmToken required' });
  }
  try {
    await tokensCollection.doc(userId).set({
      fcmToken: cap(fcmToken, 4096),
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register device' });
  }
});

app.post('/api/schedule-reminder', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  const { title, dueTime, taskId, recurrence, reminders, fullTask } = req.body || {};

  if (!dueTime || !taskId || !title) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const dueTimestamp = new Date(dueTime).getTime();
  if (isNaN(dueTimestamp)) {
    return res.status(400).json({ error: 'Invalid dueTime' });
  }

  try {
    // ── Ownership check: if this taskId already exists, it must belong to us
    const existing = await tasksCollection.doc(String(taskId)).get();
    if (existing.exists && existing.data().externalId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const taskRecord = {
      externalId: userId,               // ← always from JWT
      title: cap(title, 500),
      dueTime,
      taskId: String(taskId),
    };
    if (recurrence && recurrence.frequency) taskRecord.recurrence = recurrence;
    if (fullTask) taskRecord.fullTask = fullTask;
    if (Array.isArray(reminders)) taskRecord.reminders = reminders;

    await tasksCollection.doc(String(taskId)).set(taskRecord);

    if (dueTimestamp > Date.now()) scheduleTask(taskRecord);
    scheduleTaskReminders(taskRecord);

    res.json({ success: true, fireInMs: dueTimestamp - Date.now() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to schedule reminder' });
  }
});

app.post('/api/complete-reminder', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  const { taskId } = req.body || {};
  if (!taskId) return res.status(400).json({ error: 'taskId required' });
  try {
    const doc = await tasksCollection.doc(String(taskId)).get();
    if (!doc.exists) return res.json({ success: true, nextTask: null });
    const task = doc.data();
    if (task.externalId !== userId) return res.status(403).json({ error: 'Forbidden' });
    task.taskId = String(taskId);
    if (scheduledTimers[taskId]) {
      clearTimeout(scheduledTimers[taskId]);
      delete scheduledTimers[taskId];
    }
    for (const key of Object.keys(scheduledReminderTimers)) {
      if (key.startsWith(`${taskId}::`)) {
        clearTimeout(scheduledReminderTimers[key]);
        delete scheduledReminderTimers[key];
      }
    }
    const nextTask = await createNextOccurrence(task);
    await tasksCollection.doc(String(taskId)).delete();
    res.json({ success: true, nextTask });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/cancel-reminder', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  const { taskId } = req.body || {};
  if (!taskId) return res.status(400).json({ error: 'taskId required' });
  try {
    const doc = await tasksCollection.doc(String(taskId)).get();
    if (doc.exists && doc.data().externalId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (scheduledTimers[taskId]) {
      clearTimeout(scheduledTimers[taskId]);
      delete scheduledTimers[taskId];
    }
    for (const key of Object.keys(scheduledReminderTimers)) {
      if (key.startsWith(`${taskId}::`)) {
        clearTimeout(scheduledReminderTimers[key]);
        delete scheduledReminderTimers[key];
      }
    }
    try { await tasksCollection.doc(String(taskId)).delete(); } catch {}
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ═══════════════════════════════════════════════════════════
//  TWO-WAY SYNC — scoped strictly to the authenticated user
// ═══════════════════════════════════════════════════════════

app.get('/api/sync/:userId', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  if (req.params.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const since = req.query.since ? String(req.query.since) : null;

  try {
    const serverTime = new Date().toISOString();
    const snapshot = await syncTasksCollection.where('externalId', '==', userId).get();
    const sinceTs = since ? new Date(since).getTime() : 0;
    const tasks = [];
    let maxServerUpdatedAt = serverTime;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const serverTs = new Date(data.serverUpdatedAt || 0).getTime();
      if (serverTs > sinceTs) tasks.push({ ...data, id: doc.id });
      if (serverTs > new Date(maxServerUpdatedAt).getTime()) maxServerUpdatedAt = data.serverUpdatedAt;
    });

    res.json({ success: true, tasks, serverTime: maxServerUpdatedAt, count: tasks.length });
  } catch (err) {
    console.error('❌ sync GET failed:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/sync/:userId', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  if (req.params.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const { tasks } = req.body || {};
  if (!Array.isArray(tasks)) return res.status(400).json({ error: 'tasks[] required' });

  try {
    const now = new Date().toISOString();
    let applied = 0;
    const CAP = 400;

    for (const task of tasks.slice(0, CAP)) {
      if (!task || !task.id) continue;
      // Ownership check per task
      const existing = await syncTasksCollection.doc(String(task.id)).get();
      if (existing.exists && existing.data().externalId !== userId) {
        console.warn(`🚫 Skipped foreign task id=${task.id}`);
        continue;
      }
      await syncTasksCollection.doc(String(task.id)).set(
        { ...task, externalId: userId, serverUpdatedAt: now },
        { merge: false }
      );
      applied++;
    }

    res.json({ success: true, applied, serverTime: now });
  } catch (err) {
    console.error('❌ sync POST failed:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/sync/:userId/delete', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  if (req.params.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const { taskId } = req.body || {};
  if (!taskId) return res.status(400).json({ error: 'taskId required' });
  try {
    const doc = await syncTasksCollection.doc(String(taskId)).get();
    if (doc.exists && doc.data().externalId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await syncTasksCollection.doc(String(taskId)).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ═══════════════════════════════════════════════════════════
//  FULL SYNC — all entity types
// ═══════════════════════════════════════════════════════════

app.get('/api/sync/:userId/full', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  if (req.params.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const since = req.query.since ? String(req.query.since) : null;

  try {
    const serverTime = new Date().toISOString();
    const sinceTs = since ? new Date(since).getTime() : 0;

    const [tasksSnap, habitsSnap, checkInsSnap, milestonesSnap, projectsSnap] = await Promise.all([
      syncTasksCollection.where('externalId', '==', userId).get(),
      syncHabitsCollection.where('externalId', '==', userId).get(),
      syncHabitCheckinsCollection.where('externalId', '==', userId).get(),
      syncMilestonesCollection.where('externalId', '==', userId).get(),
      syncProjectsCollection.where('externalId', '==', userId).get(),
    ]);

    const filterSince = (snap) => {
      const out = [];
      snap.forEach((doc) => {
        const data = doc.data();
        const ts = new Date(data.serverUpdatedAt || 0).getTime();
        if (ts > sinceTs) out.push({ ...data, id: doc.id });
      });
      return out;
    };

    res.json({
      success: true,
      tasks: filterSince(tasksSnap),
      habits: filterSince(habitsSnap),
      checkIns: filterSince(checkInsSnap),
      milestones: filterSince(milestonesSnap),
      projects: filterSince(projectsSnap),
      serverTime,
    });
  } catch (err) {
    console.error('❌ syncPullAll failed:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/sync/:userId/full', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  if (req.params.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const { tasks = [], habits = [], checkIns = [], milestones = [], projects = [] } = req.body || {};

  try {
    const now = new Date().toISOString();
    const sources = [
      { items: tasks, collection: syncTasksCollection },
      { items: habits, collection: syncHabitsCollection },
      { items: checkIns, collection: syncHabitCheckinsCollection },
      { items: milestones, collection: syncMilestonesCollection },
      { items: projects, collection: syncProjectsCollection },
    ];

    // Pre-fetch existing docs for ownership checks
    const candidates = [];
    for (const { items, collection } of sources) {
      for (const item of items) {
        if (!item || !item.id) continue;
        candidates.push({ item, collection, ref: collection.doc(String(item.id)) });
      }
    }
    const existingDocs = await Promise.all(candidates.map((c) => c.ref.get()));

    const ops = [];
    candidates.forEach((c, i) => {
      const existing = existingDocs[i];
      if (existing.exists && existing.data().externalId !== userId) return;
      ops.push({
        ref: c.ref,
        payload: { ...c.item, externalId: userId, serverUpdatedAt: now },
      });
    });

    const CHUNK = 450;
    let applied = 0;
    for (let i = 0; i < ops.length; i += CHUNK) {
      const batch = db.batch();
      const slice = ops.slice(i, i + CHUNK);
      for (const op of slice) batch.set(op.ref, op.payload, { merge: false });
      await batch.commit();
      applied += slice.length;
    }

    res.json({ success: true, applied, serverTime: now });
  } catch (err) {
    console.error('❌ syncPushAll failed:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// ═══════════════════════════════════════════════════════════
//  USER PREFERENCES
// ═══════════════════════════════════════════════════════════

app.get('/api/preferences/:userId', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  if (req.params.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  try {
    const doc = await prefsCollection.doc(userId).get();
    if (!doc.exists) return res.json({ success: true, preferences: null });
    res.json({ success: true, preferences: doc.data() });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/preferences/:userId', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  if (req.params.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  const { uiDesign } = req.body ?? {};
  if (typeof uiDesign !== 'string' || !uiDesign) {
    return res.status(400).json({ error: 'uiDesign required' });
  }
  try {
    await prefsCollection.doc(userId).set(
      { uiDesign: cap(uiDesign, 100), updatedAt: new Date().toISOString() },
      { merge: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ═══════════════════════════════════════════════════════════
//  HABIT REMINDERS
// ═══════════════════════════════════════════════════════════

app.post('/api/schedule-habit-reminder', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  const { habitId, name, emoji, reminderTime, daysOfWeek, timezoneOffsetMinutes } = req.body || {};
  if (!habitId || !reminderTime) return res.status(400).json({ error: 'Missing fields' });

  const habit = {
    externalId: userId,                    // ← from JWT
    name: cap(name || 'Habit', 200),
    emoji: cap(emoji || '🎯', 8),
    reminderTime: cap(reminderTime, 10),
    daysOfWeek: (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) ? daysOfWeek.slice(0, 7) : null,
    timezoneOffsetMinutes: typeof timezoneOffsetMinutes === 'number' ? timezoneOffsetMinutes : 0,
    updatedAt: new Date().toISOString(),
  };
  try {
    const existing = await habitRemindersCollection.doc(String(habitId)).get();
    if (existing.exists && existing.data().externalId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await habitRemindersCollection.doc(String(habitId)).set(habit);
    habit.habitId = String(habitId);
    scheduleHabitReminder(habit);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/cancel-habit-reminder', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  const { habitId } = req.body || {};
  if (!habitId) return res.status(400).json({ error: 'habitId required' });
  try {
    const existing = await habitRemindersCollection.doc(String(habitId)).get();
    if (existing.exists && existing.data().externalId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (scheduledHabitTimers[habitId]) {
      clearTimeout(scheduledHabitTimers[habitId]);
      delete scheduledHabitTimers[habitId];
    }
    try { await habitRemindersCollection.doc(String(habitId)).delete(); } catch {}
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ═══════════════════════════════════════════════════════════
//  DELEGATE HUB
//  These are intentionally public (they power the share link),
//  so we do NOT require auth here. But we use crypto-grade IDs
//  and validate all input lengths.
// ═══════════════════════════════════════════════════════════

app.post('/api/delegate/create', requireAuth(), async (req, res) => {
  const userId = getAuth(req).userId;
  const { taskId, title, description, dueDate, senderName } = req.body || {};
  if (!taskId || !title) return res.status(400).json({ error: 'Missing taskId or title' });
  try {
    const delegateId = `del-${randomUUID()}`;
    await delegateCollection.doc(delegateId).set({
      delegateId,
      taskId: cap(String(taskId), 200),
      title: cap(title, 500),
      description: cap(description || '', 2000),
      dueDate: dueDate || null,
      externalId: userId,
      senderName: cap(senderName || 'A teammate', 100),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true, delegateId });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/delegate/:delegateId', async (req, res) => {
  try {
    const doc = await delegateCollection.doc(req.params.delegateId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, task: doc.data() });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/delegate/:delegateId/complete', async (req, res) => {
  const { delegateId } = req.params;
  const { completedBy } = req.body || {};
  try {
    const doc = await delegateCollection.doc(delegateId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    await delegateCollection.doc(delegateId).update({
      status: 'completed',
      completedBy: cap(completedBy || 'Anonymous', 100),
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/delegate/:delegateId/reject', async (req, res) => {
  const { delegateId } = req.params;
  const { reason } = req.body || {};
  try {
    const doc = await delegateCollection.doc(delegateId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    await delegateCollection.doc(delegateId).update({
      status: 'rejected',
      rejectionReason: cap(reason || '', 500),
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Public delegate HTML page (intentionally public, HTML-escaped)
app.get('/delegate/:delegateId', async (req, res) => {
  const { delegateId } = req.params;
  let task = null;
  try {
    const doc = await delegateCollection.doc(delegateId).get();
    if (doc.exists) task = doc.data();
  } catch {}
  if (!task) {
    return res.status(404).type('html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not found</title></head><body style="font-family:sans-serif;padding:40px;text-align:center"><h1>Task not found</h1></body></html>`);
  }
  const status = task.status;
  const statusColor = status === 'completed' ? '#059669' : status === 'rejected' ? '#E11D48' : '#4F46E5';
  const statusLabel = status === 'completed' ? 'Completed' : status === 'rejected' ? 'Declined' : 'Pending';
  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(task.title)}</title>
  <style>body{margin:0;font-family:sans-serif;background:#f1f5f9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{max-width:480px;width:100%;background:#fff;border-radius:24px;padding:32px;box-shadow:0 20px 60px rgba(15,23,42,0.1)}h1{font-size:22px;margin:0 0 16px}.status{display:inline-block;padding:5px 12px;border-radius:100px;font-size:11px;font-weight:800;text-transform:uppercase;background:${statusColor}20;color:${statusColor};margin-bottom:16px}.field{margin:14px 0}.label{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8}.value{font-size:15px;color:#0f172a;margin-top:4px}.btn{padding:12px;border-radius:12px;border:none;font-weight:800;cursor:pointer;font-family:inherit;flex:1}.btn-primary{background:#4F46E5;color:#fff}.btn-secondary{background:#e2e8f0;color:#334155}.actions{display:flex;gap:10px;margin-top:20px}</style>
  </head><body><div class="card"><h1>${esc(task.title)}</h1><span class="status">${statusLabel}</span>
  <div class="field"><div class="label">From</div><div class="value">${esc(task.senderName || 'A teammate')}</div></div>
  ${task.description ? `<div class="field"><div class="label">Notes</div><div class="value">${esc(task.description)}</div></div>` : ''}
  ${status === 'pending' ? `<div class="actions"><button class="btn btn-secondary" onclick="rej()">Can't do</button><button class="btn btn-primary" onclick="done()">Mark done</button></div>` : ''}
  </div><script>
  const did = ${JSON.stringify(delegateId)};
  const api = ${JSON.stringify((req.protocol || 'https') + '://' + req.get('host'))};
  async function done(){ await fetch(api+'/api/delegate/'+did+'/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}); document.querySelector('.card').innerHTML='<h1>🎉 Thanks!</h1>'; }
  async function rej(){ await fetch(api+'/api/delegate/'+did+'/reject',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}); document.querySelector('.card').innerHTML='<h1>👋 Declined</h1>'; }
  </script></body></html>`;
  res.set('Content-Type', 'text/html; charset=utf-8').send(html);
});

// ─── Tombstone GC (unchanged) ──────────────────────────────
const TOMBSTONE_TTL_DAYS = 30;
const GC_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function garbageCollectTombstones() {
  try {
    const cutoff = new Date(Date.now() - TOMBSTONE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const collections = [
      { name: 'tasks', coll: syncTasksCollection },
      { name: 'habits', coll: syncHabitsCollection },
      { name: 'checkins', coll: syncHabitCheckinsCollection },
      { name: 'milestones', coll: syncMilestonesCollection },
      { name: 'projects', coll: syncProjectsCollection },
    ];
    let totalDeleted = 0;
    for (const { name, coll } of collections) {
      const snapshot = await coll.where('deletedAt', '<', cutoff).get();
      if (snapshot.empty) continue;
      const docs = snapshot.docs;
      const CHUNK = 450;
      for (let i = 0; i < docs.length; i += CHUNK) {
        const batch = db.batch();
        const slice = docs.slice(i, i + CHUNK);
        for (const d of slice) batch.delete(d.ref);
        await batch.commit();
        totalDeleted += slice.length;
      }
      console.log(`🧹 GC(${name}): hard-deleted ${snapshot.size} tombstone(s)`);
    }
    console.log(`🧹 GC: total ${totalDeleted} tombstone(s) removed`);
  } catch (err) {
    console.error('❌ GC failed:', err);
  }
}

(async () => {
  await garbageCollectTombstones();
  setInterval(() => { void garbageCollectTombstones(); }, GC_INTERVAL_MS);
})();

app.get('/', (req, res) => { res.send('MerakiList Server is alive! 🚀'); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});