import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { LevelId, Settings } from '@/types'
import { STORAGE_KEYS, load, save } from '@/lib/storage'

/** Built fresh each call so the nested `unlockedLevels` array is never shared. */
function createDefaults(): Settings {
  return {
    darkMode: 'system',
    speechEnabled: true,
    autoSpeak: false, // The child reads first; audio is a hint they ask for.
    speechRate: 0.85, // Slower than natural speech — this is a pronunciation model.
    speechVoiceURI: null,
    confettiEnabled: true,
    showFocusControls: false, // Tap and swipe already cover these.
    reduceMotion: false,
    unlockedLevels: [1, 2, 3, 4, 5],
    dailyGoal: 10,
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const stored = load<Partial<Settings>>(STORAGE_KEYS.settings, {})
  const state = ref<Settings>({ ...createDefaults(), ...stored })

  const prefersDark = ref(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches,
  )

  if (typeof window !== 'undefined' && window.matchMedia) {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (event) => {
        prefersDark.value = event.matches
      })
  }

  const isDark = computed(() =>
    state.value.darkMode === 'system'
      ? prefersDark.value
      : state.value.darkMode === 'dark',
  )

  const isLevelUnlocked = (id: LevelId) => state.value.unlockedLevels.includes(id)

  function setDarkMode(mode: Settings['darkMode']) {
    state.value.darkMode = mode
  }

  function toggleDarkMode() {
    setDarkMode(isDark.value ? 'light' : 'dark')
  }

  function setUnlockedLevels(levels: LevelId[]) {
    state.value.unlockedLevels = [...levels].sort((a, b) => a - b)
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    state.value[key] = value
  }

  function resetToDefaults() {
    state.value = createDefaults()
  }

  watch(state, (value) => save(STORAGE_KEYS.settings, value), { deep: true })

  // Reflect theme and motion preferences onto <html> so CSS can act on them.
  watch(
    [isDark, () => state.value.reduceMotion],
    ([dark, reduced]) => {
      if (typeof document === 'undefined') return
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.classList.toggle('reduce-motion', reduced)
    },
    { immediate: true },
  )

  return {
    settings: state,
    isDark,
    isLevelUnlocked,
    setDarkMode,
    toggleDarkMode,
    setUnlockedLevels,
    update,
    resetToDefaults,
  }
})
