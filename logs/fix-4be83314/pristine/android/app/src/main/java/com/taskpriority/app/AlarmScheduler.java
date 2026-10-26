package com.taskpriority.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

public class AlarmScheduler {

    public static void schedule(Context context, long fireAtMs, String title, String taskId) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        long now = System.currentTimeMillis();
        Log.e("AlarmScheduler", "📅 Scheduling alarm for: " + fireAtMs + " | Current time: " + now + " | Diff: " + (fireAtMs - now) + "ms");

        if (fireAtMs <= now) {
            Log.e("AlarmScheduler", "❌ Fire time is in the past! Ignoring alarm to prevent immediate firing.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!alarmManager.canScheduleExactAlarms()) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                return;
            }
        }

        Intent intent = new Intent(context, AlarmTriggerReceiver.class);
        intent.putExtra("title", title);
        intent.putExtra("taskId", taskId);

        int requestCode = taskId.hashCode();

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            AlarmManager.AlarmClockInfo alarmInfo = new AlarmManager.AlarmClockInfo(fireAtMs, pendingIntent);
            alarmManager.setAlarmClock(alarmInfo, pendingIntent);
            Log.e("AlarmScheduler", "✅ Alarm successfully set with setAlarmClock");
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, fireAtMs, pendingIntent);
            Log.e("AlarmScheduler", "✅ Alarm successfully set with set()");
        }
    }

    public static void cancel(Context context, String taskId) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, AlarmTriggerReceiver.class);

        int requestCode = taskId.hashCode();

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        if (alarmManager != null) {
            alarmManager.cancel(pendingIntent);
            Log.e("AlarmScheduler", "🗑️ Alarm cancelled for: " + taskId);
        }
    }
}