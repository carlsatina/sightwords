import { createI18n } from 'vue-i18n'
import type { LanguageCode } from '@/types'
import en from '@/i18n/locales/en'
import fil from '@/i18n/locales/fil'
import ja from '@/i18n/locales/ja'
import { DEFAULT_LANGUAGE } from '@/data/languages'

export const messages = { en, fil, ja }

export const i18n = createI18n({
  // The composition API is what `useI18n()` in <script setup> expects; the
  // legacy option API would shadow it with a global `$t` instead.
  legacy: false,
  locale: DEFAULT_LANGUAGE,
  // A key missing from fil or ja falls back to English rather than rendering
  // the raw key at a child — the locales are typed against English, so this
  // only ever catches a gap introduced at runtime.
  fallbackLocale: 'en',
  messages,
})

export function setLocale(code: LanguageCode) {
  i18n.global.locale.value = code
}
