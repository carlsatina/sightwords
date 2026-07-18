import { onUnmounted, ref } from 'vue'

/**
 * Focus mode.
 *
 * The visual state is driven entirely by our own `active` flag and a CSS
 * overlay, because iPhone Safari has no element Fullscreen API at all. Real
 * fullscreen is requested opportunistically on top of that, purely to hide the
 * browser chrome where the platform allows it — it is never load-bearing.
 */
export function useFullscreen() {
  const active = ref(false)

  const canGoNative =
    typeof document !== 'undefined' &&
    typeof document.documentElement.requestFullscreen === 'function' &&
    document.fullscreenEnabled

  function lockScroll(locked: boolean) {
    if (typeof document === 'undefined') return
    document.body.style.overflow = locked ? 'hidden' : ''
  }

  async function enter() {
    active.value = true
    lockScroll(true)

    if (!canGoNative) return
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // Denied, or the gesture wasn't trusted. The overlay already covers the
      // screen, so there is nothing to recover from.
    }
  }

  async function exit() {
    active.value = false
    lockScroll(false)

    if (typeof document === 'undefined' || !document.fullscreenElement) return
    try {
      await document.exitFullscreen()
    } catch {
      /* Already left fullscreen by other means. */
    }
  }

  function toggle() {
    return active.value ? exit() : enter()
  }

  /**
   * The browser can leave fullscreen without us — Esc, a system gesture, the
   * back button. Keep our own state in step so the overlay never lingers.
   */
  function onFullscreenChange() {
    if (!document.fullscreenElement && active.value && canGoNative) {
      active.value = false
      lockScroll(false)
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', onFullscreenChange)
  }

  onUnmounted(() => {
    if (typeof document === 'undefined') return
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    // Never leave the page unscrollable behind us.
    lockScroll(false)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  })

  return { active, enter, exit, toggle, canGoNative }
}
