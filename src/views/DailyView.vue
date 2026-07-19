<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCardsStore } from '@/stores/cards'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'
import ReadAloudSession from '@/components/ReadAloudSession.vue'
import AppButton from '@/components/AppButton.vue'
import type { Card } from '@/types'

const library = useCardsStore()
const progress = useProgressStore()
const settings = useSettingsStore()
const { t } = useI18n()

// Unlocking is per language, so the allowed set is resolved against the levels
// of the language currently being practised.
const allowedLevels = library.levels
  .map((level) => level.id)
  .filter((id) => settings.isLevelUnlocked(id))

// Generated once per calendar day and stored, so closing the app mid-practice
// resumes the same ten cards rather than rerolling them.
const session = progress.ensureDailySession(
  settings.settings.dailyGoal,
  allowedLevels,
)

const cards = ref<Card[]>(
  session.cardIds
    .map((id) => library.getCard(id))
    .filter((card): card is Card => Boolean(card)),
)

const hasCards = computed(() => cards.value.length > 0)
</script>

<template>
  <ReadAloudSession
    v-if="hasCards"
    :cards="cards"
    mode="daily"
    accent="marigold"
    :title="t('daily.title')"
    :finish-label="t('session.backHome')"
  />

  <div v-else class="deck-card mx-auto mt-10 max-w-xl p-10 text-center">
    <p class="text-7xl" aria-hidden="true">🔒</p>
    <p class="mt-4 text-3xl font-extrabold">{{ t('daily.emptyTitle') }}</p>
    <p class="mt-2 text-lg opacity-60">{{ t('daily.emptyBlurb') }}</p>
    <AppButton class="mt-6" variant="quiet" :to="{ name: 'parent' }">
      {{ t('daily.openSettings') }}
    </AppButton>
  </div>
</template>
