import type { LanguageCode, StoredLanguage } from '@/types'
import { ENGLISH } from '@/data/languages/en'
import { FILIPINO } from '@/data/languages/fil'
import { JAPANESE } from '@/data/languages/ja'

/** Every language the app ships with, in the order the picker shows them. */
export const BUILT_IN_LANGUAGES: StoredLanguage[] = [ENGLISH, FILIPINO, JAPANESE]

export const LANGUAGE_CODES: LanguageCode[] = BUILT_IN_LANGUAGES.map((l) => l.code)

export const DEFAULT_LANGUAGE: LanguageCode = 'en'

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (LANGUAGE_CODES as string[]).includes(value)
}
