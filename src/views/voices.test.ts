import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { makeI18n, makeRouter } from '@/test/harness'

/**
 * Two behaviours are under test here.
 *
 * First, Chrome returns no voices from the first getVoices() call and fills the
 * list in later; the picker must survive that rather than showing an empty
 * control forever.
 *
 * Second — and this is the multilingual part — each language gets its own
 * picker. Filipino is the realistic case: Android ships a fil-PH voice, most
 * desktop browsers and iOS do not. Filipino declares Spanish as a stand-in, so
 * audio keeps working there — but the substitution is never silent, because
 * Spanish gets `h`, `ng` and stress wrong. When neither the language's own
 * voice nor its stand-in exists, audio is disabled and the reason named.
 */

const spoken: Array<{ text: string; lang: string }> = []
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
    removeEventListener: vi.fn(),
    cancel: vi.fn(),
    speak: (u: { text: string; lang: string }) =>
      spoken.push({ text: u.text, lang: u.lang }),
  }
  ;(window as any).SpeechSynthesisUtterance = class {
    text: string
    lang = ''
    rate = 1
    pitch = 1
    voice: unknown = null
    constructor(text: string) {
      this.text = text
    }
  }
})

async function mountParent() {
  const ParentView = (await import('./ParentView.vue')).default
  const router = makeRouter()
  await router.push('/parent')
  await router.isReady()
  return mount(ParentView, { global: { plugins: [router, makeI18n()] } })
}

/** The voice picker for one language, found by the label it sits under. */
function voiceSelectFor(wrapper: ReturnType<typeof mount>, language: string) {
  const label = wrapper
    .findAll('label')
    .find((l) => l.text().startsWith(language) && l.find('select').exists())
  return label?.find('select')
}

describe('voice picker', () => {
  it('is shown even before any voices have loaded', async () => {
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()

    const select = voiceSelectFor(wrapper, 'English')
    expect(select?.exists()).toBe(true)
    // Disabled and explained, rather than absent.
    expect(select?.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Still looking for voices')
  })

  it('fills in when the browser announces voices late', async () => {
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()

    currentVoices = [voice('Samantha', 'en-US'), voice('Daniel', 'en-GB')]
    changeHandler?.()
    await wrapper.vm.$nextTick()

    const options = wrapper.findAll('option').map((o) => o.text())
    expect(options).toContain('Samantha (en-US)')
    expect(voiceSelectFor(wrapper, 'English')?.attributes('disabled')).toBeUndefined()
  })

  it('finds voices by polling when the browser never fires the event', async () => {
    // Safari and some Chrome builds populate the list without announcing it.
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()
    expect(voiceSelectFor(wrapper, 'English')?.attributes('disabled')).toBeDefined()

    currentVoices = [voice('Samantha', 'en-US')]
    // No changeHandler call — the retry timer is the only thing that can help.
    await new Promise((resolve) => setTimeout(resolve, 250))
    await wrapper.vm.$nextTick()

    expect(voiceSelectFor(wrapper, 'English')?.attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('Samantha (en-US)')
  })

  it('gives each language its own picker holding only that language’s voices', async () => {
    currentVoices = [
      voice('Samantha', 'en-US'),
      voice('Kyoko', 'ja-JP'),
      voice('Amelie', 'fr-FR'),
    ]
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()

    const english = voiceSelectFor(wrapper, 'English')!
    const japanese = voiceSelectFor(wrapper, 'Japanese')!

    expect(english.text()).toContain('Samantha (en-US)')
    expect(english.text()).not.toContain('Kyoko')
    expect(japanese.text()).toContain('Kyoko (ja-JP)')
    expect(japanese.text()).not.toContain('Samantha')

    // A voice for a language the app does not teach is simply not offered.
    expect(wrapper.text()).not.toContain('Amelie')
  })

  it('stands Spanish in for Filipino and says so', async () => {
    // The Filipino case on most desktops: no fil-PH voice, but Spanish present.
    currentVoices = [
      voice('Samantha', 'en-US'),
      voice('Kyoko', 'ja-JP'),
      voice('Paulina', 'es-MX'),
    ]
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()

    const fil = voiceSelectFor(wrapper, 'Filipino')!
    // Audio stays available, and the picker offers the stand-in's voices
    // rather than sitting empty next to working sound.
    expect(fil.attributes('disabled')).toBeUndefined()
    expect(fil.text()).toContain('Paulina (es-MX)')

    // The compromise is stated, including where it goes wrong.
    expect(wrapper.text()).toContain('No Filipino voice on this device')
    expect(wrapper.text()).toContain('Spanish')
    expect(wrapper.text()).toMatch(/“h”|“ng”/)
  })

  it('prefers Latin American Spanish over Castilian', async () => {
    // Castilian's c/z "th" has no Filipino counterpart, so es-MX wins.
    currentVoices = [voice('Monica', 'es-ES'), voice('Paulina', 'es-MX')]
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()

    await voiceSelectFor(wrapper, 'Filipino')!.setValue('')
    expect(spoken).toHaveLength(1)
    expect(spoken[0].lang).toBe('es-MX')
  })

  it('disables Filipino audio when even the stand-in is missing', async () => {
    currentVoices = [voice('Samantha', 'en-US'), voice('Kyoko', 'ja-JP')]
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()

    expect(voiceSelectFor(wrapper, 'Filipino')?.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('reading aloud is off for Filipino')
    // English is unaffected — one missing voice must not disable the rest.
    expect(voiceSelectFor(wrapper, 'English')?.attributes('disabled')).toBeUndefined()
  })

  it('never substitutes for a language that declares no stand-in', async () => {
    // English and Japanese are widely available; a wrong-language voice for
    // them would be a bug, not a compromise.
    currentVoices = [voice('Paulina', 'es-MX')]
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()

    expect(voiceSelectFor(wrapper, 'English')?.attributes('disabled')).toBeDefined()
    expect(voiceSelectFor(wrapper, 'Japanese')?.attributes('disabled')).toBeDefined()
  })

  it('plays a sample in the right language when a voice is chosen', async () => {
    currentVoices = [voice('Samantha', 'en-US'), voice('Kyoko', 'ja-JP')]
    const wrapper = await mountParent()
    await wrapper.vm.$nextTick()

    await voiceSelectFor(wrapper, 'Japanese')!.setValue('Kyoko-ja-JP')

    expect(spoken).toHaveLength(1)
    expect(spoken[0].lang).toBe('ja-JP')
  })
})
