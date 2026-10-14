package com.necopart.storage;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

public class NecoQuickActionWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("NecoWidgetPrefs", Context.MODE_PRIVATE);
        int totalNew = prefs.getInt("totalNew", 0);
        int totalUsed = prefs.getInt("totalUsed", 0);
        int totalStock = prefs.getInt("totalStock", totalNew + totalUsed);
        int lowStockCount = prefs.getInt("lowStockCount", 0);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_neco_functional);

        views.setTextViewText(R.id.widget_fn_stock_badge, totalStock + " шт (" + totalNew + " нов / " + totalUsed + " б/у)");

        if (lowStockCount > 0) {
            views.setTextViewText(R.id.widget_fn_deficit_text, "Заказ (" + lowStockCount + ")");
        } else {
            views.setTextViewText(R.id.widget_fn_deficit_text, "Заказ");
        }

        // 1. Search action
        Intent sIntent = new Intent(context, MainActivity.class);
        sIntent.setAction("ACTION_SEARCH");
        sIntent.putExtra("quick_action", "search");
        sIntent.setData(Uri.parse("necopart://action/search"));
        sIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent sPi = PendingIntent.getActivity(context, 101, sIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_btn_search, sPi);

        // 2. Write-off action (Списать)
        Intent wIntent = new Intent(context, MainActivity.class);
        wIntent.setAction("ACTION_WRITEOFF");
        wIntent.putExtra("quick_action", "writeoff");
        wIntent.setData(Uri.parse("necopart://action/writeoff"));
        wIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent wPi = PendingIntent.getActivity(context, 102, wIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_btn_writeoff, wPi);

        // 3. Stock In action (Приход)
        Intent iIntent = new Intent(context, MainActivity.class);
        iIntent.setAction("ACTION_STOCK_IN");
        iIntent.putExtra("quick_action", "stock_in");
        iIntent.setData(Uri.parse("necopart://action/stock_in"));
        iIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent iPi = PendingIntent.getActivity(context, 103, iIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_btn_stock_in, iPi);

        // 4. Deficit action (Дефицит)
        Intent dIntent = new Intent(context, MainActivity.class);
        dIntent.setAction("ACTION_DEFICIT");
        dIntent.putExtra("quick_action", "deficit");
        dIntent.setData(Uri.parse("necopart://action/deficit"));
        dIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent dPi = PendingIntent.getActivity(context, 104, dIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_btn_deficit, dPi);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
