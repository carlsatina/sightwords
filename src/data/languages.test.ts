import { describe, expect, it } from 'vitest'
import { BUILT_IN_LANGUAGES } from '@/data/languages'
import { cardId, draftText, sentenceContainsWord, validateCard } from '@/lib/library'
import type { StoredLanguage } from '@/types'

/**
 * Integrity checks on the shipped word lists. A duplicate or malformed card
 * here would not crash anything — it would quietly drop a card, merge two
 * children's mastery records, or show a card with nothing on it. Content bugs
 * are the ones a type system cannot catch.
 */

const byCode = (code: string) => BUILT_IN_LANGUAGES.find((l) => l.code === code)!

describe.each(BUILT_IN_LANGUAGES.map((l) => [l.code, l] as const))(
  '%s word list',
  (code, language: StoredLanguage) => {
    const allCards = language.levels.flatMap((level) => level.cards)

    it('has no duplicate cards', () => {
      const ids = allCards.map((card) => cardId(code, draftText(card)))
      const seen = new Set<string>()
      const duplicates = ids.filter((id) => !seen.add(id))
      expect(duplicates).toEqual([])
    })

    it('has every card pass validation', () => {
      const taken = new Set<string>()
      const problems: string[] = []

      for (const card of allCards) {
        const problem = validateCard({ draft: card, language: code, takenIds: taken })
        if (problem) problems.push(`${draftText(card)}: ${problem}`)
        taken.add(cardId(code, draftText(card)))
      }

      expect(problems).toEqual([])
    })

    it('has no empty levels', () => {
      for (const level of language.levels) {
        expect(level.cards.length, `level ${level.id}`).toBeGreaterThan(0)
      }
    })

    it('numbers its levels from 1 with no gaps', () => {
      const ids = language.levels.map((l) => l.id).sort((a, b) => a - b)
      expect(ids).toEqual(ids.map((_, i) => i + 1))
    })

    it('gives every level a name, blurb and age range', () => {
      for (const level of language.levels) {
        expect(level.name.trim(), `level ${level.id} name`).not.toBe('')
        expect(level.blurb.trim(), `level ${level.id} blurb`).not.toBe('')
        expect(level.ageRange.trim(), `level ${level.id} ageRange`).not.toBe('')
      }
    })

    it('keeps each level to a single card kind', () => {
      // A level mixing sight words and kanji would give the quiz two
      // incompatible question shapes inside one round.
      for (const level of language.levels) {
        const kinds = new Set(level.cards.map((c) => c.kind))
        expect(kinds.size, `level ${level.id}`).toBe(1)
      }
    })
  },
)

describe('English phonics progression', () => {
  const english = byCode('en')

  it('runs letter sounds, then words of rising complexity, then tricky words', () => {
    expect(english.levels).toHaveLength(6)
    // Level 1 teaches sounds, not words — a different card kind entirely.
    expect(english.levels[0].cards.every((c) => c.kind === 'letter')).toBe(true)
    expect(english.levels.slice(1).every((l) => l.cards.every((c) => c.kind === 'word')))
      .toBe(true)
    expect(english.levels.at(-1)!.name).toBe('Tricky Words')
  })

  it('gives every letter a sound and example words', () => {
    for (const card of english.levels[0].cards) {
      if (card.kind !== 'letter') continue
      expect(card.sound.trim(), card.letter).not.toBe('')
      expect(card.examples.length, card.letter).toBeGreaterThan(0)
    }
  })

  it('starts with the letters that build words soonest', () => {
    // s a t p i n first, not a b c — those six combine into sat, tap, pin,
    // nip, so a child reads real words after one group.
    const first = english.levels[0].cards
      .slice(0, 6)
      .map((c) => (c.kind === 'letter' ? c.letter : ''))
    expect(first).toEqual(['s', 'a', 't', 'p', 'i', 'n'])
  })

  it('teaches every example word with the letter it demonstrates', () => {
    for (const card of english.levels[0].cards) {
      if (card.kind !== 'letter') continue
      for (const example of card.examples) {
        expect(example.toLowerCase(), `${card.letter} → ${example}`).toContain(
          card.letter.toLowerCase(),
        )
      }
    }
  })

  it('keeps the tricky words genuinely irregular', () => {
    // The point of level 6 is that these cannot be sounded out. If a plain CVC
    // word drifted in here it belongs in level 2 instead.
    const tricky = english.levels
      .at(-1)!
      .cards.map((c) => (c.kind === 'word' ? c.text : ''))
    expect(tricky).toContain('said')
    expect(tricky).toContain('was')
    expect(tricky).toContain('one')
    expect(tricky).not.toContain('cat')
  })

  it('puts every word inside its own sentence', () => {
    const problems = byCode('en')
      .levels.flatMap((l) => l.cards)
      .filter((card) => card.kind === 'word')
      .filter((card) => !sentenceContainsWord(card.sentence, card.text))
      .map((card) => (card.kind === 'word' ? card.text : ''))

    expect(problems).toEqual([])
  })
})

describe('Filipino', () => {
  it('puts every word inside its own sentence', () => {
    // The list was hand-written rather than taken from a published source, so
    // this check is doing real work: "Nandoon" does not contain the word
    // "doon" for a reader learning to spot it.
    const problems = byCode('fil')
      .levels.flatMap((l) => l.cards)
      .filter((card) => card.kind === 'word')
      .filter((card) => !sentenceContainsWord(card.sentence, card.text))
      .map((card) => (card.kind === 'word' ? card.text : ''))

    expect(problems).toEqual([])
  })
})

describe('English glosses', () => {
  it('gives every Filipino word an English meaning', () => {
    // The gloss is the comprehension aid for a child whose stronger language
    // is English; a half-glossed list would leave them stuck on exactly the
    // words nobody got round to.
    const ungGlossed = byCode('fil')
      .levels.flatMap((l) => l.cards)
      .filter((card) => card.kind === 'word' && !card.meaning?.trim())
      .map((card) => (card.kind === 'word' ? card.text : ''))

    expect(ungGlossed).toEqual([])
  })

  it('keeps every gloss short enough to sit under the card', () => {
    const tooLong = byCode('fil')
      .levels.flatMap((l) => l.cards)
      .filter((card) => card.kind === 'word' && (card.meaning?.length ?? 0) > 60)
      .map((card) => (card.kind === 'word' ? card.text : ''))

    expect(tooLong).toEqual([])
  })

  it('translates every Filipino sentence too', () => {
    // The word gloss alone leaves the example opaque, which is where the
    // word's actual usage lives — knowing `ang` "marks the subject" means
    // little until you can read what the sentence says.
    const untranslated = byCode('fil')
      .levels.flatMap((l) => l.cards)
      .filter((card) => card.kind === 'word' && !card.sentenceMeaning?.trim())
      .map((card) => (card.kind === 'word' ? card.text : ''))

    expect(untranslated).toEqual([])
  })

  it('does not gloss English with itself', () => {
    const glossed = byCode('en')
      .levels.flatMap((l) => l.cards)
      .filter(
        (card) => card.kind === 'word' && (card.meaning || card.sentenceMeaning),
      )

    expect(glossed).toEqual([])
  })
})

describe('Japanese', () => {
  const japanese = byCode('ja')

  it('teaches kana before kanji', () => {
    expect(japanese.levels[0].cards[0].kind).toBe('word')
    expect(japanese.levels[2].cards[0].kind).toBe('kanji')
  })

  it('ships exactly the 80 first-grade kyōiku kanji', () => {
    // The published MEXT list for Japanese first grade. Pinned in full because
    // the whole claim of the level is that it is *that* list — a drifted set
    // would teach characters a first-grader has not met.
    const GRADE_ONE =
      '一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六'.split(
        '',
      )

    const shipped = japanese.levels[2].cards.map((card) =>
      card.kind === 'kanji' ? card.char : '',
    )

    expect(shipped).toHaveLength(80)
    expect([...shipped].sort()).toEqual([...GRADE_ONE].sort())
  })

  it('gives every kanji a reading and a meaning', () => {
    for (const card of japanese.levels[2].cards) {
      if (card.kind !== 'kanji') continue
      expect(card.on.length + card.kun.length, card.char).toBeGreaterThan(0)
      expect(card.meaning.trim(), card.char).not.toBe('')
    }
  })

  it('has no empty reading entries', () => {
    // A kanji with no on'yomi must carry an empty list, not a list holding "".
    for (const card of japanese.levels[2].cards) {
      if (card.kind !== 'kanji') continue
      expect([...card.on, ...card.kun].filter((r) => r.trim() === ''), card.char).toEqual(
        [],
      )
    }
  })

  it('covers both kana syllabaries', () => {
    expect(japanese.levels[0].cards.length).toBeGreaterThanOrEqual(45)
    expect(japanese.levels[1].cards.length).toBeGreaterThanOrEqual(45)
  })
})
