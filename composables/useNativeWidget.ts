import { Capacitor, registerPlugin } from '@capacitor/core'
import { usePartsStore } from '~/stores/parts'

export interface NecoWidgetPlugin {
  updateWidget(options: {
    totalPositions: number
    totalNew: number
    totalUsed: number
    totalStock: number
    lowStockCount: number
    totalValue: number
  }): Promise<void>
}

export const NecoWidget = registerPlugin<NecoWidgetPlugin>('NecoWidget')

export function useNativeWidget() {
  const partsStore = usePartsStore()

  async function syncWidget() {
    if (!Capacitor.isNativePlatform()) return

    try {
      const stats = partsStore.stats
      await NecoWidget.updateWidget({
        totalPositions: stats.totalPositions,
        totalNew: stats.totalNewQuantity,
        totalUsed: stats.totalUsedQuantity,
        totalStock: stats.totalNewQuantity + stats.totalUsedQuantity,
        lowStockCount: stats.lowStockPositions,
        totalValue: stats.totalValuation
      })
    } catch (err) {
      console.warn('Native widget sync failed or not available:', err)
    }
  }

  return {
    syncWidget
  }
}
