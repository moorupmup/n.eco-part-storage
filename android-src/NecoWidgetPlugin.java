package com.necopart.storage;

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

@CapacitorPlugin(name = "NecoWidget")
public class NecoWidgetPlugin extends Plugin {

    private static String pendingAction = null;

    public static void setPendingAction(String action) {
        pendingAction = action;
    }

    @PluginMethod
    public void getPendingAction(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("action", pendingAction);
        pendingAction = null; // Clear once read
        call.resolve(ret);
    }

    @PluginMethod
    public void updateWidget(PluginCall call) {
        int totalPositions = call.getInt("totalPositions", 0);
        int totalNew = call.getInt("totalNew", 0);
        int totalUsed = call.getInt("totalUsed", 0);
        int totalStock = call.getInt("totalStock", totalNew + totalUsed);
        int lowStockCount = call.getInt("lowStockCount", 0);
        int totalValue = call.getInt("totalValue", 0);

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences("NecoWidgetPrefs", Context.MODE_PRIVATE);
        prefs.edit()
            .putInt("totalPositions", totalPositions)
            .putInt("totalNew", totalNew)
            .putInt("totalUsed", totalUsed)
            .putInt("totalStock", totalStock)
            .putInt("lowStockCount", lowStockCount)
            .putInt("totalValue", totalValue)
            .apply();

        // 1. Update Compact Widget
        Intent compactIntent = new Intent(context, NecoPartsWidgetProvider.class);
        compactIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] compactIds = AppWidgetManager.getInstance(context).getAppWidgetIds(
            new ComponentName(context, NecoPartsWidgetProvider.class)
        );
        if (compactIds != null && compactIds.length > 0) {
            compactIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, compactIds);
            context.sendBroadcast(compactIntent);
        }

        // 2. Update Functional Widget
        Intent funcIntent = new Intent(context, NecoQuickActionWidgetProvider.class);
        funcIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] funcIds = AppWidgetManager.getInstance(context).getAppWidgetIds(
            new ComponentName(context, NecoQuickActionWidgetProvider.class)
        );
        if (funcIds != null && funcIds.length > 0) {
            funcIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, funcIds);
            context.sendBroadcast(funcIntent);
        }

        call.resolve();
    }
}
