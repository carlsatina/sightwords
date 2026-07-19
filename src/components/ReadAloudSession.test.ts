import { beforeEach, describe, expect, it } from 'vitest'
import ReadAloudSession from './ReadAloudSession.vue'
import FlashcardsView from '@/views/FlashcardsView.vue'
import { useSettingsStore } from '@/stores/settings'
import { useCardsStore } from '@/stores/cards'
import { mountView, resetAppState } from '@/test/harness'
import { installSpeechMock } from '@/test/speech'

/**
 * Auto-speech must stay opt-in. In Practice the child is asked to read the word
 * aloud, so speaking it first hands over the answer — a regression here would
 * quietly undo the point of the mode.
 */

let speech: ReturnType<typeof installSpeechMock>

beforeEach(() => {
  resetAppState()
  speech = installSpeechMock(['en-US'])
})

/**
 * The card currently on screen. Both modes shuffle their deck on arrival, so a
 * test must read what is shown rather than assume the level's first entry.
 */
function shownCardText(wrapper: { find: (s: string) => { attributes: (a: string) => string | undefined } }) {
  const label = wrapper.find('[aria-label^="Hear the word"]').attributes('aria-label')
  return label?.replace(/^Hear the word /, '') ?? ''
}

async function mountSession() {
  const cards = useCardsStore().getLevel(1)!.cards.slice(0, 3)
  return mountView(ReadAloudSession, { cards, mode: 'practice', title: 'Test' })
}

async function mountFlashcards() {
  return mountView(FlashcardsView, { levelId: '1' })
}

describe('automatic speech', () => {
  it('stays silent when a practice card appears', async () => {
    const wrapper = await mountSession()
    await wrapper.vm.$nextTick()
    expect(speech.texts()).toEqual([])
  })

  it('stays silent when a flash card appears', async () => {
    const wrapper = await mountFlashcards()
    await wrapper.vm.$nextTick()
    expect(speech.texts()).toEqual([])
  })

  it('stays silent when moving to the next flash card', async () => {
    const wrapper = await mountFlashcards()
    await wrapper.vm.$nextTick()

    const next = wrapper.findAll('button').find((b) => b.text().includes('Next'))
    await next!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(speech.texts()).toEqual([])
  })

  it('speaks when the parent presses Hear it', async () => {
    const wrapper = await mountFlashcards()
    await wrapper.vm.$nextTick()

    const hearIt = wrapper.findAll('button').find((b) => b.text().includes('Hear it'))
    expect(hearIt).toBeDefined()
    await hearIt!.trigger('click')

    expect(speech.texts()).toEqual([shownCardText(wrapper)])
  })

  it('speaks on arrival once the parent turns auto-speak on', async () => {
    useSettingsStore().update('autoSpeak', true)

    const wrapper = await mountSession()
    await wrapper.vm.$nextTick()

    expect(speech.texts()).toHaveLength(1)
  })

  it('speaks the very first flash card too when auto-speak is on', async () => {
    // The first card must not be a silent exception to the setting.
    useSettingsStore().update('autoSpeak', true)

    const wrapper = await mountFlashcards()
    await wrapper.vm.$nextTick()

    expect(speech.texts()).toEqual([shownCardText(wrapper)])
  })

  it('never speaks when speech is switched off entirely', async () => {
    const settings = useSettingsStore()
    settings.update('autoSpeak', true)
    settings.update('speechEnabled', false)

    const wrapper = await mountSession()
    await wrapper.vm.$nextTick()

    expect(speech.texts()).toEqual([])
  })
})
