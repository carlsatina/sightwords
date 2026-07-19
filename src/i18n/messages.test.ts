import { describe, expect, it } from 'vitest'
import { messages } from './index'

/**
 * The locales are typed against English, so a missing key is normally a
 * compile error. These tests cover what types cannot: a key present but left
 * as the English text, and a placeholder dropped in translation — both of
 * which would ship a broken or untranslated string to a child.
 */

type Leaf = string
type Tree = { [key: string]: Leaf | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out[path] = value
    else Object.assign(out, flatten(value, path))
  }
  return out
}

const en = flatten(messages.en as Tree)
const fil = flatten(messages.fil as Tree)
const ja = flatten(messages.ja as Tree)

const OTHERS = { fil, ja }

/** `{name}` placeholders a message expects the caller to supply. */
function placeholders(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
}

describe('locale completeness', () => {
  it.each(Object.entries(OTHERS))('%s has exactly the English keys', (_name, locale) => {
    expect(Object.keys(locale).sort()).toEqual(Object.keys(en).sort())
  })

  it.each(Object.entries(OTHERS))('%s has no empty strings', (_name, locale) => {
    const empty = Object.entries(locale)
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key)
    expect(empty).toEqual([])
  })
})

describe('placeholders survive translation', () => {
  it.each(Object.entries(OTHERS))(
    '%s keeps every placeholder the English message uses',
    (_name, locale) => {
      const mismatched = Object.entries(en)
        .filter(([key, english]) => {
          const translated = locale[key]
          return (
            translated !== undefined &&
            placeholders(english).join(',') !== placeholders(translated).join(',')
          )
        })
        .map(([key]) => key)

      // A dropped placeholder renders as a sentence with a hole in it; an
      // invented one renders the literal braces at the child.
      expect(mismatched).toEqual([])
    },
  )
})

describe('pluralised messages', () => {
  it.each(Object.entries(OTHERS))(
    '%s keeps the same number of plural forms as English',
    (_name, locale) => {
      const mismatched = Object.entries(en)
        .filter(([key, english]) => {
          const translated = locale[key]
          if (translated === undefined) return false
          return english.split('|').length !== translated.split('|').length
        })
        .map(([key]) => key)

      // vue-i18n selects a form by index, so a locale with fewer forms would
      // resolve a plural count to the wrong branch or to nothing at all.
      expect(mismatched).toEqual([])
    },
  )
})

describe('translations are actually translated', () => {
  // Some keys legitimately match English: proper nouns, romanised Japanese
  // reading names, and symbols carry across unchanged.
  const ALLOWED_IDENTICAL = new Set([
    'words.fieldOn',
    'words.fieldKun',
    'level.modes.flashcards.name',
    'parent.themeSystem',
  ])

  it.each(Object.entries(OTHERS))('%s is not a copy of English', (name, locale) => {
    const identical = Object.entries(en)
      .filter(([key, english]) => {
        if (ALLOWED_IDENTICAL.has(key)) return false
        const translated = locale[key]
        // Emoji-only and punctuation-only values carry across untranslated.
        if (!/\p{L}/u.test(english)) return false
        return translated === english
      })
      .map(([key]) => key)

    expect(identical, `${name} left these as English`).toEqual([])
  })
})
