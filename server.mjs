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

// 2. Firestore database
const db = getFirestore();
const tokensCollection = db.collection('tokens');
const tasksCollection = db.collection('tasks');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// 3. Timer management
const scheduledTimers = {};

async function sendPushForTask(taskId) {
  console.log(`🔔 Timer fired for task: ${taskId}`);
  try {
    const taskDoc = await tasksCollection.doc(taskId).get();
    if (!taskDoc.exists) {
      console.log(`⏭️ Task ${taskId} no longer exists. Skipping push.`);
      return;
    }
    const task = taskDoc.data();

    const tokenDoc = await tokensCollection.doc(task.externalId).get();
    if (!tokenDoc.exists) {
      console.log(`❌ No FCM token found for user ${task.externalId}`);
      await tasksCollection.doc(taskId).delete();
      return;
    }
    const fcmToken = tokenDoc.data().fcmToken;

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
  } catch (error) {
    console.error('❌ Error sending auto-push:', error);
  }

  try {
    await tasksCollection.doc(taskId).delete();
  } catch (err) {
    console.error('Failed to delete task from Firestore:', err);
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

// 4. On boot: reload all pending tasks from Firestore
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
    console.error('Failed to reschedule from Firestore:', err);
  }
}

rescheduleAll();

// 5. ROUTE: Register device token
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
    console.error('Failed to register device:', err);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// 6. ROUTE: Schedule a reminder
app.post('/api/schedule-reminder', async (req, res) => {
  const { externalId, title, dueTime, taskId } = req.body;
  console.log("✅ Reminder request:", { externalId, title, dueTime, taskId });

  if (!externalId || !dueTime || !taskId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const dueTimestamp = new Date(dueTime).getTime();
  if (isNaN(dueTimestamp) || dueTimestamp <= Date.now()) {
    return res.status(400).json({ error: 'Invalid or overdue dueTime' });
  }

  try {
    await tasksCollection.doc(taskId).set({ externalId, title, dueTime, taskId });
    scheduleTask({ externalId, title, dueTime, taskId });
    res.json({ success: true, message: "Reminder scheduled", fireInMs: dueTimestamp - Date.now() });
  } catch (err) {
    console.error('Failed to schedule reminder:', err);
    res.status(500).json({ error: 'Failed to schedule reminder' });
  }
});

// 7. ROUTE: Cancel a reminder
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
    console.error('Failed to delete task from Firestore:', err);
  }

  res.json({ success: true, message: "Reminder cancelled" });
});

// 8. Health check route
app.get('/', (req, res) => {
  res.send('Task Priority Server is alive! 🚀');
});

// 9. Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});