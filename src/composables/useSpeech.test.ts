import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useSpeech } from './useSpeech'
import { useSettingsStore } from '@/stores/settings'
import { makeI18n } from '@/test/harness'

/**
 * The distinction this file exists to protect: an empty voice list means "the
 * browser has not answered yet", not "this device has no voices".
 *
 * Conflating the two hid every audio control on iOS — where `getVoices()`
 * routinely returns nothing at load and sometimes never fills in — and told
 * the parent that English, Filipino and Japanese all had no voice installed
 * when in fact all three worked.
 */

let currentVoices: unknown[] = []
let spoken: Array<{ text: string; lang: string; voice: string | null }> = []

function voice(name: string, lang: string) {
  return { voiceURI: `${name}-${lang}`, name, lang, localService: true }
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
  setActivePinia(createPinia())
  currentVoices = []
  spoken = []
  ;(window as any).speechSynthesis = {
    getVoices: () => currentVoices,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    cancel: vi.fn(),
    speak: (u: { text: string; lang: string; voice: { name: string } | null }) =>
      spoken.push({ text: u.text, lang: u.lang, voice: u.voice?.name ?? null }),
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

/** Mounts a throwaway component so `useSpeech`'s onMounted hook runs. */
function withSpeech() {
  let api!: ReturnType<typeof useSpeech>
  const Host = defineComponent({
    setup() {
      api = useSpeech()
      return () => h('div')
    },
  })
  mount(Host, { global: { plugins: [makeI18n()] } })
  return api
}

describe('while the voice list is unknown', () => {
  it('assumes every language can be spoken', () => {
    // Optimistic on purpose. A permanently silent app is a worse failure than
    // a button that occasionally does nothing.
    const speech = withSpeech()
    expect(speech.hasVoiceFor('en-US')).toBe(true)
    expect(speech.hasVoiceFor('fil-PH')).toBe(true)
    expect(speech.hasVoiceFor('ja-JP')).toBe(true)
  })

  it('speaks anyway, leaving the browser to choose a voice', () => {
    const speech = withSpeech()
    speech.speak('cat', { lang: 'en-US' })

    expect(spoken).toHaveLength(1)
    expect(spoken[0].lang).toBe('en-US')
    // No explicit voice — the engine picks from the language tag.
    expect(spoken[0].voice).toBeNull()
  })

  it('still tags the utterance with the language being practised', () => {
    // Without this the browser would read Filipino with whatever it defaults
    // to, which is usually English.
    const speech = withSpeech()
    useSettingsStore().setLanguage('fil')
    speech.speak('ako')

    expect(spoken[0].lang).toBe('fil-PH')
  })

  it('reports the status as unknown rather than missing', () => {
    const speech = withSpeech()
    expect(speech.voiceStatusFor('en')).toBe('unknown')
    expect(speech.voicesLoaded.value).toBe(false)
  })
})

describe('language tags with underscores', () => {
  // iOS and some Android builds report `en_US` rather than `en-US`. Splitting
  // on "-" alone turned that into "en_us", which matched no language at all —
  // a phone with 91 installed voices insisted it had none, and every audio
  // control disappeared.
  it('matches a voice whichever separator the browser uses', () => {
    currentVoices = [voice('Samantha', 'en_US'), voice('Kyoko', 'ja_JP')]
    const speech = withSpeech()

    expect(speech.hasVoiceFor('en-US')).toBe(true)
    expect(speech.hasVoiceFor('ja-JP')).toBe(true)
    expect(speech.voiceStatusFor('en')).toBe('exact')
    expect(speech.voiceStatusFor('ja')).toBe('exact')
  })

  it('speaks with the underscore-tagged voice rather than the default', () => {
    currentVoices = [voice('Samantha', 'en_US')]
    const speech = withSpeech()
    speech.speak('cat', { lang: 'en-US' })

    expect(spoken[0].voice).toBe('Samantha')
  })

  it('still finds the Spanish stand-in for Filipino', () => {
    currentVoices = [voice('Paulina', 'es_MX')]
    const speech = withSpeech()

    expect(speech.hasVoiceFor('fil-PH')).toBe(true)
    expect(speech.voiceStatusFor('fil')).toBe('substitute')
  })

  it('keeps preferring Latin American Spanish over Castilian', () => {
    // The regional ordering has to survive normalisation too.
    currentVoices = [voice('Monica', 'es_ES'), voice('Paulina', 'es_MX')]
    const speech = withSpeech()
    useSettingsStore().setLanguage('fil')
    speech.speak('ako')

    expect(spoken[0].voice).toBe('Paulina')
  })

  it('uses an installed Tagalog-tagged voice as Filipino itself', () => {
    // Android's text-to-speech engines label the Filipino voice inconsistently:
    // newer builds report `fil-PH`, others still use the older Tagalog code
    // `tl-PH` for the same voice. Matching on `fil` alone left a phone with
    // Filipino installed being read to in Spanish.
    currentVoices = [voice('Google Filipino', 'tl-PH'), voice('Paulina', 'es-MX')]
    const speech = withSpeech()

    expect(speech.hasVoiceFor('fil-PH')).toBe(true)
    // Its own language, not a stand-in — so no "Spanish is reading" warning.
    expect(speech.voiceStatusFor('fil')).toBe('exact')

    useSettingsStore().setLanguage('fil')
    speech.speak('bayanihan')
    expect(spoken[0].voice).toBe('Google Filipino')
  })

  it('offers a tl-tagged voice in the Filipino voice picker', () => {
    // The parent must be able to select it, not just have it chosen for them.
    currentVoices = [voice('Google Filipino', 'tl_PH')]
    const speech = withSpeech()

    expect(speech.voicesFor('fil-PH').map((v) => v.name)).toEqual(['Google Filipino'])
  })

  it('does not invent a match across different languages', () => {
    // Normalising must not become "match anything" — Japanese has no stand-in.
    currentVoices = [voice('Samantha', 'en_US')]
    const speech = withSpeech()

    expect(speech.hasVoiceFor('ja-JP')).toBe(false)
  })
})

describe('once the voice list has arrived', () => {
  it('reports a language with no voice and no stand-in as missing', () => {
    currentVoices = [voice('Samantha', 'en-US')]
    const speech = withSpeech()

    expect(speech.hasVoiceFor('en-US')).toBe(true)
    // Japanese declares no stand-in, so this is a real absence.
    expect(speech.hasVoiceFor('ja-JP')).toBe(false)
    expect(speech.voiceStatusFor('ja')).toBe('none')
  })

  it('refuses to speak a language it knows it cannot read', () => {
    currentVoices = [voice('Samantha', 'en-US')]
    const speech = withSpeech()
    useSettingsStore().setLanguage('ja')
    speech.speak('日')

    expect(spoken).toEqual([])
  })

  it('uses a real voice rather than the browser default', () => {
    currentVoices = [voice('Samantha', 'en-US')]
    const speech = withSpeech()
    speech.speak('cat', { lang: 'en-US' })

    expect(spoken[0].voice).toBe('Samantha')
  })

  it('still stands Spanish in for Filipino', () => {
    currentVoices = [voice('Paulina', 'es-MX')]
    const speech = withSpeech()

    expect(speech.hasVoiceFor('fil-PH')).toBe(true)
    expect(speech.voiceStatusFor('fil')).toBe('substitute')
  })
})
