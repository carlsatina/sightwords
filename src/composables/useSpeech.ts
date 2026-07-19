import { computed, onMounted, ref, shallowRef } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useCardsStore } from '@/stores/cards'
import type { Language, LanguageCode } from '@/types'

/**
 * Thin wrapper over the Web Speech API. Speech is strictly an enhancement:
 * every caller must work unchanged when `supported` is false, or when the
 * device has no voice for the language being practised.
 *
 * That second case is not hypothetical. Japanese (ja-JP) is well covered on
 * macOS, iOS and Android; Filipino (fil-PH) is not — Android ships it, most
 * desktop browsers and iOS do not.
 *
 * A language may name substitute tags (`fallbackSpeechLangs`) to use when its
 * own voice is missing. Filipino falls back to Spanish, which shares its
 * five-vowel, largely phonetic system and carries most words — but gets `h`,
 * the `ng` digraph, and stress wrong. That is a real trade, so a substitute is
 * never silent: `voiceStatusFor` reports it and the parent settings say which
 * language is standing in. Where no substitute exists either, audio controls
 * hide rather than offer a button that does nothing.
 */

const voices = shallowRef<SpeechSynthesisVoice[]>([])
const speaking = ref(false)
let listenerAttached = false

/**
 * Chrome returns an empty list from the first getVoices() call and fills it in
 * later. It normally announces that with `voiceschanged`, but that event is
 * unreliable — if it never fires, the app would show no voices at all. Poll a
 * few times as a backstop, then give up rather than spin forever.
 */
const VOICE_RETRY_DELAYS = [100, 300, 700, 1500]

function loadVoices(attempt = 0) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  const available = window.speechSynthesis.getVoices()
  if (available.length > 0) {
    voices.value = available
    return
  }

  const delay = VOICE_RETRY_DELAYS[attempt]
  if (delay !== undefined) {
    setTimeout(() => loadVoices(attempt + 1), delay)
  }
}

/**
 * Matches on the primary subtag only, so an en-GB voice serves an en-US card
 * and a fil voice serves fil-PH. Regional accent is a far smaller problem than
 * silence.
 */
function primarySubtag(tag: string): string {
  return tag.split('-')[0]!.toLowerCase()
}

export function useSpeech() {
  const settings = useSettingsStore()
  const cards = useCardsStore()

  const supported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window

  onMounted(() => {
    if (!supported) return

    // Read on every mount, not just the first. getVoices() is cheap, and a
    // component opened later (the settings page, typically) must not be stuck
    // with whatever the list looked like when the app first booted.
    loadVoices()

    if (!listenerAttached) {
      listenerAttached = true
      window.speechSynthesis.addEventListener('voiceschanged', () => loadVoices())
    }
  })

  /** The BCP-47 tag for the language currently being practised. */
  const currentLang = computed(() => cards.language?.speechLang ?? 'en-US')

  /** Every installed voice that can read the given language. */
  function voicesFor(speechLang: string): SpeechSynthesisVoice[] {
    const want = primarySubtag(speechLang)
    return voices.value.filter((v) => primarySubtag(v.lang) === want)
  }

  function languageFor(code: LanguageCode | undefined): Language | undefined {
    return cards.languages.find((l) => l.code === code)
  }

  /**
   * The best voice for a language, and whether it actually speaks it.
   *
   * Fallback tags are tried in the order the language lists them, so a
   * language can prefer a closer regional variant first — Filipino asks for
   * Latin American Spanish ahead of Castilian, whose `c`/`z` "th" has no
   * Filipino counterpart.
   */
  function resolveFor(language: Language | undefined): {
    voice: SpeechSynthesisVoice | null
    /** The tag actually spoken, which is the voice's own, not the request. */
    lang: string
    status: 'exact' | 'substitute' | 'none'
  } {
    if (!language) return { voice: null, lang: 'en-US', status: 'none' }

    const preferred = settings.voiceFor(language.code)

    const pick = (candidates: SpeechSynthesisVoice[]) => {
      if (candidates.length === 0) return null
      if (preferred) {
        const match = candidates.find((v) => v.voiceURI === preferred)
        if (match) return match
      }
      // A local voice starts instantly and works offline, which matters for a
      // child practising on a tablet.
      return candidates.find((v) => v.localService) ?? candidates[0] ?? null
    }

    const exact = pick(voicesFor(language.speechLang))
    if (exact) return { voice: exact, lang: exact.lang, status: 'exact' }

    const fallbacks = language.fallbackSpeechLangs ?? []

    // Speak under the substitute's own tag: handing a Spanish engine a fil-PH
    // tag makes some browsers refuse the utterance outright.
    const asSubstitute = (voice: SpeechSynthesisVoice) =>
      ({ voice, lang: voice.lang, status: 'substitute' }) as const

    // Region-exact first. Matching on the primary subtag alone would collapse
    // es-MX and es-ES into one bucket and pick whichever the browser happened
    // to list first — defeating the whole point of ordering the fallbacks,
    // since Castilian's c/z "th" has no Filipino counterpart.
    for (const tag of fallbacks) {
      const regional = pick(
        voices.value.filter((v) => v.lang.toLowerCase() === tag.toLowerCase()),
      )
      if (regional) return asSubstitute(regional)
    }

    // No exact regional match, so any voice for the substitute language beats
    // silence.
    for (const tag of fallbacks) {
      const loose = pick(voicesFor(tag))
      if (loose) return asSubstitute(loose)
    }

    return { voice: null, lang: language.speechLang, status: 'none' }
  }

  /** Whether a language is read by its own voice, a stand-in, or not at all. */
  function voiceStatusFor(code: LanguageCode): 'exact' | 'substitute' | 'none' {
    return resolveFor(languageFor(code)).status
  }

  /** The language actually doing the speaking, when a substitute is in use. */
  function substituteLangFor(code: LanguageCode): string | null {
    const resolved = resolveFor(languageFor(code))
    return resolved.status === 'substitute' ? resolved.lang : null
  }

  /**
   * Whether this device can speak the language at all, by its own voice or a
   * declared stand-in. Callers use it to hide audio affordances rather than to
   * offer a button that does nothing — a silent "Hear it" button reads to a
   * child as the app being broken.
   *
   * Reported as false until the voice list has loaded, which keeps a button
   * from flashing in and back out during the first moments after boot.
   */
  function hasVoiceFor(speechLang: string): boolean {
    if (!supported) return false
    if (voicesFor(speechLang).length > 0) return true

    const language = cards.languages.find((l) => l.speechLang === speechLang)
    return (language?.fallbackSpeechLangs ?? []).some(
      (tag) => voicesFor(tag).length > 0,
    )
  }

  const canSpeakCurrent = computed(
    () => settings.settings.speechEnabled && hasVoiceFor(currentLang.value),
  )

  function speak(text: string, options: { rate?: number; lang?: string } = {}) {
    if (!supported || !settings.settings.speechEnabled || !text) return

    const requested = options.lang ?? currentLang.value
    const language =
      cards.languages.find((l) => l.speechLang === requested) ?? cards.language
    const { voice, lang } = resolveFor(language)

    // Nothing to read it with, not even a stand-in. Staying silent beats
    // handing the text to a voice that would mispronounce it wholesale.
    if (!voice) return

    // Cancel any in-flight utterance so rapid card taps don't queue up a backlog.
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = options.rate ?? settings.settings.speechRate
    utterance.pitch = 1.1 // Slightly bright, reads as friendly rather than robotic.
    utterance.lang = lang
    utterance.voice = voice

    utterance.onstart = () => (speaking.value = true)
    utterance.onend = () => (speaking.value = false)
    utterance.onerror = () => (speaking.value = false)

    window.speechSynthesis.speak(utterance)
  }

  function stop() {
    if (!supported) return
    window.speechSynthesis.cancel()
    speaking.value = false
  }

  return {
    supported,
    voices,
    speaking,
    currentLang,
    canSpeakCurrent,
    voicesFor,
    hasVoiceFor,
    voiceStatusFor,
    substituteLangFor,
    speak,
    stop,
  }
}
