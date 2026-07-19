import { beforeEach, describe, expect, it } from 'vitest'
import type { mount } from '@vue/test-utils'
import FlashcardsView from '@/views/FlashcardsView.vue'
import { useCardsStore } from '@/stores/cards'
import { cardText } from '@/types'
import { mountView, resetAppState } from '@/test/harness'
import { installSpeechMock } from '@/test/speech'

let speech: ReturnType<typeof installSpeechMock>

beforeEach(() => {
  resetAppState()
  document.body.style.overflow = ''
  // A realistic desktop set. Filipino has no fil-PH voice here and falls back
  // to Spanish, which is the situation its audio controls are designed around.
  speech = installSpeechMock(['en-US', 'es-MX', 'ja-JP'])
})

/**
 * English deliberately has no reveal toggle or navigation buttons in focus
 * mode, so any test about those controls has to use a language that keeps
 * them. Filipino is the natural stand-in — same word-card shape, plus a
 * translation worth revealing.
 */
async function mountFlashcards(language: 'en' | 'fil' = 'en', levelId = '2') {
  if (language !== 'en') {
    const { useSettingsStore } = await import('@/stores/settings')
    useSettingsStore().setLanguage(language)
  }
  const wrapper = await mountView(FlashcardsView, { levelId })
  await wrapper.vm.$nextTick()
  return wrapper
}

/** Cards of whichever language the test mounted. */
function cardsOf(language: 'en' | 'fil' = 'en') {
  const levels = useCardsStore().levelsForLanguage(language)
  return (language === 'en' ? levels[1] : levels[0]).cards
}

/**
 * The card currently on screen. The deck is shuffled on arrival, so tests must
 * read what is actually shown rather than assume the level's first entry.
 */
function shownCard(wrapper: ReturnType<typeof mountView> extends Promise<infer W> ? W : never) {
  const label = wrapper
    .find('[aria-label^="Hear the word"]')
    .attributes('aria-label')!
  return label.replace(/^Hear the word /, '')
}

/** The card matching what is on screen, for reading its sentence. */
function shownCardData(
  wrapper: Parameters<typeof shownCard>[0],
  language: 'en' | 'fil' = 'en',
) {
  const face = shownCard(wrapper)
  return cardsOf(language).find((c) => cardText(c) === face)!
}

function findByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((b) => b.text().includes(text))
}

/** The overlay's own finish button, not the one in the view behind it. */
function finishInDialog(dialog: ReturnType<ReturnType<typeof mount>['find']>) {
  return dialog.findAll('button').find((b) => b.text().includes('Finish'))
}

async function openFocus(wrapper: ReturnType<typeof mount>) {
  await findByText(wrapper, 'Big word mode')!.trigger('click')
  await wrapper.vm.$nextTick()
  return wrapper.find('[role="dialog"]')
}

function touch(x: number, y: number) {
  return { touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] }
}

describe('focus mode', () => {
  it('opens on request and shows the current word', async () => {
    const wrapper = await mountFlashcards()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    const dialog = await openFocus(wrapper)

    expect(dialog.exists()).toBe(true)
    expect(dialog.text()).toContain(shownCard(wrapper))
  })

  it('locks page scrolling while open and restores it on close', async () => {
    const wrapper = await mountFlashcards()
    await openFocus(wrapper)
    expect(document.body.style.overflow).toBe('hidden')

    await wrapper.find('[aria-label="Leave focus mode"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })

  it('speaks the word when the screen is tapped', async () => {
    const wrapper = await mountFlashcards()
    const dialog = await openFocus(wrapper)

    await dialog.trigger('touchstart', touch(200, 300))
    await dialog.trigger('touchmove', touch(201, 300))
    await dialog.trigger('touchend', touch(201, 300))

    expect(speech.texts()).toEqual([shownCard(wrapper)])
  })

  it('advances on a right-to-left swipe', async () => {
    const wrapper = await mountFlashcards()
    const dialog = await openFocus(wrapper)
    const before = shownCard(wrapper)
    await dialog.trigger('touchstart', touch(320, 300))
    await dialog.trigger('touchmove', touch(120, 302))
    await dialog.trigger('touchend', touch(120, 302))
    await wrapper.vm.$nextTick()

    expect(shownCard(wrapper)).not.toBe(before)
  })

  it('goes back on a left-to-right swipe', async () => {
    const wrapper = await mountFlashcards()
    const dialog = await openFocus(wrapper)
    const first = shownCard(wrapper)

    await dialog.trigger('touchstart', touch(320, 300))
    await dialog.trigger('touchmove', touch(120, 302))
    await dialog.trigger('touchend', touch(120, 302))
    await wrapper.vm.$nextTick()

    await dialog.trigger('touchstart', touch(120, 300))
    await dialog.trigger('touchmove', touch(320, 302))
    await dialog.trigger('touchend', touch(320, 302))
    await wrapper.vm.$nextTick()

    expect(shownCard(wrapper)).toBe(first)
  })

  it('cannot swipe back past the first word', async () => {
    // The deck is shuffled, so "the first card" is whatever opened — not the
    // level's first entry.
    const wrapper = await mountFlashcards()
    const dialog = await openFocus(wrapper)
    const first = shownCard(wrapper)

    await dialog.trigger('touchstart', touch(120, 300))
    await dialog.trigger('touchmove', touch(320, 302))
    await dialog.trigger('touchend', touch(320, 302))
    await wrapper.vm.$nextTick()

    expect(shownCard(wrapper)).toBe(first)
  })

  it('keeps navigation buttons in the page for keyboard users', async () => {
    // Swiping is unavailable on a keyboard, so the same jobs need real controls
    // even when they are visually hidden.
    const wrapper = await mountFlashcards('fil', '1')
    const dialog = await openFocus(wrapper)
    expect(dialog.find('[aria-label="Next card"]').exists()).toBe(true)
    expect(dialog.find('[aria-label="Previous card"]').exists()).toBe(true)

    const before = shownCard(wrapper)
    await dialog.find('[aria-label="Next card"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(shownCard(wrapper)).not.toBe(before)
  })
})

describe('English keeps the bare screen', () => {
  it('drops the reveal toggle and the navigation buttons', async () => {
    // An English sentence under an English word is not a comprehension aid —
    // it is more text competing with the one thing this mode exists to show.
    const wrapper = await mountFlashcards()
    const dialog = await openFocus(wrapper)

    const labels = dialog
      .findAll('button')
      .map((b) => b.attributes('aria-label') ?? b.text().trim())

    expect(labels.some((l) => /Show the sentence/.test(l))).toBe(false)
    expect(dialog.find('[aria-label="Next card"]').exists()).toBe(false)
    expect(dialog.find('[aria-label="Previous card"]').exists()).toBe(false)
    // Hearing the word is the one thing that stays.
    expect(dialog.find('[aria-label^="Hear the word"]').exists()).toBe(true)
  })

  it('still moves and speaks by gesture', async () => {
    // Removing the buttons must not remove the behaviour behind them.
    const wrapper = await mountFlashcards()
    const dialog = await openFocus(wrapper)

    await dialog.trigger('touchstart', touch(200, 300))
    await dialog.trigger('touchmove', touch(201, 300))
    await dialog.trigger('touchend', touch(201, 300))
    expect(speech.texts()).toEqual([shownCard(wrapper)])

    const before = shownCard(wrapper)
    await dialog.trigger('touchstart', touch(320, 300))
    await dialog.trigger('touchmove', touch(120, 302))
    await dialog.trigger('touchend', touch(120, 302))
    await wrapper.vm.$nextTick()
    expect(shownCard(wrapper)).not.toBe(before)
  })

  it('keeps the reveal for a language that needs it', async () => {
    const wrapper = await mountFlashcards('fil', '1')
    const dialog = await openFocus(wrapper)

    expect(dialog.find('[aria-label="Next card"]').exists()).toBe(true)
    expect(
      dialog.findAll('button').some((b) => b.text().includes('Show the sentence')),
    ).toBe(true)
  })
})

describe('focus mode controls', () => {
  function controlBar(wrapper: ReturnType<typeof mount>) {
    return wrapper.find('[aria-label="Next card"]').element.parentElement!
  }

  it('shows the controls by default', async () => {
    // Reversed deliberately. They were hidden originally, on the theory that
    // tapping and swiping covered the same jobs — but an invisible gesture is
    // not a control, and nobody found them.
    const wrapper = await mountFlashcards('fil', '1')
    await openFocus(wrapper)

    const classes = controlBar(wrapper).className
    expect(classes).not.toContain('opacity-0')
    expect(classes).not.toContain('pointer-events-none')
  })

  it('offers a sentence toggle and a speaker for the sentence', async () => {
    const wrapper = await mountFlashcards('fil', '1')
    const dialog = await openFocus(wrapper)

    const toggle = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Show the sentence'))
    expect(toggle).toBeDefined()

    // The sentence and its own speaker appear only once revealed — nothing
    // shares the screen with the word until the child asks for it.
    expect(dialog.find('[aria-label="Hear the sentence"]').exists()).toBe(false)

    await toggle!.trigger('click')
    await wrapper.vm.$nextTick()

    const card = shownCardData(wrapper, 'fil')
    const sentence = card.kind === 'word' ? card.sentence : ''
    expect(wrapper.find('[role="dialog"]').text()).toContain(sentence)
    expect(
      wrapper.find('[role="dialog"]').find('[aria-label="Hear the sentence"]').exists(),
    ).toBe(true)
  })

  it('reads the sentence, not the word, from the sentence speaker', async () => {
    const wrapper = await mountFlashcards('fil', '1')
    await openFocus(wrapper)

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Show the sentence'))!
      .trigger('click')
    await wrapper.vm.$nextTick()
    speech.spoken.length = 0

    await wrapper.find('[aria-label="Hear the sentence"]').trigger('click')

    const card = shownCardData(wrapper, 'fil')
    expect(speech.texts()).toEqual([card.kind === 'word' ? card.sentence : ''])
  })

  it('hides the controls when a parent turns them off', async () => {
    const { useSettingsStore } = await import('@/stores/settings')
    useSettingsStore().update('showFocusControls', false)

    const wrapper = await mountFlashcards('fil', '1')
    await openFocus(wrapper)

    const classes = controlBar(wrapper).className
    expect(classes).toContain('opacity-0')
    // Invisible buttons must not swallow a stray tap meant for the word.
    expect(classes).toContain('pointer-events-none')
  })

  it('still shows the close button, so touch users are never trapped', async () => {
    const wrapper = await mountFlashcards()
    const dialog = await openFocus(wrapper)

    const close = dialog.find('[aria-label="Leave focus mode"]')
    expect(close.exists()).toBe(true)
    // The close button sits outside the hideable control bar.
    expect(close.element.parentElement!.className).not.toContain('opacity-0')

    await close.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('brings hidden controls back on keyboard focus', async () => {
    // Tabbing to a control you cannot see is the same trap in reverse, so the
    // hidden state has to yield to keyboard focus.
    const { useSettingsStore } = await import('@/stores/settings')
    useSettingsStore().update('showFocusControls', false)

    const wrapper = await mountFlashcards('fil', '1')
    await openFocus(wrapper)

    const classes = controlBar(wrapper).className
    expect(classes).toContain('focus-within:opacity-100')
    expect(classes).toContain('focus-within:pointer-events-auto')
  })

  /**
   * The end of a round in focus mode. Both of these were real dead ends: the
   * view underneath kept its own window key listener bound while the overlay
   * was open, and the overlay offered nothing to press once the last card was
   * reached — so a child on a tablet could only abandon the round.
   */
  describe('the end of a round', () => {
    /** The overlay's own "3 / 20" counter, as numbers. */
    function position(dialog: ReturnType<ReturnType<typeof mount>['find']>) {
      const [at, total] = dialog.find('span').text().split('/').map((n) => Number(n.trim()))
      return { at, total }
    }

    /** Steps to the last card of the round with the right arrow key. */
    async function goToLastCard(
      wrapper: ReturnType<typeof mount>,
      dialog: ReturnType<ReturnType<typeof mount>['find']>,
    ) {
      const { total } = position(dialog)
      for (let i = 0; i < total - 1; i++) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
        await wrapper.vm.$nextTick()
      }
      expect(position(dialog).at).toBe(total)
      return total
    }

    it('advances one card per arrow press, not two', async () => {
      const wrapper = await mountFlashcards()
      const dialog = await openFocus(wrapper)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      await wrapper.vm.$nextTick()

      // The view under the overlay binds the same key on `window`; if both
      // handlers run, this lands on card 3 and half the deck is skipped.
      expect(position(dialog).at).toBe(2)
    })

    it('offers a finish button on the last card, even in English', async () => {
      // English hides the rest of the navigation in focus mode — this is the
      // one control it must not hide.
      const wrapper = await mountFlashcards()
      const dialog = await openFocus(wrapper)
      await goToLastCard(wrapper, dialog)

      // Scoped to the overlay: the view underneath renders its own "Finish ✓"
      // at the end of a round, and searching the whole wrapper finds that one
      // whether or not focus mode has a button of its own.
      expect(finishInDialog(dialog)).toBeDefined()
      expect(dialog.find('[aria-label="Next card"]').exists()).toBe(false)
    })

    it('completes the round when that finish button is pressed', async () => {
      const wrapper = await mountFlashcards()
      const dialog = await openFocus(wrapper)
      const total = await goToLastCard(wrapper, dialog)

      await finishInDialog(dialog)!.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain(`${total} cards done!`)
    })

    it('completes the round on a swipe past the last card', async () => {
      const wrapper = await mountFlashcards()
      const dialog = await openFocus(wrapper)
      const total = await goToLastCard(wrapper, dialog)

      await dialog.trigger('touchstart', touch(320, 300))
      await dialog.trigger('touchmove', touch(120, 302))
      await dialog.trigger('touchend', touch(120, 302))
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain(`${total} cards done!`)
    })
  })

  it('closes when Escape is pressed', async () => {
    const wrapper = await mountFlashcards()
    await openFocus(wrapper)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})
