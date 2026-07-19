import { beforeEach, describe, expect, it } from 'vitest'
import FlashcardsView from './FlashcardsView.vue'
import PracticeView from './PracticeView.vue'
import QuizView from './QuizView.vue'
import { useCardsStore } from '@/stores/cards'
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

  it('still shows every card in the level, just reordered', async () => {
    const wrapper = await mountView(FlashcardsView, { levelId: '1' })
    await wrapper.vm.$nextTick()

    const expected = useCardsStore()
      .getLevel(1)!
      .cards.map((c) => (c.kind === 'kanji' ? c.char : c.text))

    // The progress bar's max reflects the deck the view actually holds.
    expect(wrapper.text()).toContain(`of ${expected.length}`)
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
