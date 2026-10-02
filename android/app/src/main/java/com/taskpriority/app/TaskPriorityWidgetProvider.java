package com.taskpriority.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Task Priority home-screen widget — Midnight Aurora design.
 * Reads from the "WidgetData" SharedPreferences file,
 * which is written by WidgetBridgePlugin on every state change.
 */
public class TaskPriorityWidgetProvider extends AppWidgetProvider {

    private static final int MAX_TASKS = 3;

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId);
        }
    }

    private void updateWidget(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_task_priority);

        SharedPreferences prefs = context.getSharedPreferences(
            WidgetBridgePlugin.PREFS_FILE, Context.MODE_PRIVATE);
        String raw = prefs.getString(WidgetBridgePlugin.KEY_DATA, null);

        int streak = 0;
        int karma = 0;
        int levelProgress = 0;
        String levelEmoji = "🌱";
        String levelName = "Beginner";
        JSONArray tasks = new JSONArray();

        if (raw != null) {
            try {
                JSONObject data = new JSONObject(raw);
                streak = data.optInt("streak", 0);
                karma = data.optInt("karma", 0);
                levelProgress = data.optInt("levelProgress", 0);
                levelEmoji = data.optString("levelEmoji", "🌱");
                levelName = data.optString("levelName", "Beginner");
                tasks = data.optJSONArray("tasks");
                if (tasks == null) tasks = new JSONArray();
            } catch (Exception ignored) {}
        }

        // Hero stats
        views.setTextViewText(R.id.widget_karma, String.valueOf(karma));
        views.setTextViewText(R.id.widget_streak, streak + "d");
        views.setTextViewText(R.id.widget_level, levelEmoji + " " + levelName);
        views.setProgressBar(R.id.widget_progress, 100, levelProgress, false);

        // Task rows
        int[] rowIds = { R.id.widget_task_row_1, R.id.widget_task_row_2, R.id.widget_task_row_3 };
        int[] barIds = { R.id.widget_task_bar_1, R.id.widget_task_bar_2, R.id.widget_task_bar_3 };
        int[] textIds = { R.id.widget_task_text_1, R.id.widget_task_text_2, R.id.widget_task_text_3 };

        int shown = 0;
        for (int i = 0; i < MAX_TASKS; i++) {
            if (i < tasks.length()) {
                try {
                    JSONObject t = tasks.getJSONObject(i);
                    String title = t.optString("title", "");
                    String quadrant = t.optString("quadrant", "schedule");

                    views.setViewVisibility(rowIds[i], View.VISIBLE);
                    views.setTextViewText(textIds[i], title);
                    views.setInt(barIds[i], "setBackgroundColor", quadrantColor(quadrant));
                    shown++;
                } catch (Exception e) {
                    views.setViewVisibility(rowIds[i], View.GONE);
                }
            } else {
                views.setViewVisibility(rowIds[i], View.GONE);
            }
        }

        views.setViewVisibility(R.id.widget_empty, shown == 0 ? View.VISIBLE : View.GONE);

        // Tap anywhere → open app
        Intent openApp = new Intent(context, MainActivity.class);
        openApp.setAction(Intent.ACTION_MAIN);
        openApp.addCategory(Intent.CATEGORY_LAUNCHER);
        PendingIntent openPending = PendingIntent.getActivity(
            context, 0, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, openPending);
        views.setOnClickPendingIntent(R.id.widget_add_btn, openPending);

        manager.updateAppWidget(widgetId, views);
    }

    private int quadrantColor(String quadrant) {
        switch (quadrant) {
            case "do_first":  return Color.rgb(244, 63, 94);
            case "schedule":  return Color.rgb(129, 140, 248);
            case "delegate":  return Color.rgb(52, 211, 153);
            case "eliminate": return Color.rgb(148, 163, 184);
            default:          return Color.rgb(203, 213, 225);
        }
    }
}