import { Capacitor, registerPlugin } from '@capacitor/core'
import { App } from '@capacitor/app'
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
  getPendingAction(): Promise<{ action?: string | null }>
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

  async function getPendingAction(): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return null
    try {
      const res = await NecoWidget.getPendingAction()
      return res?.action || null
    } catch (err) {
      console.warn('Error reading widget pending action:', err)
      return null
    }
  }

  function onWidgetAction(callback: (action: string) => void) {
    if (!Capacitor.isNativePlatform()) return

    // 1. Check immediate pending action
    getPendingAction().then(action => {
      if (action) callback(action)
    })

    // 2. Listen to App URL open (e.g. necopart://action/writeoff)
    App.addListener('appUrlOpen', (event) => {
      try {
        const url = event.url
        if (url && url.includes('necopart://action/')) {
          const action = url.replace('necopart://action/', '').split('?')[0].split('/')[0]
          if (action) {
            callback(action)
          }
        }
      } catch (e) {
        console.warn('Error handling deep link url:', e)
      }
    })

    // 3. Listen to app state change (e.g. resuming from background)
    App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        getPendingAction().then(action => {
          if (action) callback(action)
        })
      }
    })
  }

  return {
    syncWidget,
    getPendingAction,
    onWidgetAction
  }
}
