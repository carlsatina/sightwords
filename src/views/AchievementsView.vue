<script setup lang="ts">
import { computed } from 'vue'
import { useProgressStore } from '@/stores/progress'
import ProgressBar from '@/components/ProgressBar.vue'

const progress = useProgressStore()

const earned = computed(() => progress.badges.filter((b) => b.earned))
const locked = computed(() => progress.badges.filter((b) => !b.earned))

const STATS = computed(() => [
  { label: 'Words mastered', value: progress.masteredCount, emoji: '📖' },
  { label: 'Day streak', value: progress.state.currentStreak, emoji: '🔥' },
  { label: 'Best streak', value: progress.state.longestStreak, emoji: '🏔️' },
  { label: 'Accuracy', value: `${progress.accuracy}%`, emoji: '🎯' },
])
</script>

<template>
  <div class="pt-6">
    <h1 class="text-4xl font-extrabold">Achievements</h1>
    <p class="mt-1 opacity-60">
      {{ earned.length }} of {{ progress.badges.length }} badges earned
    </p>

    <div class="mt-5 max-w-md">
      <ProgressBar
        :value="earned.length"
        :max="progress.badges.length"
        accent="marigold"
        :show-percent="false"
      />
    </div>

    <div class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div v-for="stat in STATS" :key="stat.label" class="deck-card p-4 text-center">
        <p class="text-3xl" aria-hidden="true">{{ stat.emoji }}</p>
        <p class="mt-1 font-[family-name:var(--font-word)] text-3xl font-bold tabular-nums">
          {{ stat.value }}
        </p>
        <p class="text-xs font-semibold opacity-55">{{ stat.label }}</p>
      </div>
    </div>

    <template v-if="earned.length">
      <h2 class="mt-10 mb-3 text-2xl font-extrabold">Earned</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="badge in earned"
          :key="badge.id"
          class="deck-card flex items-center gap-4 border-l-8 border-marigold p-4"
        >
          <span class="text-4xl" aria-hidden="true">{{ badge.emoji }}</span>
          <span>
            <span class="block text-lg font-extrabold">{{ badge.name }}</span>
            <span class="block text-sm opacity-60">{{ badge.description }}</span>
          </span>
        </div>
      </div>
    </template>

    <h2 class="mt-10 mb-3 text-2xl font-extrabold">Still to earn</h2>
    <p v-if="!locked.length" class="opacity-60">Every badge earned. Remarkable.</p>
    <div v-else class="grid gap-3 sm:grid-cols-2">
      <div
        v-for="badge in locked"
        :key="badge.id"
        class="deck-card flex items-center gap-4 p-4 opacity-55"
      >
        <span class="text-4xl grayscale" aria-hidden="true">{{ badge.emoji }}</span>
        <span>
          <span class="block text-lg font-extrabold">{{ badge.name }}</span>
          <span class="block text-sm opacity-70">{{ badge.description }}</span>
        </span>
      </div>
    </div>
  </div>
</template>
