import { onMounted, ref, shallowRef } from 'vue'
import { useSettingsStore } from '@/stores/settings'

/**
 * Thin wrapper over the Web Speech API. Speech is strictly an enhancement:
 * every caller must work unchanged when `supported` is false.
 */

const voices = shallowRef<SpeechSynthesisVoice[]>([])
const speaking = ref(false)
let voicesLoaded = false

function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const available = window.speechSynthesis.getVoices()
  if (available.length > 0) voices.value = available
}

export function useSpeech() {
  const settings = useSettingsStore()
  const supported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window

  onMounted(() => {
    if (!supported || voicesLoaded) return
    voicesLoaded = true
    loadVoices()
    // Chrome populates the voice list asynchronously after first call.
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
  })

  /** Prefer an English voice so sight words aren't read with a foreign phoneme set. */
  function resolveVoice(): SpeechSynthesisVoice | null {
    if (voices.value.length === 0) return null
    const chosen = settings.settings.speechVoiceURI
    if (chosen) {
      const match = voices.value.find((v) => v.voiceURI === chosen)
      if (match) return match
    }
    return (
      voices.value.find((v) => v.lang.startsWith('en') && v.localService) ??
      voices.value.find((v) => v.lang.startsWith('en')) ??
      null
    )
  }

  function speak(text: string, options: { rate?: number } = {}) {
    if (!supported || !settings.settings.speechEnabled || !text) return

    // Cancel any in-flight utterance so rapid card taps don't queue up a backlog.
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = options.rate ?? settings.settings.speechRate
    utterance.pitch = 1.1 // Slightly bright, reads as friendly rather than robotic.
    utterance.lang = 'en-US'

    const voice = resolveVoice()
    if (voice) utterance.voice = voice

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

  return { supported, voices, speaking, speak, stop }
}
