import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import FlashcardsView from '@/views/FlashcardsView.vue'
import { useWordsStore } from '@/stores/words'

const spoken: string[] = []

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  spoken.length = 0
  document.body.style.overflow = ''
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

async function mountFlashcards() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/level/:levelId', name: 'level', component: { template: '<div/>' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  const wrapper = mount(FlashcardsView, {
    props: { levelId: '1' },
    global: { plugins: [router] },
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

function findByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((b) => b.text().includes(text))
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
    const firstWord = useWordsStore().getLevel(1)!.words[0].text
    expect(dialog.text()).toContain(firstWord)
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

    const firstWord = useWordsStore().getLevel(1)!.words[0].text
    expect(spoken).toEqual([firstWord])
  })

  it('advances on a right-to-left swipe', async () => {
    const wrapper = await mountFlashcards()
    const dialog = await openFocus(wrapper)
    const words = useWordsStore().getLevel(1)!.words

    await dialog.trigger('touchstart', touch(320, 300))
    await dialog.trigger('touchmove', touch(120, 302))
    await dialog.trigger('touchend', touch(120, 302))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="dialog"]').text()).toContain(words[1].text)
  })

  it('goes back on a left-to-right swipe', async () => {
    const wrapper = await mountFlashcards()
    const dialog = await openFocus(wrapper)
    const words = useWordsStore().getLevel(1)!.words

    await dialog.trigger('touchstart', touch(320, 300))
    await dialog.trigger('touchmove', touch(120, 302))
    await dialog.trigger('touchend', touch(120, 302))
    await wrapper.vm.$nextTick()

    await dialog.trigger('touchstart', touch(120, 300))
    await dialog.trigger('touchmove', touch(320, 302))
    await dialog.trigger('touchend', touch(320, 302))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="dialog"]').text()).toContain(words[0].text)
  })

  it('cannot swipe back past the first word', async () => {
    const wrapper = await mountFlashcards()
    const dialog = await openFocus(wrapper)
    const words = useWordsStore().getLevel(1)!.words

    await dialog.trigger('touchstart', touch(120, 300))
    await dialog.trigger('touchmove', touch(320, 302))
    await dialog.trigger('touchend', touch(320, 302))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="dialog"]').text()).toContain(words[0].text)
  })

  it('offers buttons as well as gestures', async () => {
    // Swiping is unavailable on a keyboard, so the same jobs need real controls.
    const wrapper = await mountFlashcards()
    const dialog = await openFocus(wrapper)
    const words = useWordsStore().getLevel(1)!.words

    expect(dialog.find('[aria-label="Next word"]').exists()).toBe(true)
    expect(dialog.find('[aria-label="Previous word"]').exists()).toBe(true)

    await dialog.find('[aria-label="Next word"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').text()).toContain(words[1].text)
  })

  it('closes when Escape is pressed', async () => {
    const wrapper = await mountFlashcards()
    await openFocus(wrapper)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})
