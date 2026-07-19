import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { LanguageCode, LevelId, Settings } from '@/types'
import { STORAGE_KEYS, load, save } from '@/lib/storage'
import { DEFAULT_LANGUAGE, isLanguageCode } from '@/data/languages'

/**
 * Current settings format. Bump it alongside an entry in `migrate` whenever a
 * stored value needs correcting on existing devices.
 */
export const SETTINGS_VERSION = 2

/** Built fresh each call so nested objects are never shared between resets. */
function createDefaults(): Settings {
  return {
    settingsVersion: SETTINGS_VERSION,
    darkMode: 'system',
    language: DEFAULT_LANGUAGE,
    uiLocale: DEFAULT_LANGUAGE,
    speechEnabled: true,
    autoSpeak: false, // The child reads first; audio is a hint they ask for.
    speechRate: 0.85, // Slower than natural speech — this is a pronunciation model.
    speechVoiceURIs: {},
    confettiEnabled: true,
    showFocusControls: true, // Gestures alone proved undiscoverable.
    reduceMotion: false,
    // Absent means "every level in that language is open"; the parent narrows
    // it per language from the parent view.
    unlockedLevels: {},
    dailyGoal: 10,
  }
}

/**
 * Upgrades a stored settings blob.
 *
 * v1 stored one flat `unlockedLevels: LevelId[]` that could only ever have
 * meant English, and one `speechVoiceURI` string.
 *
 * v2 drops any saved `showFocusControls: false`. Big word mode used to hide its
 * buttons by default, on the theory that tapping and swiping covered the same
 * jobs; they did not, and nobody found them. Changing the default alone would
 * not have reached anyone who had already used the app, because a stored value
 * always beats a default — so the old value is cleared once, letting the new
 * default through. A parent who turns it off after this keeps that choice,
 * since by then the blob is already at v2.
 */
function migrate(stored: Record<string, unknown>): Partial<Settings> {
  const migrated = { ...stored } as Partial<Settings> & Record<string, unknown>
  const version = typeof stored.settingsVersion === 'number' ? stored.settingsVersion : 1

  if (Array.isArray(stored.unlockedLevels)) {
    migrated.unlockedLevels = { en: stored.unlockedLevels as LevelId[] }
  }
  if (typeof stored.speechVoiceURI === 'string') {
    migrated.speechVoiceURIs = { en: stored.speechVoiceURI }
    delete migrated.speechVoiceURI
  }
  if (version < 2 && stored.showFocusControls === false) {
    delete migrated.showFocusControls
  }
  if (!isLanguageCode(migrated.language)) migrated.language = DEFAULT_LANGUAGE
  if (!isLanguageCode(migrated.uiLocale)) migrated.uiLocale = DEFAULT_LANGUAGE

  migrated.settingsVersion = SETTINGS_VERSION
  return migrated
}

export const useSettingsStore = defineStore('settings', () => {
  const stored = load<Record<string, unknown>>(STORAGE_KEYS.settings, {})
  const state = ref<Settings>({ ...createDefaults(), ...migrate(stored) })

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

  const language = computed(() => state.value.language)

  /**
   * Unlocking is opt-in per language: a language the parent has never touched
   * has every level open, which is what a child switching to a new language
   * expects to find.
   */
  function isLevelUnlocked(id: LevelId, code: LanguageCode = state.value.language) {
    const unlocked = state.value.unlockedLevels[code]
    return unlocked === undefined || unlocked.includes(id)
  }

  function setUnlockedLevels(
    levels: LevelId[],
    code: LanguageCode = state.value.language,
  ) {
    state.value.unlockedLevels = {
      ...state.value.unlockedLevels,
      [code]: [...levels].sort((a, b) => a - b),
    }
  }

  function setLanguage(code: LanguageCode) {
    state.value.language = code
  }

  function setUiLocale(code: LanguageCode) {
    state.value.uiLocale = code
  }

  function voiceFor(code: LanguageCode): string | null {
    return state.value.speechVoiceURIs[code] ?? null
  }

  function setVoiceFor(code: LanguageCode, voiceURI: string | null) {
    const next = { ...state.value.speechVoiceURIs }
    if (voiceURI) next[code] = voiceURI
    else delete next[code]
    state.value.speechVoiceURIs = next
  }

  function setDarkMode(mode: Settings['darkMode']) {
    state.value.darkMode = mode
  }

  function toggleDarkMode() {
    setDarkMode(isDark.value ? 'light' : 'dark')
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    state.value[key] = value
  }

  function resetToDefaults() {
    state.value = createDefaults()
  }

  watch(state, (value) => save(STORAGE_KEYS.settings, value), { deep: true })

  // Reflect theme, motion and locale onto <html> so CSS and assistive tech can
  // act on them. `lang` matters here beyond styling: it tells a screen reader
  // which pronunciation rules to use for the page's text.
  watch(
    [isDark, () => state.value.reduceMotion, () => state.value.uiLocale],
    ([dark, reduced, locale]) => {
      if (typeof document === 'undefined') return
      document.documentElement.classList.toggle('dark', dark as boolean)
      document.documentElement.classList.toggle('reduce-motion', reduced as boolean)
      document.documentElement.lang = locale as string
    },
    { immediate: true },
  )

  return {
    settings: state,
    isDark,
    language,
    isLevelUnlocked,
    setDarkMode,
    toggleDarkMode,
    setUnlockedLevels,
    setLanguage,
    setUiLocale,
    voiceFor,
    setVoiceFor,
    update,
    resetToDefaults,
  }
})
