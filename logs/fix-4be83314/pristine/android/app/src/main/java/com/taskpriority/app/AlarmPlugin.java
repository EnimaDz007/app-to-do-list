package com.taskpriority.app;

import android.content.Context;
import android.content.Intent;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlarmNative")
public class AlarmPlugin extends Plugin {

    @PluginMethod
    public void startAlarm(PluginCall call) {
        Log.e("AlarmDebug", "🔥 AlarmPlugin.startAlarm() was called from JavaScript!");
        Log.e("AlarmDebug", "📦 Full call data: " + call.getData().toString());

        String title = call.getString("title", "Task Reminder");
        String taskId = call.getString("taskId", "");

        // ✅ Read fireAt directly from the raw data to bypass the broken Capacitor bridge
        Object fireAtObj = call.getData().opt("fireAt");
        long fireAtMs = 0;

        if (fireAtObj instanceof Number) {
            fireAtMs = ((Number) fireAtObj).longValue();
        } else if (fireAtObj instanceof String) {
            try {
                fireAtMs = Long.parseLong((String) fireAtObj);
            } catch (NumberFormatException e) {
                Log.e("AlarmDebug", "❌ Failed to parse fireAt string: " + fireAtObj);
            }
        }

        Log.e("AlarmDebug", "✅ Parsed fireAtMs: " + fireAtMs);

        Context context = getContext();
        long now = System.currentTimeMillis();

        if (fireAtMs > now) {
            AlarmScheduler.schedule(context, fireAtMs, title, taskId);
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("scheduledFor", fireAtMs);
            call.resolve(result);
        } else {
            Log.e("AlarmDebug", "❌ fireAt is invalid or in the past! Firing immediately as fallback.");
            Intent intent = new Intent(context, AlarmService.class);
            intent.putExtra("title", title);
            intent.putExtra("taskId", taskId);

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        String taskId = call.getString("taskId", "");
        Context context = getContext();

        Intent serviceIntent = new Intent(context, AlarmService.class);
        context.stopService(serviceIntent);

        if (taskId != null && !taskId.isEmpty()) {
            AlarmScheduler.cancel(context, taskId);
        }

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
}