<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSwipe } from '@/composables/useSwipe'
import { useSettingsStore } from '@/stores/settings'
import type { AccentName } from '@/types'

/**
 * Distraction-free word view. The word fills the screen; everything else is
 * either a small control at the edges or invisible.
 *
 * Gestures are an enhancement layered on top of real controls, never the only
 * way through: swiping is unavailable to anyone using a keyboard or a screen
 * reader, so arrow keys and focusable buttons do the same jobs.
 */
const props = withDefaults(
  defineProps<{
    word: string
    accent?: AccentName
    /** Shows the swipe/keyboard navigation affordances. */
    navigable?: boolean
    canPrevious?: boolean
    canNext?: boolean
    /** Position within the set, shown as a quiet counter. */
    position?: number
    total?: number
  }>(),
  { accent: 'mint', navigable: false, canPrevious: false, canNext: false },
)

const emit = defineEmits<{
  close: []
  next: []
  previous: []
  speak: []
}>()

const settings = useSettingsStore()

const container = ref<HTMLElement | null>(null)
/** The tap hint earns its place only until the parent has tapped once. */
const hintVisible = ref(true)

const controlsVisible = computed(() => settings.settings.showFocusControls)

/**
 * When the controls are turned off they stay in the DOM but become invisible
 * and untappable — a hidden button that still accepts a tap would fire on a
 * stray touch. Keyboard focus brings them back, because tabbing to a control
 * you cannot see is the same trap in the other direction.
 */
const controlsClass = computed(() =>
  controlsVisible.value
    ? ''
    : 'pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100',
)

const { dragX, listeners } = useSwipe({
  onTap: () => {
    hintVisible.value = false
    emit('speak')
  },
  onSwipeLeft: () => props.navigable && props.canNext && emit('next'),
  onSwipeRight: () => props.navigable && props.canPrevious && emit('previous'),
})

// Resistance at the ends, so a swipe with nowhere to go feels blocked rather
// than broken.
const offset = computed(() => {
  const raw = dragX.value
  if (raw < 0 && !props.canNext) return raw * 0.18
  if (raw > 0 && !props.canPrevious) return raw * 0.18
  return raw
})

const ACCENT_TEXT: Record<AccentName, string> = {
  mint: 'text-mint-deep dark:text-mint',
  marigold: 'text-marigold-deep dark:text-marigold',
  coral: 'text-coral-deep dark:text-coral',
  grape: 'text-grape-deep dark:text-grape',
  ink: 'text-ink dark:text-paper',
}

function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'Escape':
      emit('close')
      break
    case 'ArrowRight':
      if (props.navigable && props.canNext) emit('next')
      break
    case 'ArrowLeft':
      if (props.navigable && props.canPrevious) emit('previous')
      break
    case ' ':
    case 'Enter':
      event.preventDefault()
      emit('speak')
      break
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  // Move focus into the overlay so keys reach it and a screen reader announces
  // the word rather than leaving the user on the page behind.
  await nextTick()
  container.value?.focus()
})

onUnmounted(() => window.removeEventListener('keydown', onKeydown))

watch(
  () => props.word,
  () => (hintVisible.value = false),
)
</script>

<template>
  <div
    ref="container"
    class="fixed inset-0 z-[120] flex touch-none flex-col bg-paper select-none dark:bg-night"
    role="dialog"
    aria-modal="true"
    aria-label="Focus mode"
    tabindex="-1"
    v-on="listeners"
  >
    <!-- Top bar: kept deliberately sparse. -->
    <div class="flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <span
        v-if="total"
        class="text-sm font-bold tabular-nums opacity-40"
        aria-hidden="true"
      >
        {{ position }} / {{ total }}
      </span>

      <button
        type="button"
        class="chunky-btn ml-auto flex h-12 w-12 items-center justify-center bg-white text-ink shadow-[0_3px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_3px_0_0_rgba(0,0,0,0.5)]"
        aria-label="Leave focus mode"
        @click.stop="emit('close')"
      >
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- The word. Nothing competes with it. -->
    <div class="flex min-h-0 flex-1 items-center justify-center px-4">
      <p
        class="font-[family-name:var(--font-word)] leading-none font-bold break-all text-[clamp(4rem,22vw,16rem)]"
        :class="ACCENT_TEXT[accent]"
        :style="{
          transform: `translateX(${offset}px)`,
          transition: dragX === 0 ? 'transform 0.28s var(--ease-settle)' : 'none',
        }"
      >
        {{ word }}
      </p>
    </div>

    <!-- Bottom bar: real controls, so this works without gestures. -->
    <div
      class="flex items-center justify-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-opacity duration-200"
      :class="controlsClass"
    >
      <button
        v-if="navigable"
        type="button"
        class="chunky-btn flex h-14 w-14 items-center justify-center bg-white text-ink shadow-[0_4px_0_0_rgba(30,42,71,0.15)] disabled:opacity-30 dark:bg-night-card dark:text-paper dark:shadow-[0_4px_0_0_rgba(0,0,0,0.5)]"
        :disabled="!canPrevious"
        aria-label="Previous word"
        @click.stop="emit('previous')"
      >
        <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <button
        type="button"
        class="chunky-btn flex items-center gap-2 bg-grape px-6 py-3.5 text-white shadow-[0_4px_0_0_var(--color-grape-deep)]"
        :aria-label="`Hear the word ${word}`"
        @click.stop="emit('speak')"
      >
        <svg class="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="M16 9a4 4 0 0 1 0 6" />
          <path d="M19 6.5a8 8 0 0 1 0 11" />
        </svg>
        Hear it
      </button>

      <button
        v-if="navigable"
        type="button"
        class="chunky-btn flex h-14 w-14 items-center justify-center bg-white text-ink shadow-[0_4px_0_0_rgba(30,42,71,0.15)] disabled:opacity-30 dark:bg-night-card dark:text-paper dark:shadow-[0_4px_0_0_rgba(0,0,0,0.5)]"
        :disabled="!canNext"
        aria-label="Next word"
        @click.stop="emit('next')"
      >
        <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>

    <!-- Marking controls for modes where a grown-up scores each word. -->
    <div v-if="$slots.actions" class="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <slot name="actions" />
    </div>

    <!-- With the controls hidden, this hint is the only thing telling a parent
         how the screen works, so it stays until the first tap. -->
    <p
      v-if="hintVisible"
      class="pb-6 text-center text-sm opacity-40 transition-opacity duration-500"
    >
      Tap the word to hear it{{ navigable ? ' · swipe to move between words' : '' }}
    </p>
    <div v-else class="pb-6" aria-hidden="true" />
  </div>
</template>
