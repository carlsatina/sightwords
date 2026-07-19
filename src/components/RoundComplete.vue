<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfetti } from '@/composables/useConfetti'
import AppButton from '@/components/AppButton.vue'

/**
 * The moment a round of cards is finished.
 *
 * Deliberately a transparent overlay rather than a full page: the cards stay
 * visible behind it, so the celebration reads as something that happened *to*
 * the work rather than a screen that replaced it.
 *
 * It asks rather than assumes. A child who has just done twenty cards may be
 * finished or may be on a roll, and the app is in no position to guess — so
 * "more" and "stop" are offered as equals, with neither styled as the answer
 * the app is hoping for.
 */
const props = withDefaults(
  defineProps<{
    /** How many cards the round held. */
    count: number
    /** Which round this was — 1, 2, 3… */
    round: number
    /** Score, where the mode keeps one. Flash cards do not. */
    correct?: number
    total?: number
  }>(),
  {},
)

const emit = defineEmits<{ continue: []; finish: [] }>()

const { burst } = useConfetti()
const { t } = useI18n()

const container = ref<HTMLElement | null>(null)

const scored = computed(() => props.correct !== undefined && props.total !== undefined)

const percent = computed(() =>
  scored.value && props.total ? Math.round((props.correct! / props.total) * 100) : 100,
)

/**
 * The praise fits what actually happened. A child who got half of them wrong
 * being told "perfect!" learns that the app is not paying attention.
 */
const praise = computed(() => {
  if (!scored.value) return t('round.doneBlurb', { count: props.count })
  if (percent.value === 100) return t('round.praisePerfect')
  if (percent.value >= 70) return t('round.praiseStrong')
  if (percent.value >= 40) return t('round.praiseFair')
  return t('round.praiseLow')
})

const emoji = computed(() => {
  if (!scored.value) return '🎉'
  if (percent.value === 100) return '🏆'
  if (percent.value >= 70) return '🌟'
  return '💪'
})

function onKeydown(event: KeyboardEvent) {
  // Escape means "I'm done" — the least surprising reading of dismissing a
  // dialog that asks whether to carry on.
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('finish')
  }
}

onMounted(async () => {
  // Behind the card (which sits at z-130) but above the page — the celebration
  // frames the message rather than covering it.
  burst(140, { zIndex: 125 })
  window.addEventListener('keydown', onKeydown)
  // Move focus into the dialog so a screen reader announces the result and
  // keyboard users land on the choice rather than behind it.
  await nextTick()
  container.value?.focus()
})

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- Backdrop: a light wash rather than a solid sheet, so the deck behind
       stays legible and the moment feels layered on top of the work. -->
  <div
    class="fixed inset-0 z-[130] flex items-center justify-center bg-paper/70 px-4 backdrop-blur-sm dark:bg-night/70"
  >
    <div
      ref="container"
      class="deck-card round-pop w-full max-w-md p-8 text-center"
      role="dialog"
      aria-modal="true"
      :aria-label="t('round.title', { count })"
      tabindex="-1"
    >
      <p class="round-emoji text-7xl leading-none" aria-hidden="true">{{ emoji }}</p>

      <p class="mt-4 text-3xl font-extrabold">{{ t('round.title', { count }) }}</p>

      <p
        v-if="scored"
        class="my-2 font-[family-name:var(--font-word)] text-5xl font-bold tabular-nums"
      >
        {{ correct }} / {{ total }}
      </p>

      <p class="mt-2 text-lg opacity-70">{{ praise }}</p>

      <p class="mt-1 text-sm font-semibold opacity-45">
        {{ t('round.roundNumber', { round }) }}
      </p>

      <!-- Both choices are real choices, so neither is dressed as the default. -->
      <div class="mt-7 grid gap-3 sm:grid-cols-2">
        <AppButton variant="primary" size="lg" block @click="emit('continue')">
          {{ t('round.more', { count }) }}
        </AppButton>
        <AppButton variant="ghost" size="lg" block @click="emit('finish')">
          {{ t('round.stop') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * The card lands with a small overshoot; the emoji follows a beat later so the
 * two do not arrive as one flat movement.
 */
.round-pop {
  animation: round-pop 420ms var(--ease-pop) both;
}

.round-emoji {
  animation: round-emoji 620ms var(--ease-pop) 120ms both;
}

@keyframes round-pop {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes round-emoji {
  0% {
    opacity: 0;
    transform: scale(0.3) rotate(-12deg);
  }
  60% {
    opacity: 1;
    transform: scale(1.15) rotate(6deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

/* Honour the parent's reduce-motion setting: appear, but do not perform. */
:global(.reduce-motion) .round-pop,
:global(.reduce-motion) .round-emoji {
  animation: none;
}
</style>
