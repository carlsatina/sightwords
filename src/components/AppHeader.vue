<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useProgressStore } from '@/stores/progress'

const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const progress = useProgressStore()

const isHome = computed(() => route.name === 'home')
const streak = computed(() => progress.state.currentStreak)

function goBack() {
  // Deep-linking into a mode leaves no history to pop, so fall back to home.
  if (window.history.state?.back) router.back()
  else router.push({ name: 'home' })
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-ink/10 bg-paper/85 backdrop-blur-md dark:border-white/10 dark:bg-night/85">
    <div class="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
      <button
        v-if="!isHome"
        type="button"
        class="chunky-btn flex h-11 w-11 items-center justify-center bg-white text-ink shadow-[0_3px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_3px_0_0_rgba(0,0,0,0.5)]"
        aria-label="Go back"
        @click="goBack"
      >
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <RouterLink
        :to="{ name: 'home' }"
        class="flex min-w-0 items-center gap-2 text-xl font-extrabold tracking-tight"
      >
        <span aria-hidden="true">📖</span>
        <span class="truncate">Sight Words</span>
      </RouterLink>

      <div class="ml-auto flex items-center gap-2">
        <span
          v-if="streak > 0"
          class="flex items-center gap-1 rounded-full bg-marigold/20 px-3 py-1.5 text-sm font-bold text-marigold-deep dark:text-marigold"
          :title="`${streak} day practice streak`"
        >
          <span aria-hidden="true">🔥</span>
          <span class="tabular-nums">{{ streak }}</span>
          <span class="sr-only">day practice streak</span>
        </span>

        <button
          type="button"
          class="chunky-btn flex h-11 w-11 items-center justify-center bg-white text-ink shadow-[0_3px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_3px_0_0_rgba(0,0,0,0.5)]"
          :aria-label="settings.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="settings.toggleDarkMode()"
        >
          <svg v-if="settings.isDark" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg v-else viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        </button>

        <RouterLink
          :to="{ name: 'parent' }"
          class="chunky-btn flex h-11 w-11 items-center justify-center bg-white text-ink shadow-[0_3px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_3px_0_0_rgba(0,0,0,0.5)]"
          aria-label="Parent settings"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
        </RouterLink>
      </div>
    </div>
  </header>
</template>
