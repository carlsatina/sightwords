import { ref } from 'vue'

/**
 * Distinguishes a tap from a swipe on one touch surface.
 *
 * Both gestures start with the same touchstart, so they are told apart on
 * release: a short, near-stationary touch is a tap; a longer horizontal travel
 * is a swipe. Vertical drags are ignored so the gesture never fights a scroll.
 */

/** Horizontal travel before a drag counts as a swipe. */
const SWIPE_MIN_DISTANCE = 55
/** A swipe must be mostly horizontal, not a diagonal scroll. */
const SWIPE_MAX_VERTICAL_RATIO = 0.8
/** Beyond this, a stationary touch is a long-press rather than a tap. */
const TAP_MAX_DURATION = 500
const TAP_MAX_MOVEMENT = 12

/**
 * Gap within which a second tap counts as a double tap.
 *
 * The first tap still fires `onTap` immediately rather than waiting to see
 * whether a second one arrives — holding speech back by a third of a second to
 * disambiguate would make every single tap feel broken. A double tap therefore
 * reads as "speak, then toggle", and `onDoubleTap` replaces the second
 * `onTap` rather than firing alongside it, so the word is never spoken twice.
 */
const DOUBLE_TAP_MAX_GAP = 320

export interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onTap?: () => void
  onDoubleTap?: () => void
}

/**
 * Elements that handle their own taps. A touch starting on one of these is the
 * control's business, not the surface's — `@click.stop` cannot help here,
 * because the touch events have already bubbled by the time the click fires,
 * so a tap on "Show the sentence" would also trigger tap-to-speak.
 */
const INTERACTIVE = 'button, a, input, select, textarea, [role="button"]'

export function useSwipe(handlers: SwipeHandlers) {
  const startX = ref(0)
  const startY = ref(0)
  const startTime = ref(0)
  const tracking = ref(false)
  /** Live horizontal offset, so the card can follow the finger. */
  const dragX = ref(0)
  /** Timestamp of the previous tap, for double-tap detection. */
  const lastTapAt = ref(0)

  function onTouchStart(event: TouchEvent) {
    // Ignore multi-touch: a pinch or two-finger scroll is not a swipe.
    if (event.touches.length !== 1) {
      tracking.value = false
      return
    }
    // Let a control have its own tap.
    if ((event.target as Element | null)?.closest?.(INTERACTIVE)) {
      tracking.value = false
      return
    }
    const touch = event.touches[0]
    startX.value = touch.clientX
    startY.value = touch.clientY
    startTime.value = Date.now()
    tracking.value = true
    dragX.value = 0
  }

  function onTouchMove(event: TouchEvent) {
    if (!tracking.value || event.touches.length !== 1) return
    dragX.value = event.touches[0].clientX - startX.value
  }

  function onTouchEnd(event: TouchEvent) {
    if (!tracking.value) return
    tracking.value = false

    const touch = event.changedTouches[0]
    dragX.value = 0
    if (!touch) return

    const deltaX = touch.clientX - startX.value
    const deltaY = touch.clientY - startY.value
    const distance = Math.abs(deltaX)
    const elapsed = Date.now() - startTime.value

    const isTap =
      distance < TAP_MAX_MOVEMENT &&
      Math.abs(deltaY) < TAP_MAX_MOVEMENT &&
      elapsed < TAP_MAX_DURATION

    if (isTap) {
      const now = Date.now()
      const isDoubleTap =
        Boolean(handlers.onDoubleTap) && now - lastTapAt.value < DOUBLE_TAP_MAX_GAP

      if (isDoubleTap) {
        // Reset rather than record: a third tap should start a fresh pair, not
        // toggle again off the back of the second.
        lastTapAt.value = 0
        handlers.onDoubleTap?.()
      } else {
        lastTapAt.value = now
        handlers.onTap?.()
      }
      return
    }

    if (distance < SWIPE_MIN_DISTANCE) return
    if (Math.abs(deltaY) > distance * SWIPE_MAX_VERTICAL_RATIO) return

    // Dragging leftwards pulls the next card in from the right.
    if (deltaX < 0) handlers.onSwipeLeft?.()
    else handlers.onSwipeRight?.()
  }

  function onTouchCancel() {
    tracking.value = false
    dragX.value = 0
  }

  return {
    dragX,
    listeners: {
      touchstart: onTouchStart,
      touchmove: onTouchMove,
      touchend: onTouchEnd,
      touchcancel: onTouchCancel,
    },
  }
}
