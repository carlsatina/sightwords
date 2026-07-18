import { describe, expect, it, vi } from 'vitest'
import { useSwipe } from './useSwipe'

/**
 * A tap and a swipe begin identically, so the discrimination on release is the
 * whole job. Getting it wrong means either the word never speaks or every tap
 * skips a card.
 */

function touchEvent(points: Array<{ x: number; y: number }>, changed = points) {
  return {
    touches: points.map((p) => ({ clientX: p.x, clientY: p.y })),
    changedTouches: changed.map((p) => ({ clientX: p.x, clientY: p.y })),
  } as unknown as TouchEvent
}

function gesture(
  from: { x: number; y: number },
  to: { x: number; y: number },
  options: { holdMs?: number } = {},
) {
  const handlers = {
    onTap: vi.fn(),
    onSwipeLeft: vi.fn(),
    onSwipeRight: vi.fn(),
  }
  const { listeners, dragX } = useSwipe(handlers)

  const start = Date.now()
  vi.setSystemTime(start)
  listeners.touchstart(touchEvent([from]))
  listeners.touchmove(touchEvent([to]))
  vi.setSystemTime(start + (options.holdMs ?? 120))
  listeners.touchend(touchEvent([to], [to]))

  return { ...handlers, dragX }
}

describe('tap detection', () => {
  it('treats a short still touch as a tap', () => {
    vi.useFakeTimers()
    const g = gesture({ x: 200, y: 300 }, { x: 202, y: 301 })
    expect(g.onTap).toHaveBeenCalledOnce()
    expect(g.onSwipeLeft).not.toHaveBeenCalled()
    expect(g.onSwipeRight).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('does not treat a long press as a tap', () => {
    vi.useFakeTimers()
    const g = gesture({ x: 200, y: 300 }, { x: 200, y: 300 }, { holdMs: 900 })
    expect(g.onTap).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})

describe('swipe direction', () => {
  it('moves to the next word when dragged right to left', () => {
    vi.useFakeTimers()
    const g = gesture({ x: 300, y: 300 }, { x: 120, y: 305 })
    expect(g.onSwipeLeft).toHaveBeenCalledOnce()
    expect(g.onTap).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('moves to the previous word when dragged left to right', () => {
    vi.useFakeTimers()
    const g = gesture({ x: 120, y: 300 }, { x: 300, y: 295 })
    expect(g.onSwipeRight).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('ignores a drag too short to be deliberate', () => {
    vi.useFakeTimers()
    const g = gesture({ x: 200, y: 300 }, { x: 170, y: 300 }, { holdMs: 600 })
    expect(g.onSwipeLeft).not.toHaveBeenCalled()
    expect(g.onTap).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('ignores a mostly vertical drag so it never hijacks a scroll', () => {
    vi.useFakeTimers()
    const g = gesture({ x: 200, y: 200 }, { x: 130, y: 480 })
    expect(g.onSwipeLeft).not.toHaveBeenCalled()
    expect(g.onSwipeRight).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})

describe('multi-touch', () => {
  it('ignores a two-finger gesture', () => {
    vi.useFakeTimers()
    const handlers = { onTap: vi.fn(), onSwipeLeft: vi.fn(), onSwipeRight: vi.fn() }
    const { listeners } = useSwipe(handlers)

    listeners.touchstart(
      touchEvent([
        { x: 200, y: 300 },
        { x: 260, y: 300 },
      ]),
    )
    listeners.touchend(touchEvent([{ x: 80, y: 300 }], [{ x: 80, y: 300 }]))

    expect(handlers.onSwipeLeft).not.toHaveBeenCalled()
    expect(handlers.onTap).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})

describe('drag tracking', () => {
  it('follows the finger and settles back on release', () => {
    vi.useFakeTimers()
    const { listeners, dragX } = useSwipe({})

    listeners.touchstart(touchEvent([{ x: 300, y: 300 }]))
    listeners.touchmove(touchEvent([{ x: 240, y: 300 }]))
    expect(dragX.value).toBe(-60)

    listeners.touchend(touchEvent([{ x: 240, y: 300 }], [{ x: 240, y: 300 }]))
    expect(dragX.value).toBe(0)
    vi.useRealTimers()
  })

  it('resets when the system cancels the touch', () => {
    const { listeners, dragX } = useSwipe({})
    listeners.touchstart(touchEvent([{ x: 300, y: 300 }]))
    listeners.touchmove(touchEvent([{ x: 240, y: 300 }]))
    listeners.touchcancel()
    expect(dragX.value).toBe(0)
  })
})
