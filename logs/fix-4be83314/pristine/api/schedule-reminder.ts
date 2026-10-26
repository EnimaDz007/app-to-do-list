/**
 * Vercel Serverless Function — Schedule a task reminder via OneSignal
 */

const ONESIGNAL_APP_ID = 'd9c1a8b5-5164-4bc3-bfea-6e870770913b';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { externalId, title, dueTime, taskId } = req.body || {};
    if (!externalId || !title || !dueTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const apiKey = process.env.ONESIGNAL_REST_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Server not configured' });

    const dueMs = new Date(dueTime).getTime();
    if (isNaN(dueMs)) return res.status(400).json({ error: 'Invalid dueTime' });

    const now = Date.now();
    const TWO_MIN = 2 * 60 * 1000; // Fire 2 minutes before
    const MIN_LEAD = 15 * 1000;

    let sendAfter = dueMs - TWO_MIN;
    if (sendAfter < now + MIN_LEAD) sendAfter = now + MIN_LEAD;
    if (dueMs <= now) return res.status(200).json({ skipped: true });

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [externalId] },
      target_channel: 'push',
      headings: { en: '⏰ Task Due Soon!' },
      contents: { en: `"${title}" is due in 2 minutes!` },
      send_after: new Date(sendAfter).toISOString(),
      priority: 10,
      ttl: 3600,
      android_channel_id: 'task-reminders-critical', // 🔔 Use the new channel
      android_sound: 'alarm', // 🔊 Loud sound
      android_accent_color: 'FF0000',
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
    if (!osRes.ok) return res.status(500).json({ error: 'OneSignal failed', details: osData });

    console.log('✅ Scheduled:', osData.id, 'for', new Date(sendAfter).toISOString());
    return res.status(200).json({
      success: true,
      notificationId: osData.id,
      scheduledFor: new Date(sendAfter).toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}