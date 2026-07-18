import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'

/**
 * Chrome returns no voices from the first getVoices() call and fills the list
 * in later. The picker must survive that, and must never simply vanish — a
 * hidden control reads as a missing feature.
 */

const spoken: string[] = []
let currentVoices: unknown[] = []
let changeHandler: (() => void) | null = null

function voice(name: string, lang: string) {
  return { voiceURI: `${name}-${lang}`, name, lang, localService: true }
}

beforeEach(() => {
  localStorage.clear()
  // The voice list is module-level shared state, so reset the module registry
  // to keep one test's voices from leaking into the next.
  vi.resetModules()
  setActivePinia(createPinia())
  spoken.length = 0
  currentVoices = []
  changeHandler = null
  ;(window as any).speechSynthesis = {
    getVoices: () => currentVoices,
    addEventListener: (_event: string, handler: () => void) => {
      changeHandler = handler
    },
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

async function mountParent() {
  const ParentView = (await import('./ParentView.vue')).default
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/parent', name: 'parent', component: { template: '<div/>' } },
      { path: '/parent/words', name: 'words', component: { template: '<div/>' } },
    ],
  })
  await router.push('/parent')
  await router.isReady()
  return mount(ParentView, { global: { plugins: [router] } })
}

describe('voice picker', () => {
  it('is shown even before any voices have loaded', async () => {
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()

    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    // Disabled and explained, rather than absent.
    expect(select.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Still looking for voices')
  })

  it('fills in when the browser announces voices late', async () => {
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()

    currentVoices = [voice('Samantha', 'en-US'), voice('Daniel', 'en-GB')]
    changeHandler?.()
    await wrapper.vm.$nextTick()

    const options = wrapper.findAll('option')
    expect(options.map((o) => o.text())).toContain('Samantha (en-US)')
    expect(wrapper.find('select').attributes('disabled')).toBeUndefined()
  })

  it('finds voices by polling when the browser never fires the event', async () => {
    // Safari and some Chrome builds populate the list without announcing it.
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('select').attributes('disabled')).toBeDefined()

    currentVoices = [voice('Samantha', 'en-US')]
    // No changeHandler call — the retry timer is the only thing that can help.
    await new Promise((resolve) => setTimeout(resolve, 250))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('select').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('Samantha (en-US)')
  })

  it('offers non-English voices in their own group', async () => {
    currentVoices = [voice('Samantha', 'en-US'), voice('Amelie', 'fr-FR')]
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()

    const groups = wrapper.findAll('optgroup').map((g) => g.attributes('label'))
    expect(groups).toEqual(['English', 'Other languages'])
    expect(wrapper.text()).toContain('Amelie (fr-FR)')
  })

  it('plays a sample when a voice is chosen', async () => {
    currentVoices = [voice('Samantha', 'en-US')]
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()

    const select = wrapper.find('select')
    await select.setValue('Samantha-en-US')

    expect(spoken).toHaveLength(1)
  })
})
