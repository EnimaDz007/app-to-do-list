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

        Context context = getContext();
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

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, AlarmService.class);
        context.stopService(intent);

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
}