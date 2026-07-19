import { beforeEach, describe, expect, it } from 'vitest'
import FlashcardsView from './FlashcardsView.vue'
import PracticeView from './PracticeView.vue'
import QuizView from './QuizView.vue'
import { useCardsStore } from '@/stores/cards'
import { cardText } from '@/types'
import { ROUND_SIZE } from '@/composables/useRounds'
import { mountView, resetAppState } from '@/test/harness'
import { installSpeechMock } from '@/test/speech'

/**
 * A deck that always opens in the same order lets a child lean on position
 * instead of reading — the third card being "blue" every time is a cue, not a
 * lesson. Every mode that shows a run of cards therefore shuffles on arrival.
 */

beforeEach(() => {
  resetAppState()
  installSpeechMock(['en-US', 'es-MX', 'ja-JP'])
})

/** The order a mode presents, read off the cards it renders. */
async function orderFrom(view: typeof FlashcardsView, runs = 6) {
  const seen: string[] = []
  for (let i = 0; i < runs; i++) {
    resetAppState()
    installSpeechMock(['en-US'])
    const wrapper = await mountView(view, { levelId: '1' })
    await wrapper.vm.$nextTick()
    const label = wrapper.find('[aria-label^="Hear the word"]').attributes('aria-label')
    seen.push(label?.replace(/^Hear the word /, '') ?? '')
  }
  return seen
}

describe('flash cards', () => {
  it('does not always open on the same card', async () => {
    // Level 1 has 34 words, so six identical openings would be a 1-in-34^5
    // coincidence — this is a real signal, not a flaky one.
    const firsts = await orderFrom(FlashcardsView)
    expect(new Set(firsts).size).toBeGreaterThan(1)
  })

  it('deals a round rather than the whole level', async () => {
    // A hundred-card level shown as one deck is a wall with no visible end;
    // twenty is short enough to finish and long enough to be worth finishing.
    const wrapper = await mountView(FlashcardsView, { levelId: '2' })
    await wrapper.vm.$nextTick()

    const levelSize = useCardsStore().getLevel(2)!.cards.length
    const roundSize = Math.min(ROUND_SIZE, levelSize)

    expect(wrapper.text()).toContain(`of ${roundSize}`)
  })

  it('draws the round from the level, not from thin air', async () => {
    const wrapper = await mountView(FlashcardsView, { levelId: '2' })
    await wrapper.vm.$nextTick()

    const inLevel = new Set(useCardsStore().getLevel(2)!.cards.map((c) => cardText(c)))
    const shown = wrapper
      .find('[aria-label^="Hear the word"]')
      .attributes('aria-label')!
      .replace(/^Hear the word /, '')

    expect(inLevel.has(shown)).toBe(true)
  })
})

describe('practice', () => {
  it('does not always open on the same card', async () => {
    const firsts = await orderFrom(PracticeView)
    expect(new Set(firsts).size).toBeGreaterThan(1)
  })
})

describe('quiz', () => {
  it('does not always ask the same first question', async () => {
    const seen: string[] = []
    for (let i = 0; i < 6; i++) {
      resetAppState()
      installSpeechMock(['en-US'])
      const wrapper = await mountView(QuizView, { levelId: '1' })
      await wrapper.vm.$nextTick()
      seen.push(wrapper.findAll('.grid button').map((b) => b.text()).join('|'))
    }
    expect(new Set(seen).size).toBeGreaterThan(1)
  })
})
