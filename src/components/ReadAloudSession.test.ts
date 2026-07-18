import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ReadAloudSession from './ReadAloudSession.vue'
import FlashcardsView from '@/views/FlashcardsView.vue'
import { useSettingsStore } from '@/stores/settings'
import { getLevel } from '@/data/words'

/**
 * Auto-speech must stay opt-in. In Practice the child is asked to read the word
 * aloud, so speaking it first hands over the answer — a regression here would
 * quietly undo the point of the mode.
 */

const spoken: string[] = []

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  spoken.length = 0
  ;(window as any).speechSynthesis = {
    getVoices: () => [],
    addEventListener: vi.fn(),
    cancel: vi.fn(),
    speak: (u: { text: string }) => spoken.push(u.text),
  }
  ;(window as any).SpeechSynthesisUtterance = class {
    text: string
    constructor(text: string) {
      this.text = text
    }
  }
})

function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/level/:levelId', name: 'level', component: { template: '<div/>' } },
    ],
  })
}

async function mountSession() {
  const router = makeRouter()
  await router.push('/')
  await router.isReady()
  return mount(ReadAloudSession, {
    props: { words: getLevel(1)!.words.slice(0, 3), mode: 'practice', title: 'Test' },
    global: { plugins: [router] },
  })
}

async function mountFlashcards() {
  const router = makeRouter()
  await router.push('/')
  await router.isReady()
  return mount(FlashcardsView, {
    props: { levelId: '1' },
    global: { plugins: [router] },
  })
}

describe('automatic speech', () => {
  it('stays silent when a practice card appears', async () => {
    const wrapper = await mountSession()
    await wrapper.vm.$nextTick()
    expect(spoken).toEqual([])
  })

  it('stays silent when a flash card appears', async () => {
    const wrapper = await mountFlashcards()
    await wrapper.vm.$nextTick()
    expect(spoken).toEqual([])
  })

  it('stays silent when moving to the next flash card', async () => {
    const wrapper = await mountFlashcards()
    await wrapper.vm.$nextTick()

    const next = wrapper.findAll('button').find((b) => b.text().includes('Next'))
    await next!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(spoken).toEqual([])
  })

  it('speaks when the parent presses Hear it', async () => {
    const wrapper = await mountFlashcards()
    await wrapper.vm.$nextTick()

    const hearIt = wrapper.findAll('button').find((b) => b.text().includes('Hear it'))
    expect(hearIt).toBeDefined()
    await hearIt!.trigger('click')

    expect(spoken).toEqual([getLevel(1)!.words[0].text])
  })

  it('speaks on arrival once the parent turns auto-speak on', async () => {
    useSettingsStore().update('autoSpeak', true)

    const wrapper = await mountSession()
    await wrapper.vm.$nextTick()

    expect(spoken).toHaveLength(1)
  })

  it('speaks the very first flash card too when auto-speak is on', async () => {
    // The first card must not be a silent exception to the setting.
    useSettingsStore().update('autoSpeak', true)

    const wrapper = await mountFlashcards()
    await wrapper.vm.$nextTick()

    expect(spoken).toEqual([getLevel(1)!.words[0].text])
  })

  it('never speaks when speech is switched off entirely', async () => {
    const settings = useSettingsStore()
    settings.update('autoSpeak', true)
    settings.update('speechEnabled', false)

    const wrapper = await mountSession()
    await wrapper.vm.$nextTick()

    expect(spoken).toEqual([])
  })
})
