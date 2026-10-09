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

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const tokensCollection = db.collection('tokens');
const tasksCollection = db.collection('tasks');
const habitRemindersCollection = db.collection('habitReminders');
const delegateCollection = db.collection('delegates');
const prefsCollection = db.collection('preferences');
const syncTasksCollection = db.collection('syncTasks');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

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
  console.log(`⏰ Scheduling push for "${task.title}" in ${Math.round(delay/1000)}s`);
  scheduledTimers[task.taskId] = setTimeout(() => sendPushForTask(task.taskId), delay);
  return true;
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
    });
    for (const id of toDelete) await tasksCollection.doc(id).delete();
  } catch (err) { console.error('Failed to reschedule tasks:', err); }
}

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

app.post('/api/register-device', async (req, res) => {
  const { userId, fcmToken } = req.body;
  if (!userId || !fcmToken) return res.status(400).json({ error: 'Missing fields' });
  try {
    await tokensCollection.doc(userId).set({ fcmToken, updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to register device' }); }
});

app.post('/api/schedule-reminder', async (req, res) => {
  const { externalId, title, dueTime, taskId, recurrence, fullTask } = req.body;
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
  } catch (err) { res.status(500).json({ error: 'Failed to schedule reminder' }); }
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
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
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

app.get('/api/sync/:userId', async (req, res) => {
  const { userId } = req.params;
  const since = req.query.since ? String(req.query.since) : null;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const serverTime = new Date().toISOString();
    const snapshot = await syncTasksCollection.where('externalId', '==', userId).get();
    const sinceTs = since ? new Date(since).getTime() : 0;
    const tasks = [];
    let maxServerUpdatedAt = serverTime;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const serverTs = new Date(data.serverUpdatedAt || 0).getTime();
      if (serverTs > sinceTs) {
        tasks.push({ ...data, id: doc.id });
      }
      if (serverTs > new Date(maxServerUpdatedAt).getTime()) {
        maxServerUpdatedAt = data.serverUpdatedAt;
      }
    });

    console.log(`📤 sync pull: user=${userId} since=${since || 'first'} → ${tasks.length} task(s)`);
    res.json({ success: true, tasks, serverTime: maxServerUpdatedAt, count: tasks.length });
  } catch (err) {
    console.error('❌ sync GET failed:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/sync/:userId', async (req, res) => {
  const { userId } = req.params;
  const { tasks } = req.body || {};
  if (!userId || !Array.isArray(tasks)) {
    return res.status(400).json({ error: 'userId and tasks[] required' });
  }

  try {
    const now = new Date().toISOString();
    const batch = db.batch();
    let applied = 0;
    const CAP = 400;

    for (const task of tasks.slice(0, CAP)) {
      if (!task || !task.id) continue;
      const ref = syncTasksCollection.doc(String(task.id));
      const payload = {
        ...task,
        externalId: userId,
        serverUpdatedAt: now,
      };
      batch.set(ref, payload, { merge: false });
      applied++;
    }

    await batch.commit();
    console.log(`📥 sync push: user=${userId} → ${applied} applied`);
    res.json({ success: true, applied, serverTime: now });
  } catch (err) {
    console.error('❌ sync POST failed:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/sync/:userId/delete', async (req, res) => {
  const { userId } = req.params;
  const { taskId } = req.body || {};
  if (!userId || !taskId) return res.status(400).json({ error: 'userId and taskId required' });
  try {
    await syncTasksCollection.doc(String(taskId)).delete();
    res.json({ success: true });
  } catch (err) {
    console.error('sync delete failed:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/preferences/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const doc = await prefsCollection.doc(userId).get();
    if (!doc.exists) return res.json({ success: true, preferences: null });
    res.json({ success: true, preferences: doc.data() });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

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
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/schedule-habit-reminder', async (req, res) => {
  const { habitId, externalId, name, emoji, reminderTime, daysOfWeek, timezoneOffsetMinutes } = req.body;
  if (!habitId || !externalId || !reminderTime) return res.status(400).json({ error: 'Missing fields' });
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
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/cancel-habit-reminder', async (req, res) => {
  const { habitId } = req.body;
  if (!habitId) return res.status(400).json({ error: 'habitId required' });
  if (scheduledHabitTimers[habitId]) {
    clearTimeout(scheduledHabitTimers[habitId]);
    delete scheduledHabitTimers[habitId];
  }
  try { await habitRemindersCollection.doc(habitId).delete(); } catch {}
  res.json({ success: true });
});

app.post('/api/delegate/create', async (req, res) => {
  const { taskId, title, description, dueDate, externalId, senderName } = req.body;
  if (!taskId || !title) return res.status(400).json({ error: 'Missing taskId or title' });
  try {
    const delegateId = `del-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await delegateCollection.doc(delegateId).set({
      delegateId, taskId, title,
      description: description || '',
      dueDate: dueDate || null,
      externalId: externalId || '',
      senderName: senderName || 'A teammate',
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
      completedBy: completedBy || 'Anonymous',
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
      rejectionReason: reason || '',
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

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

app.get('/', (req, res) => { res.send('Task Priority Server is alive! 🚀'); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
