package com.necopart.storage;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NecoWidget")
public class NecoWidgetPlugin extends Plugin {

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

        // Broadcast to trigger AppWidget update
        Intent intent = new Intent(context, NecoPartsWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(context).getAppWidgetIds(
            new ComponentName(context, NecoPartsWidgetProvider.class)
        );
        if (ids != null && ids.length > 0) {
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            context.sendBroadcast(intent);
        }

        call.resolve();
    }
}
