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

    const now = Date.now();
    const FIFTEEN_MIN = 15 * 60 * 1000;
    const ONE_MIN = 60 * 1000;

    let sendAfter: number;

    if (dueMs - FIFTEEN_MIN > now + ONE_MIN) {
      // Plenty of time → schedule for 15 minutes before due
      sendAfter = dueMs - FIFTEEN_MIN;
    } else if (dueMs > now + ONE_MIN) {
      // Less than 15 min but more than 1 min → fire 1 minute before due
      sendAfter = dueMs - ONE_MIN;
    } else {
      // Due within 1 minute or already past → skip
      return res.status(200).json({ skipped: true, reason: 'too_close_or_past' });
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