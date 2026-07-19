import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { ROUND_SIZE, useRounds } from './useRounds'
import type { Card } from '@/types'

/**
 * A hundred-card level shown as one deck is a wall with no visible end. Rounds
 * cut it into sittings a child can actually finish, each drawn fresh from the
 * whole level so a second round is new material rather than a reshuffle of the
 * first.
 */

function pool(size: number): Card[] {
  return Array.from({ length: size }, (_, i) => ({
    kind: 'word',
    id: `en:w${i}`,
    language: 'en',
    levelId: 1,
    text: `w${i}`,
    sentence: `A w${i} here.`,
  })) as Card[]
}

describe('dealing a round', () => {
  it('takes twenty from a large level', () => {
    const { cards } = useRounds(ref(pool(100)))
    expect(cards.value).toHaveLength(ROUND_SIZE)
  })

  it('never repeats a card inside one round', () => {
    const { cards } = useRounds(ref(pool(100)))
    expect(new Set(cards.value.map((c) => c.id)).size).toBe(cards.value.length)
  })

  it('deals only what a short level has', () => {
    // Filipino and Japanese levels are smaller than twenty in places; padding
    // the round with repeats would just show the same card twice.
    const { cards } = useRounds(ref(pool(7)))
    expect(cards.value).toHaveLength(7)
  })

  it('draws every card from the level it was given', () => {
    const source = pool(100)
    const { cards } = useRounds(ref(source))
    const ids = new Set(source.map((c) => c.id))
    expect(cards.value.every((c) => ids.has(c.id))).toBe(true)
  })
})

describe('continuing', () => {
  it('counts rounds up', () => {
    const { roundNumber, nextRound } = useRounds(ref(pool(100)))
    expect(roundNumber.value).toBe(1)
    nextRound()
    expect(roundNumber.value).toBe(2)
  })

  it('deals fresh material rather than the same twenty reshuffled', () => {
    // With a hundred-card pool, two draws of twenty overlapping entirely would
    // be a 1-in-10^20 coincidence — so any overlap here is partial by design,
    // not a reshuffle.
    const { cards, nextRound } = useRounds(ref(pool(100)))
    const first = new Set(cards.value.map((c) => c.id))
    nextRound()
    const second = cards.value.map((c) => c.id)

    expect(second.every((id) => first.has(id))).toBe(false)
  })

  it('starts a short level over rather than running dry', () => {
    // A seven-card level cannot offer twenty new ones; a second round simply
    // deals those seven again.
    const { cards, nextRound } = useRounds(ref(pool(7)))
    nextRound()
    expect(cards.value).toHaveLength(7)
  })
})

describe('when the level changes underneath', () => {
  it('resets to round one with the new level’s cards', async () => {
    const source = ref(pool(100))
    const { cards, roundNumber, nextRound } = useRounds(source)
    nextRound()
    nextRound()
    expect(roundNumber.value).toBe(3)

    source.value = pool(30).map((c) => ({ ...c, id: `${c.id}-new` }) as Card)
    // The watcher flushes on the next tick, as Vue's watchers do by default.
    await nextTick()

    expect(roundNumber.value).toBe(1)
    expect(cards.value.every((c) => c.id.endsWith('-new'))).toBe(true)
  })
})

describe('rounds available', () => {
  it('reports how many rounds a level holds before repeating', () => {
    expect(useRounds(ref(pool(100))).roundsAvailable.value).toBe(5)
    expect(useRounds(ref(pool(7))).roundsAvailable.value).toBe(1)
    expect(useRounds(ref(pool(21))).roundsAvailable.value).toBe(2)
  })
})
