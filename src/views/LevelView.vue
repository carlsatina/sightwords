<script setup lang="ts">
import { computed } from 'vue'
import { useWordsStore } from '@/stores/words'
import { MASTERY_STREAK, useProgressStore } from '@/stores/progress'
import ProgressBar from '@/components/ProgressBar.vue'
import type { LevelId } from '@/types'

const props = defineProps<{ levelId: string }>()

const library = useWordsStore()
const progress = useProgressStore()

const level = computed(() => library.getLevel(Number(props.levelId) as LevelId))

const MODES = [
  {
    route: 'flashcards',
    emoji: '🃏',
    name: 'Flash Cards',
    blurb: 'Flip through the words at your own pace.',
  },
  {
    route: 'practice',
    emoji: '🗣️',
    name: 'Practice',
    blurb: 'Read each word aloud. A grown-up marks it.',
  },
  {
    route: 'quiz',
    emoji: '🎯',
    name: 'Quiz',
    blurb: 'Hear a word and pick it from four choices.',
  },
] as const

function statusOf(wordId: string) {
  const entry = progress.wordProgress[wordId]
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
        Level {{ level.id }} · {{ level.ageRange }}
      </p>
      <h1 class="text-4xl font-extrabold">{{ level.name }}</h1>
      <p class="mt-1 opacity-60">{{ level.blurb }}</p>

      <div class="mt-5 max-w-md">
        <ProgressBar
          :value="progress.masteredByLevel[level.id]"
          :max="level.words.length"
          :accent="level.accent"
          :label="`${progress.masteredByLevel[level.id]} of ${level.words.length} mastered`"
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
        <span class="block text-xl font-extrabold">{{ mode.name }}</span>
        <span class="block text-sm opacity-60">{{ mode.blurb }}</span>
      </RouterLink>
    </div>

    <h2 class="mb-3 text-2xl font-extrabold">All {{ level.words.length }} words</h2>

    <!-- Colour alone can't carry the status, so each chip keeps a text label
         for screen readers. -->
    <ul class="flex flex-wrap gap-2">
      <li
        v-for="word in level.words"
        :key="word.id"
        class="rounded-2xl px-4 py-2 font-[family-name:var(--font-word)] text-xl font-bold"
        :class="STATUS_CLASS[statusOf(word.id)]"
      >
        {{ word.text }}
        <span class="sr-only"> — {{ statusOf(word.id) }}</span>
      </li>
    </ul>

    <div class="mt-5 flex flex-wrap gap-4 text-sm opacity-70">
      <span class="flex items-center gap-2"><i class="h-3 w-3 rounded-full bg-mint/60" aria-hidden="true" />Mastered</span>
      <span class="flex items-center gap-2"><i class="h-3 w-3 rounded-full bg-marigold/60" aria-hidden="true" />Learning</span>
      <span class="flex items-center gap-2"><i class="h-3 w-3 rounded-full bg-coral/60" aria-hidden="true" />Tricky</span>
      <span class="flex items-center gap-2"><i class="h-3 w-3 rounded-full bg-ink/15 dark:bg-white/15" aria-hidden="true" />Not seen yet</span>
    </div>
  </div>
</template>
