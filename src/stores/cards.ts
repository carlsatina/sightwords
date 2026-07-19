import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  Card,
  CardDraft,
  CardLibrary,
  Language,
  LanguageCode,
  Level,
  LevelId,
  StoredLanguage,
} from '@/types'
import { STORAGE_KEYS, load, remove, save } from '@/lib/storage'
import {
  LIBRARY_VERSION,
  builtInLibrary,
  cardId,
  draftText,
  parseLibrary,
  validateCard,
} from '@/lib/library'
import { useSettingsStore } from '@/stores/settings'

/**
 * Owns the card library the whole app reads. Falls back to the shipped lists
 * until a parent edits something, at which point the edited library is saved
 * whole.
 *
 * Most getters are scoped to the language the child is currently practising —
 * that is what every practice view wants. The few callers that need to reach
 * across languages (progress totals, the parent's word editor) use the
 * `...ForLanguage` variants or `library` directly.
 */
export const useCardsStore = defineStore('cards', () => {
  const settings = useSettingsStore()
  const stored = load<CardLibrary | null>(STORAGE_KEYS.words, null)

  // A saved library that no longer parses (hand-edited, or from a future
  // version) must not brick the app — fall back to the built-in lists.
  const initial = (() => {
    if (!stored) return builtInLibrary()
    try {
      return parseLibrary(stored)
    } catch {
      return builtInLibrary()
    }
  })()

  const library = ref<CardLibrary>(initial)
  const isCustomised = ref(stored !== null)

  // A v1 save that parsed into v2 has been rewritten in memory; persist it now
  // so the migration runs exactly once rather than on every boot.
  if (stored && (stored as { version?: number }).version !== LIBRARY_VERSION) {
    save(STORAGE_KEYS.words, library.value)
  }

  /** Hydrates a stored language into one carrying fully-formed cards. */
  function hydrate(stored: StoredLanguage): Language {
    return {
      code: stored.code,
      name: stored.name,
      endonym: stored.endonym,
      speechLang: stored.speechLang,
      fallbackSpeechLangs: stored.fallbackSpeechLangs,
      levels: stored.levels.map<Level>((level) => ({
        id: level.id,
        name: level.name,
        blurb: level.blurb,
        ageRange: level.ageRange,
        accent: level.accent,
        cards: level.cards.map<Card>((draft) => ({
          ...draft,
          id: cardId(stored.code, draftText(draft)),
          language: stored.code,
          levelId: level.id,
        })),
      })),
    }
  }

  const languages = computed<Language[]>(() => library.value.languages.map(hydrate))

  const language = computed<Language>(
    () =>
      languages.value.find((l) => l.code === settings.settings.language) ??
      // Falls back rather than throwing: a settings value naming a language
      // that a custom library dropped must not leave the child on a blank
      // screen.
      languages.value[0],
  )

  const levels = computed<Level[]>(() => language.value?.levels ?? [])

  const allCards = computed<Card[]>(() => levels.value.flatMap((l) => l.cards))

  /** Every card in every language — progress and badges count across all of them. */
  const everyCard = computed<Card[]>(() =>
    languages.value.flatMap((l) => l.levels.flatMap((lv) => lv.cards)),
  )

  const cardsById = computed(() => new Map(everyCard.value.map((c) => [c.id, c])))

  const allIds = computed(() => new Set(allCards.value.map((c) => c.id)))

  function getCard(id: string): Card | undefined {
    return cardsById.value.get(id)
  }

  function getLevel(id: LevelId): Level | undefined {
    return levels.value.find((level) => level.id === id)
  }

  function levelsForLanguage(code: LanguageCode): Level[] {
    return languages.value.find((l) => l.code === code)?.levels ?? []
  }

  // --- Mutation helpers ---------------------------------------------------

  function languageSlot(code: LanguageCode) {
    return library.value.languages.find((l) => l.code === code)
  }

  function levelSlot(code: LanguageCode, id: LevelId) {
    return languageSlot(code)?.levels.find((level) => level.id === id)
  }

  /** Ids already used in a language, optionally ignoring one card being edited. */
  function takenIds(code: LanguageCode, exceptId?: string): Set<string> {
    const ids = new Set(
      levelsForLanguage(code).flatMap((level) => level.cards.map((c) => c.id)),
    )
    if (exceptId) ids.delete(exceptId)
    return ids
  }

  /**
   * Marks the library as edited and writes it immediately. Card edits are
   * deliberate, infrequent, and the parent's own data — writing synchronously
   * means a change survives the tab being closed a moment later, which a
   * next-tick watcher would not guarantee.
   */
  function markCustomised() {
    isCustomised.value = true
    save(STORAGE_KEYS.words, library.value)
  }

  // --- Mutations ----------------------------------------------------------

  /** Returns null on success, or a message naming what to fix. */
  function addCard(code: LanguageCode, levelId: LevelId, draft: CardDraft): string | null {
    const level = levelSlot(code, levelId)
    if (!level) return 'That level does not exist.'

    const problem = validateCard({ draft, language: code, takenIds: takenIds(code) })
    if (problem) return problem

    level.cards.push(draft)
    markCustomised()
    return null
  }

  function updateCard(
    code: LanguageCode,
    levelId: LevelId,
    id: string,
    draft: CardDraft,
  ): string | null {
    const level = levelSlot(code, levelId)
    if (!level) return 'That level does not exist.'

    const index = level.cards.findIndex((c) => cardId(code, draftText(c)) === id)
    if (index === -1) return 'That card is no longer in the list.'

    const problem = validateCard({ draft, language: code, takenIds: takenIds(code, id) })
    if (problem) return problem

    level.cards[index] = draft
    markCustomised()
    return null
  }

  function deleteCard(code: LanguageCode, levelId: LevelId, id: string): string | null {
    const level = levelSlot(code, levelId)
    if (!level) return 'That level does not exist.'

    const index = level.cards.findIndex((c) => cardId(code, draftText(c)) === id)
    if (index === -1) return null

    // Refuse to empty a level: modes that draw from it would have nothing to
    // show, and the level card would sit there as a dead end.
    if (level.cards.length === 1) {
      return 'A level needs at least one card. Add another before removing this one.'
    }

    level.cards.splice(index, 1)
    markCustomised()
    return null
  }

  function renameLevel(code: LanguageCode, levelId: LevelId, name: string): string | null {
    const level = levelSlot(code, levelId)
    if (!level) return 'That level does not exist.'
    if (!name.trim()) return 'Enter a name for the level.'

    level.name = name.trim()
    markCustomised()
    return null
  }

  // --- Import / export ----------------------------------------------------

  function exportJson(): string {
    return JSON.stringify(library.value, null, 2)
  }

  /** Throws LibraryImportError when the text is not a usable card library. */
  function importJson(text: string): void {
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      throw new Error('That file is not valid JSON.')
    }
    library.value = parseLibrary(raw)
    markCustomised()
  }

  function resetToBuiltIn(): void {
    library.value = builtInLibrary()
    isCustomised.value = false
    remove(STORAGE_KEYS.words)
  }

  return {
    library,
    languages,
    language,
    levels,
    allCards,
    everyCard,
    allIds,
    isCustomised,
    version: LIBRARY_VERSION,
    getCard,
    getLevel,
    levelsForLanguage,
    addCard,
    updateCard,
    deleteCard,
    renameLevel,
    exportJson,
    importJson,
    resetToBuiltIn,
  }
})
