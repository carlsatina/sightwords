<script setup lang="ts">
import { computed } from 'vue'
import { useWordsStore } from '@/stores/words'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'
import ProgressBar from '@/components/ProgressBar.vue'
import type { AccentName } from '@/types'

const library = useWordsStore()
const progress = useProgressStore()
const settings = useSettingsStore()

const missedCount = computed(() => progress.missedWordIds.length)
const streak = computed(() => progress.state.currentStreak)

const RING: Record<AccentName, string> = {
  mint: 'border-mint',
  marigold: 'border-marigold',
  coral: 'border-coral',
  grape: 'border-grape',
  ink: 'border-ink dark:border-paper',
}

const CHIP: Record<AccentName, string> = {
  mint: 'bg-mint text-white',
  marigold: 'bg-marigold text-ink',
  coral: 'bg-coral text-white',
  grape: 'bg-grape text-white',
  ink: 'bg-ink text-paper dark:bg-paper dark:text-ink',
}
</script>

<template>
  <div class="pt-6">
    <!-- Hero: the child's own word count is the most characteristic thing on
         this page, so it leads — set in the reading face, not the UI face. -->
    <section class="mb-8 text-center">
      <p class="text-sm font-bold tracking-[0.2em] uppercase opacity-50">
        Words you know
      </p>
      <p
        class="my-1 font-[family-name:var(--font-word)] text-[clamp(4rem,20vw,8rem)] leading-none font-bold"
      >
        {{ progress.masteredCount }}
      </p>
      <p class="text-lg opacity-60">
        out of {{ progress.levelSizes[1] + progress.levelSizes[2] + progress.levelSizes[3] + progress.levelSizes[4] + progress.levelSizes[5] }} sight words
      </p>

      <div class="mx-auto mt-6 max-w-md">
        <ProgressBar :value="progress.overallPercent" accent="marigold" :show-percent="false" />
      </div>

      <div class="mt-5 flex flex-wrap justify-center gap-2">
        <RouterLink
          :to="{ name: 'daily' }"
          class="chunky-btn bg-marigold px-6 py-3 text-lg text-ink shadow-[0_5px_0_0_var(--color-marigold-deep)]"
        >
          {{ progress.dailyComplete ? '✅ Daily practice done' : "▶︎ Today's 10 words" }}
        </RouterLink>
        <RouterLink
          :to="{ name: 'achievements' }"
          class="chunky-btn bg-white px-6 py-3 text-lg text-ink shadow-[0_5px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_5px_0_0_rgba(0,0,0,0.5)]"
        >
          🏅 {{ progress.earnedBadgeCount }} badges
        </RouterLink>
      </div>
    </section>

    <!-- Review only appears when there is something to review. An empty
         review screen teaches a child nothing. -->
    <RouterLink
      v-if="missedCount > 0"
      :to="{ name: 'review' }"
      class="deck-card mb-8 flex items-center gap-4 border-l-8 border-coral p-5 transition hover:-translate-y-0.5"
    >
      <span class="text-4xl" aria-hidden="true">🔁</span>
      <span>
        <span class="block text-xl font-extrabold">Practise tricky words</span>
        <span class="block opacity-60">
          {{ missedCount }} {{ missedCount === 1 ? 'word needs' : 'words need' }} another go
        </span>
      </span>
      <span class="ml-auto text-2xl opacity-40" aria-hidden="true">→</span>
    </RouterLink>

    <h2 class="mb-4 text-2xl font-extrabold">Choose a level</h2>

    <div class="grid gap-4 sm:grid-cols-2">
      <RouterLink
        v-for="level in library.levels"
        :key="level.id"
        :to="
          settings.isLevelUnlocked(level.id)
            ? { name: 'level', params: { levelId: level.id } }
            : { name: 'home' }
        "
        class="deck-card border-t-8 p-5 transition duration-200 ease-[var(--ease-settle)]"
        :class="[
          RING[level.accent],
          settings.isLevelUnlocked(level.id)
            ? 'hover:-translate-y-1'
            : 'pointer-events-none opacity-45',
        ]"
        :aria-disabled="!settings.isLevelUnlocked(level.id)"
      >
        <div class="mb-2 flex items-center gap-2">
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-extrabold tracking-wider uppercase"
            :class="CHIP[level.accent]"
          >
            Level {{ level.id }}
          </span>
          <span class="text-xs font-semibold opacity-50">{{ level.ageRange }}</span>
          <span v-if="!settings.isLevelUnlocked(level.id)" class="ml-auto" aria-hidden="true">🔒</span>
        </div>

        <p class="text-2xl font-extrabold">{{ level.name }}</p>
        <p class="mb-4 text-sm opacity-60">{{ level.blurb }}</p>

        <ProgressBar
          :value="progress.masteredByLevel[level.id]"
          :max="level.words.length"
          :accent="level.accent"
          :label="`${progress.masteredByLevel[level.id]} of ${level.words.length} words`"
        />
      </RouterLink>
    </div>

    <p v-if="streak > 0" class="mt-8 text-center text-lg font-semibold opacity-70">
      🔥 {{ streak }}-day streak. Come back tomorrow to keep it going.
    </p>
  </div>
</template>
