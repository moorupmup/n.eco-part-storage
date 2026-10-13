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
        int totalValue = prefs.getInt("totalValue", 0);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_neco_parts);

        // Set metrics
        views.setTextViewText(R.id.widget_total_stock, totalStock + " шт");
        views.setTextViewText(R.id.widget_total_positions, totalPositions + " поз.");
        views.setTextViewText(R.id.widget_conditions, totalNew + " нов / " + totalUsed + " б/у");

        if (totalValue > 0) {
            views.setTextViewText(R.id.widget_valuation, String.format("%,d ₽", totalValue));
        } else {
            views.setTextViewText(R.id.widget_valuation, "— ₽");
        }

        // Deficit indicators
        if (lowStockCount > 0) {
            views.setTextViewText(R.id.widget_deficit, String.valueOf(lowStockCount));
            views.setTextColor(R.id.widget_deficit, Color.parseColor("#f59e0b"));
            views.setTextViewText(R.id.widget_status_text, "ТРЕБУЮТ ЗАКАЗА");
            views.setTextColor(R.id.widget_status_text, Color.parseColor("#f59e0b"));
        } else {
            views.setTextViewText(R.id.widget_deficit, "0");
            views.setTextColor(R.id.widget_deficit, Color.parseColor("#10b981"));
            views.setTextViewText(R.id.widget_status_text, "ДЕФИЦИТА НЕТ");
            views.setTextColor(R.id.widget_status_text, Color.parseColor("#10b981"));
        }

        // Tap on widget opens MainActivity
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
