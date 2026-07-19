<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCardsStore } from '@/stores/cards'
import { useSettingsStore } from '@/stores/settings'
import type { LanguageCode } from '@/types'

/**
 * Switches the language being practised. Each option is labelled with the
 * language's endonym — 日本語, not "Japanese" — because a child who reads
 * Japanese recognises that faster than its English name, and a child who does
 * not read it yet is not the one choosing.
 */
const library = useCardsStore()
const settings = useSettingsStore()
const { t } = useI18n()

function choose(code: LanguageCode) {
  settings.setLanguage(code)
}
</script>

<template>
  <nav :aria-label="t('header.language')" class="flex flex-wrap items-center gap-2">
    <span class="text-xs font-bold tracking-[0.15em] uppercase opacity-45">
      {{ t('home.switchLanguage') }}
    </span>

    <div class="flex flex-wrap gap-1.5" role="group">
      <button
        v-for="option in library.languages"
        :key="option.code"
        type="button"
        class="chunky-btn px-4 py-1.5 text-base font-bold transition"
        :class="
          option.code === settings.settings.language
            ? 'bg-grape text-white shadow-[0_3px_0_0_rgba(76,45,122,0.5)]'
            : 'bg-white text-ink shadow-[0_3px_0_0_rgba(30,42,71,0.12)] dark:bg-night-card dark:text-paper dark:shadow-[0_3px_0_0_rgba(0,0,0,0.5)]'
        "
        :aria-pressed="option.code === settings.settings.language"
        :lang="option.code"
        @click="choose(option.code)"
      >
        {{ option.endonym }}
      </button>
    </div>
  </nav>
</template>
