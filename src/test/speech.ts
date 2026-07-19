import { vi } from 'vitest'

/**
 * Installs a fake Web Speech API and returns the list of utterances it was
 * asked to speak.
 *
 * The voice list matters: `useSpeech` refuses to speak when no installed voice
 * matches the card's language, so a mock returning no voices would make every
 * speech assertion vacuously pass.
 */
export function installSpeechMock(langs: string[] = ['en-US']) {
  const spoken: Array<{ text: string; lang: string }> = []

  const voices = langs.map((lang, i) => ({
    voiceURI: `voice-${lang}-${i}`,
    name: `Test ${lang}`,
    lang,
    localService: true,
    default: i === 0,
  }))

  ;(window as any).speechSynthesis = {
    getVoices: () => voices,
    addEventListener: vi.fn(),
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
    onstart: unknown = null
    onend: unknown = null
    onerror: unknown = null
    constructor(text: string) {
      this.text = text
    }
  }

  return { spoken, voices, texts: () => spoken.map((s) => s.text) }
}
