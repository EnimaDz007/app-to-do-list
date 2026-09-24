/**
 * Vercel Serverless Function — Schedule a task reminder via OneSignal
 * POST /api/schedule-reminder
 * Body: { externalId: string, title: string, dueTime: string (ISO), taskId: string }
 */

const ONESIGNAL_APP_ID = 'd9c1a8b5-5164-4bc3-bfea-6e870770913b';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { externalId, title, dueTime, taskId } = req.body || {};

    if (!externalId || !title || !dueTime) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['externalId', 'title', 'dueTime'],
      });
    }

    const apiKey = process.env.ONESIGNAL_REST_API_KEY;
    if (!apiKey) {
      console.error('Missing ONESIGNAL_REST_API_KEY env var');
      return res.status(500).json({ error: 'Server not configured' });
    }

    const dueMs = new Date(dueTime).getTime();
    if (isNaN(dueMs)) {
      return res.status(400).json({ error: 'Invalid dueTime format' });
    }

    const reminderMs = dueMs - 15 * 60 * 1000;
    const now = Date.now();

    let sendAfter: number;
    if (reminderMs > now) {
      sendAfter = reminderMs;
    } else if (dueMs > now) {
      sendAfter = now + 10000;
    } else {
      return res.status(200).json({ skipped: true, reason: 'already_past' });
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [externalId] },
      target_channel: 'push',
      headings: { en: '⏰ Task Reminder' },
      contents: { en: `"${title}" is due soon!` },
      send_after: new Date(sendAfter).toISOString(),
      priority: 10,
      ttl: 3600,
      data: { taskId: taskId || null },
    };

    const osRes = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const osData = await osRes.json();

    if (!osRes.ok) {
      console.error('OneSignal error:', osData);
      return res.status(500).json({
        error: 'OneSignal request failed',
        details: osData,
      });
    }

    console.log('✅ Scheduled via OneSignal:', osData.id, 'for', new Date(sendAfter).toISOString());

    return res.status(200).json({
      success: true,
      notificationId: osData.id,
      scheduledFor: new Date(sendAfter).toISOString(),
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: String(err) });
  }
}