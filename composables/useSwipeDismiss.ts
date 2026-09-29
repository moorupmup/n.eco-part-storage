import { ref, computed, type Ref, watch } from 'vue'
import { useHaptics } from './useHaptics'

export interface SwipeDismissOptions {
  /** Callback fired when the swipe-down threshold is met and gesture is released */
  onDismiss: () => void
  /**
   * Distance in pixels to trigger dismiss on release.
   * Defaults to 80px.
   */
  threshold?: number
  /**
   * Minimum downward flick velocity (px/ms) to trigger dismiss regardless of distance.
   * Defaults to 0.4 px/ms.
   */
  velocityThreshold?: number
  /**
   * Optional ref tracking if the modal is currently open.
   * If provided, resets internal drag state whenever isOpen changes.
   */
  isOpen?: Ref<boolean>
}

export function useSwipeDismiss(options: SwipeDismissOptions) {
  const {
    onDismiss,
    threshold = 80,
    velocityThreshold = 0.4,
    isOpen
  } = options

  const haptics = useHaptics()

  const isDragging = ref(false)
  const isDismissing = ref(false)
  const offsetY = ref(0)

  let startY = 0
  let startTime = 0
  let hasTriggeredHaptic = false
  let activePointerId: number | null = null
  let activeTarget: HTMLElement | null = null

  if (isOpen) {
    watch(isOpen, () => {
      resetState()
    })
  }

  function resetState() {
    isDragging.value = false
    isDismissing.value = false
    offsetY.value = 0
    hasTriggeredHaptic = false
    activePointerId = null
    activeTarget = null
  }

  const sheetStyle = computed(() => {
    if (offsetY.value === 0 && !isDragging.value && !isDismissing.value) {
      return {}
    }
    return {
      transform: `translate3d(0, ${offsetY.value}px, 0)`,
      opacity: isDismissing.value ? 0 : 1,
      transition: isDragging.value
        ? 'none'
        : isDismissing.value
          ? 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease-out'
          : 'transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      willChange: isDragging.value ? 'transform' : 'auto'
    }
  })

  function onPointerDown(e: PointerEvent) {
    // Only primary mouse button or touch
    if (e.button !== 0) return

    // Do not initiate drag if user tapped an interactive element inside
    const target = e.target as HTMLElement | null
    if (target && target.closest('button, a, input, select, textarea, [role="button"]')) {
      return
    }

    const currentTarget = e.currentTarget as HTMLElement | null
    activeTarget = currentTarget
    activePointerId = e.pointerId

    if (currentTarget && currentTarget.setPointerCapture) {
      try {
        currentTarget.setPointerCapture(e.pointerId)
      } catch {}
    }

    isDragging.value = true
    isDismissing.value = false
    startY = e.clientY
    startTime = performance.now()
    hasTriggeredHaptic = false
    offsetY.value = 0

    function onPointerMove(ev: PointerEvent) {
      if (!isDragging.value || ev.pointerId !== activePointerId) return

      const deltaY = ev.clientY - startY

      if (deltaY > 0) {
        // Downward drag: linear up to threshold, then gentle damping
        offsetY.value = deltaY > threshold
          ? threshold + (deltaY - threshold) * 0.42
          : deltaY

        // Tactile notch vibration when crossing the dismiss threshold
        if (offsetY.value >= threshold && !hasTriggeredHaptic) {
          haptics.lightTap()
          hasTriggeredHaptic = true
        } else if (offsetY.value < threshold && hasTriggeredHaptic) {
          hasTriggeredHaptic = false
        }
      } else {
        // Upward drag: heavy elastic resistance
        offsetY.value = Math.max(-18, deltaY * 0.12)
      }
    }

    function onPointerUp(ev: PointerEvent) {
      if (ev.pointerId !== activePointerId) return
      cleanup()

      if (!isDragging.value) return
      isDragging.value = false

      const deltaY = ev.clientY - startY
      const duration = performance.now() - startTime
      const velocity = deltaY / Math.max(1, duration)

      const shouldDismiss = offsetY.value >= threshold || (offsetY.value > 25 && velocity > velocityThreshold)

      if (shouldDismiss) {
        isDismissing.value = true
        haptics.lightTap()
        // Slide smoothly downwards
        offsetY.value = Math.max(offsetY.value + 200, 360)
        setTimeout(() => {
          onDismiss()
          resetState()
        }, 180)
      } else {
        // Spring back smoothly
        offsetY.value = 0
      }
    }

    function onPointerCancel(ev: PointerEvent) {
      if (ev.pointerId !== activePointerId) return
      cleanup()
      resetState()
    }

    function cleanup() {
      if (activeTarget && activePointerId !== null && activeTarget.releasePointerCapture) {
        try {
          activeTarget.releasePointerCapture(activePointerId)
        } catch {}
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerCancel)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      window.addEventListener('pointercancel', onPointerCancel)
    }
  }

  return {
    isDragging,
    isDismissing,
    offsetY,
    sheetStyle,
    onPointerDown,
    resetState
  }
}
