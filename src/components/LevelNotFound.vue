<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCardsStore } from '@/stores/cards'
import AppButton from '@/components/AppButton.vue'

/**
 * Shown when a route names a level the current language does not have.
 *
 * This is reachable in normal use now that each language has its own levels:
 * English runs to level 6 and Japanese stops at 3, so a bookmark, a back
 * button, or a language switch made while deep-linked can all land here. The
 * views used to render nothing at all in that case, which reads to a child as
 * the app being broken.
 */
const library = useCardsStore()
const { t } = useI18n()
</script>

<template>
  <div class="deck-card mx-auto mt-10 max-w-xl p-10 text-center">
    <p class="text-7xl" aria-hidden="true">🧭</p>
    <p class="mt-4 text-3xl font-extrabold">{{ t('level.missingTitle') }}</p>
    <p class="mt-2 text-lg opacity-60">
      {{ t('level.missingBlurb', { language: library.language.name }) }}
    </p>
    <AppButton class="mt-6" variant="primary" :to="{ name: 'home' }">
      {{ t('home.chooseLevel') }}
    </AppButton>
  </div>
</template>
