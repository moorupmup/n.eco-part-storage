package com.necopart.storage;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

public class NecoPartsWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("NecoWidgetPrefs", Context.MODE_PRIVATE);
        int totalPositions = prefs.getInt("totalPositions", 0);
        int totalNew = prefs.getInt("totalNew", 0);
        int totalUsed = prefs.getInt("totalUsed", 0);
        int totalStock = prefs.getInt("totalStock", totalNew + totalUsed);
        int lowStockCount = prefs.getInt("lowStockCount", 0);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_neco_compact);

        views.setTextViewText(R.id.widget_compact_total, totalStock + " шт");
        views.setTextViewText(R.id.widget_compact_sub, "(" + totalNew + " нов / " + totalUsed + " б/у)");

        if (lowStockCount > 0) {
            views.setTextViewText(R.id.widget_compact_deficit, String.valueOf(lowStockCount));
            views.setTextColor(R.id.widget_compact_deficit, Color.parseColor("#f59e0b"));
            views.setTextViewText(R.id.widget_compact_deficit_label, "дефицит");
            views.setTextColor(R.id.widget_compact_deficit_label, Color.parseColor("#f59e0b"));
        } else {
            views.setTextViewText(R.id.widget_compact_deficit, "✓");
            views.setTextColor(R.id.widget_compact_deficit, Color.parseColor("#10b981"));
            views.setTextViewText(R.id.widget_compact_deficit_label, "норма");
            views.setTextColor(R.id.widget_compact_deficit_label, Color.parseColor("#10b981"));
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_compact_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
