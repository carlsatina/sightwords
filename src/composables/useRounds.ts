import { computed, ref, watch, type Ref } from 'vue'
import { sample } from '@/lib/random'
import type { Card } from '@/types'

/**
 * Deals a practice session out in short rounds instead of one long run.
 *
 * A level of a hundred cards presented as a single deck is a wall: the child
 * cannot see an end, and there is no natural moment to stop. Twenty is short
 * enough to finish in one sitting and long enough to be worth finishing, so
 * every round ends on a completed thing rather than on a parent calling time.
 *
 * Each round is drawn fresh from the whole level, so a second round is new
 * material rather than the same twenty in a different order.
 */
export const ROUND_SIZE = 20

export function useRounds(pool: Ref<Card[]>, size = ROUND_SIZE) {
  /** The cards being worked through right now. */
  const cards = ref<Card[]>([])
  const roundNumber = ref(1)

  /** How many rounds this level could offer before repeating anything. */
  const roundsAvailable = computed(() => Math.ceil(pool.value.length / size))

  function deal() {
    // `sample` shuffles then slices, so a short pool simply yields all of it.
    cards.value = sample(pool.value, size)
  }

  /** Starts a fresh round, keeping the count going. */
  function nextRound() {
    roundNumber.value += 1
    deal()
  }

  /** Back to round one — used when the level or language changes underneath. */
  function reset() {
    roundNumber.value = 1
    deal()
  }

  // A level or language switch invalidates the current round entirely.
  watch(pool, reset, { immediate: true, deep: false })

  return { cards, roundNumber, roundsAvailable, nextRound, reset, size }
}
