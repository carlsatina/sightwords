import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCardsStore } from './cards'
import { SETTINGS_VERSION, useSettingsStore } from './settings'
import { useProgressStore } from './progress'
import { STORAGE_KEYS } from '@/lib/storage'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('language scoping', () => {
  it('shows the levels of the language being practised', () => {
    const settings = useSettingsStore()
    const cards = useCardsStore()

    expect(cards.language.code).toBe('en')
    expect(cards.levels).toHaveLength(6)

    settings.setLanguage('ja')
    expect(cards.language.code).toBe('ja')
    expect(cards.levels).toHaveLength(3)
  })

  it('scopes allCards to one language but everyCard to all of them', () => {
    const cards = useCardsStore()
    expect(cards.allCards.every((c) => c.language === 'en')).toBe(true)
    expect(new Set(cards.everyCard.map((c) => c.language))).toEqual(
      new Set(['en', 'fil', 'ja']),
    )
  })

  it('resolves a card from any language, not just the active one', () => {
    // Progress and the parent's activity log reach across languages even while
    // the child is practising one.
    const cards = useCardsStore()
    expect(cards.getCard('ja:日')?.language).toBe('ja')
    expect(cards.getCard('en:the')?.language).toBe('en')
  })

  it('falls back to the first language rather than blanking the screen', () => {
    // A settings value naming a language a custom library dropped must not
    // leave the child looking at nothing.
    const settings = useSettingsStore()
    settings.settings.language = 'de' as never
    expect(useCardsStore().language).toBeDefined()
    expect(useCardsStore().levels.length).toBeGreaterThan(0)
  })
})

describe('card ids', () => {
  it('namespaces every card by its language', () => {
    const cards = useCardsStore()
    for (const card of cards.everyCard.slice(0, 50)) {
      expect(card.id.startsWith(`${card.language}:`)).toBe(true)
    }
  })

  it('keeps the same spelling in two languages apart', () => {
    // Built here rather than fished out of the shipped lists: the content can
    // change (English became a phonics progression and lost "at"), but the
    // namespacing rule this protects must hold regardless.
    const cards = useCardsStore()
    expect(
      cards.addCard('en', 2, { kind: 'word', text: 'sala', sentence: 'A sala is here.' }),
    ).toBeNull()
    expect(
      cards.addCard('fil', 1, { kind: 'word', text: 'sala', sentence: 'Malinis ang sala.' }),
    ).toBeNull()

    expect(cards.getCard('en:sala')).toBeDefined()
    expect(cards.getCard('fil:sala')).toBeDefined()
    expect(cards.getCard('en:sala')!.id).not.toBe(cards.getCard('fil:sala')!.id)
  })
})

describe('editing', () => {
  it('adds a card to the active language only', () => {
    const cards = useCardsStore()
    const problem = cards.addCard('en', 1, {
      kind: 'word',
      text: 'zebra',
      sentence: 'A zebra has stripes.',
    })

    expect(problem).toBeNull()
    expect(cards.getCard('en:zebra')).toBeDefined()
    expect(cards.getCard('fil:zebra')).toBeUndefined()
  })

  it('allows the same word to be added to a second language', () => {
    const cards = useCardsStore()
    expect(
      cards.addCard('en', 1, { kind: 'word', text: 'zebra', sentence: 'A zebra runs.' }),
    ).toBeNull()
    expect(
      cards.addCard('fil', 1, {
        kind: 'word',
        text: 'zebra',
        sentence: 'Ang zebra ay may guhit.',
      }),
    ).toBeNull()
  })

  it('refuses a duplicate inside one language', () => {
    const cards = useCardsStore()
    expect(
      cards.addCard('en', 1, { kind: 'word', text: 'the', sentence: 'The sun is warm.' }),
    ).toMatch(/already in/)
  })

  it('adds a kanji card with its readings', () => {
    const cards = useCardsStore()
    const problem = cards.addCard('ja', 3, {
      kind: 'kanji',
      char: '海',
      on: ['カイ'],
      kun: ['うみ'],
      meaning: 'sea',
    })

    expect(problem).toBeNull()
    const added = cards.getCard('ja:海')
    expect(added).toMatchObject({ kind: 'kanji', char: '海', meaning: 'sea' })
  })

  it('refuses to empty a level', () => {
    // A level with no cards would render as a dead end on the home screen.
    const cards = useCardsStore()
    const level = cards.getLevel(1)!
    for (const card of level.cards.slice(0, -1)) {
      cards.deleteCard('en', 1, card.id)
    }

    const last = cards.getLevel(1)!.cards[0]
    expect(cards.deleteCard('en', 1, last.id)).toMatch(/at least one card/)
  })

  it('persists an edit immediately', () => {
    useCardsStore().addCard('en', 1, {
      kind: 'word',
      text: 'zebra',
      sentence: 'A zebra runs.',
    })

    const saved = JSON.parse(localStorage.getItem('sightwords:words')!)
    expect(saved.version).toBe(2)
    expect(JSON.stringify(saved)).toContain('zebra')
  })
})

describe('loading a version 1 save', () => {
  const V1_LIBRARY = {
    version: 1,
    levels: [
      {
        id: 1,
        name: 'My Custom Level',
        blurb: 'Edited by a parent.',
        ageRange: 'Ages 3–4',
        accent: 'mint',
        words: [
          { text: 'the', sentence: 'The sun is warm.' },
          { text: 'jump', sentence: 'I can jump high.' },
        ],
      },
    ],
  }

  it('migrates the parent’s edited list forward', () => {
    localStorage.setItem(STORAGE_KEYS.words, JSON.stringify(V1_LIBRARY))
    localStorage.setItem('sightwords:words', JSON.stringify(V1_LIBRARY))

    const cards = useCardsStore()
    expect(cards.language.code).toBe('en')
    expect(cards.levels[0].name).toBe('My Custom Level')
    expect(cards.getCard('en:the')).toBeDefined()
  })

  it('gains the new languages it never had', () => {
    localStorage.setItem('sightwords:words', JSON.stringify(V1_LIBRARY))

    const cards = useCardsStore()
    expect(cards.languages.map((l) => l.code).sort()).toEqual(['en', 'fil', 'ja'])
  })

  it('rewrites it to v2 on disk so the migration runs once', () => {
    localStorage.setItem('sightwords:words', JSON.stringify(V1_LIBRARY))
    useCardsStore()

    const saved = JSON.parse(localStorage.getItem('sightwords:words')!)
    expect(saved.version).toBe(2)
    expect(saved.languages).toBeDefined()
  })

  it('keeps the child’s mastery through the upgrade', () => {
    // The whole point of the migration: an existing child must not lose their
    // streaks because the app learned a second language.
    localStorage.setItem('sightwords:words', JSON.stringify(V1_LIBRARY))
    localStorage.setItem(
      'sightwords:progress',
      JSON.stringify({
        words: {
          the: { wordId: 'the', correct: 5, incorrect: 1, lastSeen: 'x', streak: 3 },
        },
        currentStreak: 7,
        longestStreak: 9,
        earnedBadges: {},
        recentAnswers: [{ wordId: 'the', correct: true, mode: 'practice', at: 'x' }],
      }),
    )

    const progress = useProgressStore()

    expect(progress.cardProgress['en:the'].correct).toBe(5)
    expect(progress.masteredIds.has('en:the')).toBe(true)
    expect(progress.masteredCount).toBe(1)
    expect(progress.state.currentStreak).toBe(7)
    expect(progress.state.recentAnswers[0].cardId).toBe('en:the')
  })

  it('migrates an in-flight daily session', () => {
    localStorage.setItem('sightwords:words', JSON.stringify(V1_LIBRARY))
    localStorage.setItem(
      'sightwords:daily',
      JSON.stringify({
        date: '2099-01-01',
        wordIds: ['the', 'jump'],
        completedWordIds: ['the'],
      }),
    )

    const progress = useProgressStore()
    expect(progress.daily!.cardIds).toEqual(['en:the', 'en:jump'])
    expect(progress.daily!.completedCardIds).toEqual(['en:the'])
  })

  it('falls back to the built-in lists when a save is unreadable', () => {
    // A corrupt save must never leave a child with a broken or empty app.
    localStorage.setItem('sightwords:words', '{"version":2,"languages":"nope"}')

    const cards = useCardsStore()
    expect(cards.levels.length).toBeGreaterThan(0)
    expect(cards.getCard('en:the')).toBeDefined()
  })
})

describe('unlocked levels', () => {
  it('treats an untouched language as fully unlocked', () => {
    const settings = useSettingsStore()
    settings.setLanguage('ja')
    expect(settings.isLevelUnlocked(1)).toBe(true)
    expect(settings.isLevelUnlocked(3)).toBe(true)
  })

  it('locks levels per language, not globally', () => {
    const settings = useSettingsStore()
    settings.setUnlockedLevels([1], 'en')

    expect(settings.isLevelUnlocked(1, 'en')).toBe(true)
    expect(settings.isLevelUnlocked(2, 'en')).toBe(false)
    // Japanese was never narrowed, so it stays open.
    expect(settings.isLevelUnlocked(2, 'ja')).toBe(true)
  })

  it('lets the new big-word-mode default reach an existing device', () => {
    // Regression: big word mode used to hide its buttons by default. Flipping
    // the default fixed nothing for anyone who had already opened the app,
    // because a stored value always beats a default — the child was left with
    // a bare word and no controls at all.
    localStorage.setItem(
      'sightwords:settings',
      JSON.stringify({ showFocusControls: false, dailyGoal: 10 }),
    )

    const settings = useSettingsStore()
    expect(settings.settings.showFocusControls).toBe(true)
    // Unrelated saved choices must survive the correction.
    expect(settings.settings.dailyGoal).toBe(10)
  })

  it('keeps a deliberate opt-out made after the correction', () => {
    // Once the blob is at v2 the reset has already happened, so turning the
    // controls off is a choice the app must not keep undoing.
    localStorage.setItem(
      'sightwords:settings',
      JSON.stringify({ settingsVersion: 2, showFocusControls: false }),
    )

    expect(useSettingsStore().settings.showFocusControls).toBe(false)
  })

  it('stamps the settings version so the correction runs once', () => {
    localStorage.setItem(
      'sightwords:settings',
      JSON.stringify({ showFocusControls: false }),
    )

    expect(useSettingsStore().settings.settingsVersion).toBe(SETTINGS_VERSION)
  })

  it('migrates a v1 flat unlock list to English', () => {
    localStorage.setItem(
      'sightwords:settings',
      JSON.stringify({ unlockedLevels: [1, 2], speechVoiceURI: 'some-voice' }),
    )

    const settings = useSettingsStore()
    expect(settings.isLevelUnlocked(2, 'en')).toBe(true)
    expect(settings.isLevelUnlocked(3, 'en')).toBe(false)
    expect(settings.voiceFor('en')).toBe('some-voice')
  })
})
