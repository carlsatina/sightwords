import { useSettingsStore } from '@/stores/settings'

/**
 * Canvas confetti with no dependency. Pieces are paper rectangles that tumble
 * and fall — matching the app's physical-card feel rather than glowing sparks.
 */

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  spin: number
  width: number
  height: number
  color: string
}

const COLORS = ['#FFB627', '#FF6B6B', '#2EC4B6', '#7B5EA7', '#4D9DE0']
const GRAVITY = 0.28
const DRAG = 0.995

export function useConfetti() {
  const settings = useSettingsStore()

  /**
   * `zIndex` exists for celebrations that happen *underneath* something —
   * the round-complete modal bursts confetti behind its own card, so the
   * praise stays readable instead of being buried in paper.
   */
  function burst(count = 90, options: { zIndex?: number } = {}) {
    if (typeof document === 'undefined') return
    if (!settings.settings.confettiEnabled) return
    // A celebration is exactly the kind of motion reduce-motion users opt out of.
    if (settings.settings.reduceMotion) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: String(options.zIndex ?? 9999),
    } satisfies Partial<CSSStyleDeclaration>)
    document.body.appendChild(canvas)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = window.innerWidth
    const height = window.innerHeight
    canvas.width = width * dpr
    canvas.height = height * dpr

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      canvas.remove()
      return
    }
    ctx.scale(dpr, dpr)

    // Two side cannons read as celebratory; a single top-down rain reads as loss.
    const pieces: Piece[] = Array.from({ length: count }, (_, i) => {
      const fromLeft = i % 2 === 0
      return {
        x: fromLeft ? 0 : width,
        y: height * 0.72,
        vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 8),
        vy: -(9 + Math.random() * 8),
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        width: 7 + Math.random() * 6,
        height: 10 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }
    })

    let frame = 0
    const MAX_FRAMES = 260

    function tick() {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)
      let visible = 0

      for (const piece of pieces) {
        piece.vy += GRAVITY
        piece.vx *= DRAG
        piece.x += piece.vx
        piece.y += piece.vy
        piece.rotation += piece.spin

        if (piece.y < height + 40) visible++

        ctx.save()
        ctx.translate(piece.x, piece.y)
        ctx.rotate(piece.rotation)
        ctx.fillStyle = piece.color
        // Squash on the vertical axis as it spins, so flat paper reads as 3D.
        ctx.fillRect(
          -piece.width / 2,
          -piece.height / 2,
          piece.width,
          piece.height * Math.abs(Math.cos(piece.rotation)),
        )
        ctx.restore()
      }

      frame++
      if (visible > 0 && frame < MAX_FRAMES) {
        requestAnimationFrame(tick)
      } else {
        canvas.remove()
      }
    }

    requestAnimationFrame(tick)
  }

  return { burst }
}
