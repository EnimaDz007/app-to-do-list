package com.taskpriority.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Writes widget data to a dedicated SharedPreferences file AND
 * pings the widget to refresh immediately.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    static final String PREFS_FILE = "WidgetData";
    static final String KEY_DATA = "widget_data";

    @PluginMethod
    public void updateWidget(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("Missing 'data'");
            return;
        }

        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_DATA, data).apply();

        // Force the widget to re-render NOW
        AppWidgetManager manager = AppWidgetManager.getInstance(ctx);
        ComponentName widget = new ComponentName(ctx, TaskPriorityWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(widget);
        if (ids != null && ids.length > 0) {
            Intent intent = new Intent(ctx, TaskPriorityWidgetProvider.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            ctx.sendBroadcast(intent);
        }

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
}