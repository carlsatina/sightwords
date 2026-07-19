<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCardsStore } from '@/stores/cards'
import { MASTERY_STREAK, useProgressStore } from '@/stores/progress'
import ProgressBar from '@/components/ProgressBar.vue'
import LevelNotFound from '@/components/LevelNotFound.vue'
import type { LevelId } from '@/types'

const props = defineProps<{ levelId: string }>()

const library = useCardsStore()
const progress = useProgressStore()
const { t } = useI18n()

const level = computed(() => library.getLevel(Number(props.levelId) as LevelId))

/** True when this level teaches characters rather than sight words. */
const isKanjiLevel = computed(() =>
  Boolean(level.value?.cards.every((card) => card.kind === 'kanji')),
)

// The quiz asks a different question of a kanji level (what does this mean?)
// than of a word level (which word is this?), so its blurb has to follow.
const MODES = computed(() => [
  { route: 'flashcards', emoji: '🃏', key: 'flashcards' },
  { route: 'practice', emoji: '🗣️', key: 'practice' },
  { route: 'quiz', emoji: '🎯', key: isKanjiLevel.value ? 'quizKanji' : 'quiz' },
])

function statusOf(cardId: string) {
  const entry = progress.cardProgress[cardId]
  if (!entry) return 'new'
  if (entry.streak >= MASTERY_STREAK) return 'mastered'
  if (entry.incorrect > 0) return 'tricky'
  return 'learning'
}

const STATUS_CLASS: Record<string, string> = {
  new: 'bg-ink/5 dark:bg-white/5',
  learning: 'bg-marigold/25',
  tricky: 'bg-coral/25',
  mastered: 'bg-mint/30',
}
</script>

<template>
  <div v-if="level" class="pt-6">
    <header class="mb-6">
      <p class="text-sm font-bold tracking-[0.2em] uppercase opacity-50">
        {{ t('level.heading', { id: level.id, ageRange: level.ageRange }) }}
      </p>
      <h1 class="text-4xl font-extrabold" :lang="library.language.code">
        {{ level.name }}
      </h1>
      <p class="mt-1 opacity-60">{{ level.blurb }}</p>

      <div class="mt-5 max-w-md">
        <ProgressBar
          :value="progress.masteredByLevel[level.id]"
          :max="level.cards.length"
          :accent="level.accent"
          :label="
            t('home.levelProgress', {
              done: progress.masteredByLevel[level.id] ?? 0,
              total: level.cards.length,
            })
          "
        />
      </div>
    </header>

    <div class="mb-8 grid gap-3 sm:grid-cols-3">
      <RouterLink
        v-for="mode in MODES"
        :key="mode.route"
        :to="{ name: mode.route, params: { levelId: level.id } }"
        class="deck-card p-5 transition duration-200 ease-[var(--ease-settle)] hover:-translate-y-1"
      >
        <span class="mb-2 block text-4xl" aria-hidden="true">{{ mode.emoji }}</span>
        <span class="block text-xl font-extrabold">
          {{ t(`level.modes.${mode.key}.name`) }}
        </span>
        <span class="block text-sm opacity-60">
          {{ t(`level.modes.${mode.key}.blurb`) }}
        </span>
      </RouterLink>
    </div>

    <h2 class="mb-3 text-2xl font-extrabold">
      {{
        t(isKanjiLevel ? 'level.allChars' : 'level.allWords', {
          count: level.cards.length,
        })
      }}
    </h2>

    <!-- Colour alone can't carry the status, so each chip keeps a text label
         for screen readers. -->
    <ul class="flex flex-wrap gap-2">
      <li
        v-for="card in level.cards"
        :key="card.id"
        class="rounded-2xl px-4 py-2 font-[family-name:var(--font-word)] text-xl font-bold"
        :class="STATUS_CLASS[statusOf(card.id)]"
        :lang="card.language"
      >
        {{ card.kind === 'kanji' ? card.char : card.text }}
        <span class="sr-only"> — {{ t(`level.status.${statusOf(card.id)}`) }}</span>
      </li>
    </ul>

    <div class="mt-5 flex flex-wrap gap-4 text-sm opacity-70">
      <span class="flex items-center gap-2"><i class="h-3 w-3 rounded-full bg-mint/60" aria-hidden="true" />{{ t('level.status.mastered') }}</span>
      <span class="flex items-center gap-2"><i class="h-3 w-3 rounded-full bg-marigold/60" aria-hidden="true" />{{ t('level.status.learning') }}</span>
      <span class="flex items-center gap-2"><i class="h-3 w-3 rounded-full bg-coral/60" aria-hidden="true" />{{ t('level.status.tricky') }}</span>
      <span class="flex items-center gap-2"><i class="h-3 w-3 rounded-full bg-ink/15 dark:bg-white/15" aria-hidden="true" />{{ t('level.status.new') }}</span>
    </div>
  </div>

  <LevelNotFound v-else />
</template>
