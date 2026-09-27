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

        String title = call.getString("title", "Task Reminder");
        String taskId = call.getString("taskId", "");
        Double fireAtDouble = call.getDouble("fireAt");

        Log.e("AlarmDebug", "📦 Received fireAt: " + fireAtDouble);

        Context context = getContext();

        if (fireAtDouble != null) {
            long fireAtMs = fireAtDouble.longValue();
            AlarmScheduler.schedule(context, fireAtMs, title, taskId);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("scheduledFor", fireAtMs);
            call.resolve(result);
        } else {
            Log.e("AlarmDebug", "❌ fireAt was null! Firing immediately as fallback.");
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

        if (!taskId.isEmpty()) {
            AlarmScheduler.cancel(context, taskId);
        }

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
}