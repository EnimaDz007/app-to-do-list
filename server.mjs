import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';

// 1. Initialize Firebase Admin
// Reads from environment variable (for production/Render) OR local file (for development)
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

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// 2. Persistent Database (JSON file)
const DB_FILE = './data.json';
let db = {
  registeredTokens: {}, // userId -> fcmToken
  scheduledTasks: {}    // taskId -> { externalId, title, dueTime, taskId }
};

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!db.registeredTokens) db.registeredTokens = {};
      if (!db.scheduledTasks) db.scheduledTasks = {};
      console.log(`📂 Loaded DB → Tokens: ${Object.keys(db.registeredTokens).length} | Tasks: ${Object.keys(db.scheduledTasks).length}`);
    } else {
      console.log('📂 No DB found. Starting fresh.');
    }
  } catch (err) {
    console.error('Failed to load DB:', err);
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
}

loadDB();

// 3. Timer management
const scheduledTimers = {}; // taskId -> setTimeout handle

async function sendPushForTask(taskId) {
  const task = db.scheduledTasks[taskId];
  if (!task) {
    console.log(`⏭️ Task ${taskId} no longer exists. Skipping push.`);
    return;
  }

  const fcmToken = db.registeredTokens[task.externalId];
  if (!fcmToken) {
    console.log(`❌ No FCM token found for user ${task.externalId}`);
    delete db.scheduledTasks[taskId];
    saveDB();
    return;
  }

  try {
    const response = await getMessaging().send({
      token: fcmToken,
      notification: {
        title: '⏰ ' + task.title,
        body: 'Your task is due now!'
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'task-reminders-critical'
        }
      }
    });
    console.log(`🚀 Auto-push sent for "${task.title}":`, response);
  } catch (error) {
    console.error('❌ Error sending auto-push:', error);
    // Clean up invalid tokens automatically
    if (error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token') {
      console.log(`🗑️ Removing invalid token for user ${task.externalId}`);
      delete db.registeredTokens[task.externalId];
    }
  }

  delete db.scheduledTasks[taskId];
  delete scheduledTimers[taskId];
  saveDB();
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

// 4. On boot: reload all pending tasks
function rescheduleAll() {
  const taskIds = Object.keys(db.scheduledTasks);
  if (taskIds.length === 0) return;

  console.log(`🔄 Rescheduling ${taskIds.length} pending task(s) from DB...`);
  taskIds.forEach((taskId) => {
    const ok = scheduleTask(db.scheduledTasks[taskId]);
    if (!ok) {
      delete db.scheduledTasks[taskId];
    }
  });
  saveDB();
}

rescheduleAll();

// 5. ROUTE: Register device token
app.post('/api/register-device', (req, res) => {
  const { userId, fcmToken } = req.body;
  if (!userId || !fcmToken) {
    return res.status(400).json({ error: 'userId and fcmToken are required' });
  }
  db.registeredTokens[userId] = fcmToken;
  saveDB();
  console.log(`📱 Device registered! User: ${userId}`);
  res.json({ success: true, message: "Device registered" });
});

// 6. ROUTE: Schedule a reminder
app.post('/api/schedule-reminder', (req, res) => {
  const { externalId, title, dueTime, taskId } = req.body;
  console.log("✅ Reminder request:", { externalId, title, dueTime, taskId });

  if (!externalId || !dueTime || !taskId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const dueTimestamp = new Date(dueTime).getTime();
  if (isNaN(dueTimestamp) || dueTimestamp <= Date.now()) {
    return res.status(400).json({ error: 'Invalid or overdue dueTime' });
  }

  // Save to persistent DB
  db.scheduledTasks[taskId] = { externalId, title, dueTime, taskId };
  saveDB();

  // Schedule the timer
  scheduleTask(db.scheduledTasks[taskId]);

  res.json({ success: true, message: "Reminder scheduled", fireInMs: dueTimestamp - Date.now() });
});

// 7. ROUTE: Cancel a reminder
app.post('/api/cancel-reminder', (req, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ error: 'taskId is required' });

  if (scheduledTimers[taskId]) {
    clearTimeout(scheduledTimers[taskId]);
    delete scheduledTimers[taskId];
    console.log(`🗑️ Cancelled timer for task: ${taskId}`);
  }

  if (db.scheduledTasks[taskId]) {
    delete db.scheduledTasks[taskId];
    saveDB();
  }

  res.json({ success: true, message: "Reminder cancelled" });
});

// 8. A simple health-check route (useful for Render to verify the server is alive)
app.get('/', (req, res) => {
  res.send('Task Priority Server is alive! 🚀');
});

// 9. Start the server
// Render provides the PORT via environment variable. Locally, defaults to 5000.
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});