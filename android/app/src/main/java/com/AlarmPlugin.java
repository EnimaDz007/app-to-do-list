package com.taskpriority.app;

import android.content.Context;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlarmNative")
public class AlarmPlugin extends Plugin {

    @PluginMethod
    public void startAlarm(PluginCall call) {
        String title = call.getString("title", "Task Reminder");
        String taskId = call.getString("taskId", "");
        Double fireAtDouble = call.getDouble("fireAt");

        Context context = getContext();

        if (fireAtDouble != null) {
            // ✅ Schedule for future time
            long fireAtMs = fireAtDouble.longValue();
            AlarmScheduler.schedule(context, fireAtMs, title, taskId);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("scheduledFor", fireAtMs);
            call.resolve(result);
        } else {
            // Fallback: fire immediately (backward compat)
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

        // Stop any running service
        Intent serviceIntent = new Intent(context, AlarmService.class);
        context.stopService(serviceIntent);

        // Cancel any scheduled alarm
        if (!taskId.isEmpty()) {
            AlarmScheduler.cancel(context, taskId);
        }

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
}