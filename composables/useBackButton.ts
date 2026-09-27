import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import type { Router } from 'vue-router'
import { usePartsStore } from '~/stores/parts'

export type BackHandler = () => boolean | Promise<boolean>

const backHandlers: BackHandler[] = []

/**
 * Register a custom back-button handler (e.g. for multi-step wizards or custom sheets).
 * If the handler returns true, the back-button event is considered handled.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler)
  return () => {
    const idx = backHandlers.indexOf(handler)
    if (idx !== -1) backHandlers.splice(idx, 1)
  }
}

/**
 * Finds and closes the topmost open modal dialog or slideover.
 * Returns true if a modal was found and closed.
 */
export function closeTopModal(): boolean {
  if (typeof document === 'undefined') return false

  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]')
  ).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false
    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
  })

  if (dialogs.length > 0) {
    const topDialog = dialogs[dialogs.length - 1]

    // Blur any active input inside or outside the modal
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    // Try finding close button or dispatch Escape key
    const closeBtn = topDialog.querySelector<HTMLElement>(
      'button[aria-label="Close"], button[aria-label="Закрыть"], button.close, [data-dismiss="modal"]'
    )
    if (closeBtn) {
      closeBtn.click()
      return true
    }

    const escEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true
    })
    window.dispatchEvent(escEvent)
    topDialog.dispatchEvent(escEvent)
    return true
  }

  return false
}

let lastBackPressTime = 0
const EXIT_INTERVAL_MS = 2000
let isInitialized = false

/**
 * Initializes mobile hardware/gesture back-button handling.
 */
export function setupBackButton(options: {
  router: Router
  toast: any
  partsStore: ReturnType<typeof usePartsStore>
}) {
  if (isInitialized || typeof window === 'undefined') return
  isInitialized = true

  const { router, toast, partsStore } = options

  // Navigation stack to guarantee step-by-step backward flow
  const navStack: string[] = [router.currentRoute.value.path || '/']

  router.afterEach((to) => {
    const targetPath = to.path
    const prev = navStack[navStack.length - 2]
    if (prev === targetPath) {
      navStack.pop()
    } else if (navStack[navStack.length - 1] !== targetPath) {
      navStack.push(targetPath)
    }
  })

  async function handleBackPress() {
    // 1. Run any registered custom back handlers (LIFO order)
    for (let i = backHandlers.length - 1; i >= 0; i--) {
      const handler = backHandlers[i]
      try {
        const handled = await handler()
        if (handled) return
      } catch (err) {
        console.error('[BackButton] Custom handler error:', err)
      }
    }

    // 2. If any modal / dialog / drawer is open -> close it and stop
    if (closeTopModal()) {
      return
    }

    // 3. If an input is focused -> blur it
    if (
      document.activeElement instanceof HTMLElement &&
      (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
    ) {
      document.activeElement.blur()
    }

    const currentPath = router.currentRoute.value.path

    // 4. If on a subpage (/categories, /history, /settings, /backup), navigate back
    if (currentPath !== '/') {
      if (navStack.length > 1) {
        navStack.pop()
        router.back()
      } else {
        router.push('/')
      }
      return
    }

    // 5. User is on home catalog page ('/')
    // If search is active -> clear search first
    if (partsStore.searchQuery && partsStore.searchQuery.trim().length > 0) {
      partsStore.searchQuery = ''
      return
    }

    // If a category filter is active -> reset to all categories
    if (partsStore.selectedCategory !== 'all') {
      partsStore.selectedCategory = 'all'
      return
    }

    // 6. User is at the clean root home page -> double-tap to exit
    const now = Date.now()
    if (now - lastBackPressTime < EXIT_INTERVAL_MS) {
      if (Capacitor.isNativePlatform()) {
        App.exitApp()
      }
    } else {
      lastBackPressTime = now
      toast.add({
        id: 'back-exit-confirm',
        title: 'Нажмите «Назад» ещё раз для выхода',
        icon: 'i-lucide-log-out',
        color: 'gray',
        timeout: 2000
      })
    }
  }

  // Hook into Capacitor native back button event
  if (Capacitor.isNativePlatform()) {
    App.addListener('backButton', async () => {
      await handleBackPress()
    })
  }

  return {
    handleBackPress,
    closeTopModal,
    registerBackHandler
  }
}
