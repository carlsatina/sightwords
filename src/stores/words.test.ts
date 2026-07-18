import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWordsStore } from './words'
import { useProgressStore, MASTERY_STREAK } from './progress'
import { LIBRARY_VERSION, parseLibrary, builtInLibrary } from '@/lib/library'
import { LEVELS } from '@/data/words'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('word library', () => {
  it('starts from the built-in list', () => {
    const library = useWordsStore()
    expect(library.isCustomised).toBe(false)
    expect(library.levels).toHaveLength(LEVELS.length)
    expect(library.allWords.length).toBe(LEVELS.flatMap((l) => l.words).length)
  })

  it('adds a word and exposes it to the rest of the app', () => {
    const library = useWordsStore()
    expect(library.addWord(1, { text: 'zebra', sentence: 'A zebra has stripes.' })).toBeNull()

    expect(library.getWord('zebra')?.text).toBe('zebra')
    expect(library.getLevel(1)!.words.some((w) => w.id === 'zebra')).toBe(true)
    expect(library.isCustomised).toBe(true)
  })

  it('trims whitespace and matches ids case-insensitively', () => {
    const library = useWordsStore()
    library.addWord(1, { text: '  Zebra  ', sentence: '  A zebra has stripes.  ' })

    expect(library.getWord('zebra')?.text).toBe('Zebra')
    // The same word in another case is still a duplicate.
    expect(library.addWord(2, { text: 'ZEBRA', sentence: 'A ZEBRA runs.' })).toMatch(
      /already in the word list/,
    )
  })

  it('edits a word in place', () => {
    const library = useWordsStore()
    expect(
      library.updateWord(1, 'the', { text: 'the', sentence: 'The dog naps.' }),
    ).toBeNull()
    expect(library.getWord('the')?.sentence).toBe('The dog naps.')
  })

  it('deletes a word', () => {
    const library = useWordsStore()
    const before = library.allWords.length

    expect(library.deleteWord(1, 'the')).toBeNull()
    expect(library.getWord('the')).toBeUndefined()
    expect(library.allWords.length).toBe(before - 1)
  })

  it('refuses to empty a level', () => {
    // An empty level would render as a dead end the child can still tap into.
    const library = useWordsStore()
    const level = library.getLevel(1)!
    for (const word of level.words.slice(0, -1)) library.deleteWord(1, word.id)

    const last = library.getLevel(1)!.words[0]
    expect(library.deleteWord(1, last.id)).toMatch(/at least one word/)
    expect(library.getLevel(1)!.words).toHaveLength(1)
  })
})

describe('word validation', () => {
  const cases: Array<[label: string, text: string, sentence: string, match: RegExp]> = [
    ['an empty word', '', 'Nothing here.', /Enter a word/],
    ['a multi-word entry', 'the dog', 'The dog naps.', /single word/],
    ['digits', 'th3', 'Say th3 word.', /letters only/],
    ['an empty sentence', 'zebra', '', /Enter a sentence/],
    ['a sentence missing its word', 'zebra', 'A horse has stripes.', /needs to use the word/],
  ]

  it.each(cases)('rejects %s', (_label, text, sentence, match) => {
    expect(useWordsStore().addWord(1, { text, sentence })).toMatch(match)
  })

  it('accepts apostrophes and hyphens', () => {
    const library = useWordsStore()
    expect(library.addWord(1, { text: "don't", sentence: "I don't know." })).toBeNull()
    expect(library.addWord(1, { text: 'well-known', sentence: 'A well-known song.' })).toBeNull()
  })

  it('matches the word as a whole word, not a fragment', () => {
    // "cat" must not be satisfied by "catalogue".
    const library = useWordsStore()
    expect(library.addWord(1, { text: 'cat', sentence: 'Read the catalogue.' })).toMatch(
      /needs to use the word/,
    )
    expect(library.addWord(1, { text: 'cat', sentence: 'The cat naps.' })).toBeNull()
  })
})

describe('persistence and reset', () => {
  it('reloads a saved library on the next visit', () => {
    useWordsStore().addWord(1, { text: 'zebra', sentence: 'A zebra has stripes.' })

    setActivePinia(createPinia())
    const reloaded = useWordsStore()

    expect(reloaded.getWord('zebra')).toBeDefined()
    expect(reloaded.isCustomised).toBe(true)
  })

  it('falls back to the built-in list when the saved one is corrupt', () => {
    // A hand-edited or truncated file must not leave the child with no words.
    localStorage.setItem('sightwords:words', JSON.stringify({ version: 1, levels: 'nope' }))
    setActivePinia(createPinia())

    const library = useWordsStore()
    expect(library.allWords.length).toBeGreaterThan(0)
    expect(library.getWord('the')).toBeDefined()
  })

  it('restores the built-in list', () => {
    const library = useWordsStore()
    library.addWord(1, { text: 'zebra', sentence: 'A zebra has stripes.' })
    library.resetToBuiltIn()

    expect(library.getWord('zebra')).toBeUndefined()
    expect(library.isCustomised).toBe(false)
    expect(localStorage.getItem('sightwords:words')).toBeNull()
  })
})

describe('import and export', () => {
  it('round-trips its own export', () => {
    const library = useWordsStore()
    library.addWord(1, { text: 'zebra', sentence: 'A zebra has stripes.' })
    const exported = library.exportJson()

    setActivePinia(createPinia())
    const fresh = useWordsStore()
    fresh.importJson(exported)

    expect(fresh.getWord('zebra')?.sentence).toBe('A zebra has stripes.')
    expect(fresh.allWords.length).toBe(library.allWords.length)
  })

  it('rejects malformed JSON with a readable message', () => {
    expect(() => useWordsStore().importJson('{ not json')).toThrow(/not valid JSON/)
  })

  it.each([
    ['a wrong version', { version: 99, levels: [] }, /format/],
    ['no levels', { version: LIBRARY_VERSION, levels: [] }, /no levels/],
    [
      'a bad level id',
      { version: LIBRARY_VERSION, levels: [{ id: 9, name: 'X', accent: 'mint', words: [] }] },
      /ids must be 1 to 5/,
    ],
    [
      'an unknown accent colour',
      { version: LIBRARY_VERSION, levels: [{ id: 1, name: 'X', accent: 'neon', words: [] }] },
      /colour/,
    ],
    [
      'a word missing its sentence',
      {
        version: LIBRARY_VERSION,
        levels: [{ id: 1, name: 'X', accent: 'mint', words: [{ text: 'a' }] }],
      },
      /needs both a text and a sentence/,
    ],
  ])('refuses %s', (_label, payload, match) => {
    expect(() => parseLibrary(payload)).toThrow(match)
  })

  it('refuses a file whose words repeat', () => {
    // Duplicate ids would collide in the lookup map and merge two words' scores.
    expect(() =>
      parseLibrary({
        version: LIBRARY_VERSION,
        levels: [
          {
            id: 1,
            name: 'X',
            accent: 'mint',
            words: [
              { text: 'a', sentence: 'I see a cat.' },
              { text: 'A', sentence: 'A dog naps.' },
            ],
          },
        ],
      }),
    ).toThrow(/already in the word list/)
  })

  it('accepts the built-in list as a valid import', () => {
    expect(() => parseLibrary(builtInLibrary())).not.toThrow()
  })
})

describe('progress follows the library', () => {
  it('stops counting a word once it is deleted', () => {
    const library = useWordsStore()
    const progress = useProgressStore()

    for (let i = 0; i < MASTERY_STREAK; i++) progress.recordAnswer('the', true, 'practice')
    expect(progress.masteredCount).toBe(1)

    library.deleteWord(1, 'the')

    // A deleted word must not linger in the counts as phantom mastery.
    expect(progress.masteredCount).toBe(0)
    expect(progress.totalAttempts).toBe(0)
  })

  it('keeps a deleted word out of the review queue', () => {
    const library = useWordsStore()
    const progress = useProgressStore()

    progress.recordAnswer('the', false, 'practice')
    expect(progress.missedWordIds).toContain('the')

    library.deleteWord(1, 'the')
    expect(progress.missedWordIds).not.toContain('the')
  })

  it('counts a newly added word towards the level total', () => {
    const library = useWordsStore()
    const progress = useProgressStore()
    const before = progress.levelSizes[1]

    library.addWord(1, { text: 'zebra', sentence: 'A zebra has stripes.' })

    expect(progress.levelSizes[1]).toBe(before + 1)
  })
})
