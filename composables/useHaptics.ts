import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

export function useHaptics() {
  /**
   * Light tactile tap - for button presses, stepper adjustments, tabs
   */
  async function lightTap() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(10)
      }
    }
  }

  /**
   * Medium tactile bump - for modal toggles, filter switches
   */
  async function mediumTap() {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(25)
      }
    }
  }

  /**
   * Success notification vibration - double pulse for successful save or write-off
   */
  async function successVibe() {
    try {
      await Haptics.notification({ type: NotificationType.Success })
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([15, 40, 20])
      }
    }
  }

  /**
   * Warning vibration - for low stock or limit warnings
   */
  async function warningVibe() {
    try {
      await Haptics.notification({ type: NotificationType.Warning })
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([30, 80, 30])
      }
    }
  }

  /**
   * Error or destructive action vibration
   */
  async function errorVibe() {
    try {
      await Haptics.notification({ type: NotificationType.Error })
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([40, 30, 40])
      }
    }
  }

  /**
   * Selection / picker vibration
   */
  async function selectionVibe() {
    try {
      await Haptics.selectionStart()
      await Haptics.selectionChanged()
    } catch {
      await lightTap()
    }
  }

  return {
    lightTap,
    mediumTap,
    selectionVibe,
    successVibe,
    warningVibe,
    errorVibe
  }
}
