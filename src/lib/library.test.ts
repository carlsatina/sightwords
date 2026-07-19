import { describe, expect, it } from 'vitest'
import {
  LIBRARY_VERSION,
  LibraryImportError,
  builtInLibrary,
  cardId,
  migrateIdList,
  migrateProgressIds,
  migrateV1,
  parseLibrary,
  sentenceContainsWord,
  validateCard,
} from './library'
import type { CardDraft } from '@/types'

const wordDraft = (text: string, sentence: string): CardDraft => ({
  kind: 'word',
  text,
  sentence,
})

describe('card ids', () => {
  it('namespaces by language so the same spelling can exist in two of them', () => {
    // The reason this whole scheme exists: Filipino "at" (and) and English
    // "at" are different words a child learns separately. Sharing an id would
    // silently merge their mastery records.
    expect(cardId('en', 'at')).not.toBe(cardId('fil', 'at'))
  })

  it('is case- and whitespace-insensitive', () => {
    expect(cardId('en', '  The ')).toBe(cardId('en', 'the'))
  })
})

describe('word validation', () => {
  const takenIds = new Set<string>()

  it('accepts a normal word with a sentence that uses it', () => {
    expect(
      validateCard({ draft: wordDraft('the', 'The sun is warm.'), language: 'en', takenIds }),
    ).toBeNull()
  })

  it('rejects a sentence that does not contain the word', () => {
    expect(
      validateCard({ draft: wordDraft('the', 'A sun is warm.'), language: 'en', takenIds }),
    ).toMatch(/needs to use the word/)
  })

  it('rejects a duplicate within the same language', () => {
    const taken = new Set([cardId('en', 'the')])
    expect(
      validateCard({ draft: wordDraft('the', 'The sun is warm.'), language: 'en', takenIds: taken }),
    ).toMatch(/already in/)
  })

  it('allows the same spelling in a different language', () => {
    const taken = new Set([cardId('en', 'at')])
    expect(
      validateCard({
        draft: wordDraft('at', 'Si Ana at si Ben ay magkaibigan.'),
        language: 'fil',
        takenIds: taken,
      }),
    ).toBeNull()
  })

  it('accepts non-Latin letters', () => {
    expect(
      validateCard({ draft: wordDraft('あ', 'あり'), language: 'ja', takenIds }),
    ).toBeNull()
  })

  it('skips the sentence-contains-word rule for Japanese', () => {
    // Japanese is not written with spaces, so there are no word boundaries for
    // the check to anchor to and it would reject every valid kana card.
    expect(
      validateCard({ draft: wordDraft('ん', 'みかん'), language: 'ja', takenIds }),
    ).toBeNull()
    // The rule still applies to the languages that have word boundaries.
    expect(
      validateCard({ draft: wordDraft('ako', 'Si Ana ay bata.'), language: 'fil', takenIds }),
    ).toMatch(/needs to use the word/)
  })

  it('rejects a word with spaces in it', () => {
    expect(
      validateCard({ draft: wordDraft('the sun', 'The sun is warm.'), language: 'en', takenIds }),
    ).toMatch(/single word/)
  })
})

describe('kanji validation', () => {
  const takenIds = new Set<string>()
  const kanji = (over: Partial<Extract<CardDraft, { kind: 'kanji' }>> = {}) =>
    ({
      kind: 'kanji',
      char: '日',
      on: ['ニチ'],
      kun: ['ひ'],
      meaning: 'sun, day',
      ...over,
    }) as CardDraft

  it('accepts a complete character', () => {
    expect(validateCard({ draft: kanji(), language: 'ja', takenIds })).toBeNull()
  })

  it('rejects more than one character', () => {
    expect(validateCard({ draft: kanji({ char: '日月' }), language: 'ja', takenIds })).toMatch(
      /exactly one character/,
    )
  })

  it('rejects a character with no readings at all', () => {
    // Nothing to speak and nothing to test — the card would show a shape with
    // nothing to learn about it.
    expect(
      validateCard({ draft: kanji({ on: [], kun: [] }), language: 'ja', takenIds }),
    ).toMatch(/at least one reading/)
  })

  it('accepts a character with only one kind of reading', () => {
    expect(validateCard({ draft: kanji({ kun: [] }), language: 'ja', takenIds })).toBeNull()
  })

  it('rejects a character with no meaning', () => {
    expect(validateCard({ draft: kanji({ meaning: '' }), language: 'ja', takenIds })).toMatch(
      /what .* means/,
    )
  })
})

describe('sentenceContainsWord', () => {
  it('matches on word boundaries, not substrings', () => {
    expect(sentenceContainsWord('The cat sat.', 'cat')).toBe(true)
    expect(sentenceContainsWord('The category is wide.', 'cat')).toBe(false)
  })

  it('ignores case', () => {
    expect(sentenceContainsWord('The sun is warm.', 'the')).toBe(true)
  })
})

describe('v1 → v2 migration', () => {
  const v1 = {
    version: 1 as const,
    levels: [
      {
        id: 1,
        name: 'First Words',
        blurb: 'The first words.',
        ageRange: 'Ages 3–4',
        accent: 'mint' as const,
        words: [
          { text: 'the', sentence: 'The sun is warm.' },
          { text: 'jump', sentence: 'I can jump high.' },
        ],
      },
    ],
  }

  it('moves the old flat level list under English', () => {
    const migrated = migrateV1(v1)
    expect(migrated.version).toBe(LIBRARY_VERSION)

    const english = migrated.languages.find((l) => l.code === 'en')!
    expect(english.levels).toHaveLength(1)
    expect(english.levels[0].cards).toHaveLength(2)
    expect(english.levels[0].cards[0]).toMatchObject({ kind: 'word', text: 'the' })
  })

  it('brings the other languages in as shipped', () => {
    const migrated = migrateV1(v1)
    expect(migrated.languages.map((l) => l.code).sort()).toEqual(['en', 'fil', 'ja'])
    expect(migrated.languages.find((l) => l.code === 'ja')!.levels.length).toBeGreaterThan(0)
  })

  it('parses a v1 file end to end without the caller knowing', () => {
    const parsed = parseLibrary(v1)
    expect(parsed.version).toBe(LIBRARY_VERSION)
    expect(parsed.languages).toHaveLength(3)
  })

  it('does not let the parent’s edits reach the shipped constants', () => {
    // Regression guard: a shallow copy here would let one parent's edit change
    // what "restore the built-in list" restores for everyone afterwards.
    const first = builtInLibrary()
    first.languages[0].levels[0].name = 'Edited'
    expect(builtInLibrary().languages[0].levels[0].name).not.toBe('Edited')
  })
})

describe('progress id migration', () => {
  it('rewrites bare v1 ids into the English namespace', () => {
    const migrated = migrateProgressIds({
      the: { wordId: 'the', correct: 3, incorrect: 0, lastSeen: 'x', streak: 3 },
    })

    expect(Object.keys(migrated)).toEqual(['en:the'])
    expect(migrated['en:the'].cardId).toBe('en:the')
    // The child's actual score is what this migration exists to preserve.
    expect(migrated['en:the'].correct).toBe(3)
    expect(migrated['en:the'].streak).toBe(3)
  })

  it('drops the obsolete wordId field', () => {
    const migrated = migrateProgressIds({
      the: { wordId: 'the', correct: 1, incorrect: 0, lastSeen: 'x', streak: 1 },
    })
    expect(migrated['en:the']).not.toHaveProperty('wordId')
  })

  it('leaves already-namespaced ids alone, so it is safe to run twice', () => {
    const once = migrateProgressIds({
      the: { correct: 1, incorrect: 0, lastSeen: 'x', streak: 1 },
    })
    const twice = migrateProgressIds(once)
    expect(Object.keys(twice)).toEqual(['en:the'])
    expect(twice['en:the'].correct).toBe(1)
  })

  it('does not confuse a non-English id for a v1 one', () => {
    const migrated = migrateProgressIds({
      'ja:日': { correct: 2, incorrect: 0, lastSeen: 'x', streak: 2 },
    })
    expect(Object.keys(migrated)).toEqual(['ja:日'])
  })

  it('migrates a daily session’s id list the same way', () => {
    expect(migrateIdList(['the', 'jump', 'fil:ako'])).toEqual([
      'en:the',
      'en:jump',
      'fil:ako',
    ])
  })
})

describe('parseLibrary', () => {
  it('round-trips the built-in library', () => {
    const parsed = parseLibrary(JSON.parse(JSON.stringify(builtInLibrary())))
    expect(parsed.languages).toHaveLength(3)
    expect(parsed.languages.find((l) => l.code === 'ja')!.levels).toHaveLength(3)
  })

  it('rejects a file that is not a library at all', () => {
    expect(() => parseLibrary('nope')).toThrow(LibraryImportError)
    expect(() => parseLibrary(null)).toThrow(LibraryImportError)
  })

  it('rejects a future format rather than misreading it', () => {
    expect(() => parseLibrary({ version: 99, languages: [] })).toThrow(/format 99/)
  })

  it('rejects an unknown language code', () => {
    expect(() =>
      parseLibrary({ version: 2, languages: [{ code: 'de', levels: [] }] }),
    ).toThrow(/knows en, fil and ja/)
  })

  it('rejects a duplicate word inside one language', () => {
    expect(() =>
      parseLibrary({
        version: 2,
        languages: [
          {
            code: 'en',
            name: 'English',
            endonym: 'English',
            speechLang: 'en-US',
            levels: [
              {
                id: 1,
                name: 'One',
                accent: 'mint',
                cards: [
                  { kind: 'word', text: 'the', sentence: 'The sun is warm.' },
                  { kind: 'word', text: 'the', sentence: 'The moon is bright.' },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow(/already in/)
  })

  it('accepts the same word in two different languages', () => {
    const parsed = parseLibrary({
      version: 2,
      languages: [
        {
          code: 'en',
          name: 'English',
          endonym: 'English',
          speechLang: 'en-US',
          levels: [
            {
              id: 1,
              name: 'One',
              accent: 'mint',
              cards: [{ kind: 'word', text: 'at', sentence: 'We are at the park.' }],
            },
          ],
        },
        {
          code: 'fil',
          name: 'Filipino',
          endonym: 'Filipino',
          speechLang: 'fil-PH',
          levels: [
            {
              id: 1,
              name: 'Isa',
              accent: 'mint',
              cards: [
                { kind: 'word', text: 'at', sentence: 'Si Ana at si Ben ay magkaibigan.' },
              ],
            },
          ],
        },
      ],
    })

    expect(parsed.languages).toHaveLength(2)
  })

  it('reads a kanji card', () => {
    const parsed = parseLibrary({
      version: 2,
      languages: [
        {
          code: 'ja',
          name: 'Japanese',
          endonym: '日本語',
          speechLang: 'ja-JP',
          levels: [
            {
              id: 1,
              name: '漢字',
              accent: 'coral',
              cards: [
                { kind: 'kanji', char: '日', on: ['ニチ'], kun: ['ひ'], meaning: 'sun' },
              ],
            },
          ],
        },
      ],
    })

    expect(parsed.languages[0].levels[0].cards[0]).toMatchObject({
      kind: 'kanji',
      char: '日',
    })
  })
})
