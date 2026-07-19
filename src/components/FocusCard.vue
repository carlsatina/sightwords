<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSwipe } from '@/composables/useSwipe'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'
import type { AccentName, Card } from '@/types'
import {
  detailKind,
  detailLabelKeys,
  detailSpeakKey,
  spokenDetail,
} from '@/lib/cards'

/**
 * Distraction-free card view. The word or character fills the screen;
 * everything else is either a small control at the edges or invisible.
 *
 * Gestures are an enhancement layered on top of real controls, never the only
 * way through: swiping is unavailable to anyone using a keyboard or a screen
 * reader, so arrow keys and focusable buttons do the same jobs.
 */
const props = withDefaults(
  defineProps<{
    card: Card
    accent?: AccentName
    /** Shows the swipe/keyboard navigation affordances. */
    navigable?: boolean
    /** Reveal the sentence and translation beneath the word. */
    showDetail?: boolean
    /** Whether this device can read the card's language aloud at all. */
    canSpeak?: boolean
    canPrevious?: boolean
    canNext?: boolean
    /** Position within the set, shown as a quiet counter. */
    position?: number
    total?: number
  }>(),
  {
    accent: 'mint',
    navigable: false,
    showDetail: false,
    canSpeak: true,
    canPrevious: false,
    canNext: false,
  },
)

const emit = defineEmits<{
  close: []
  next: []
  previous: []
  speak: []
  speakDetail: []
  toggleDetail: []
}>()

const settings = useSettingsStore()
const { t } = useI18n()

/** The glyph this mode exists to show, whichever kind of card it came from. */
const face = computed(() =>
  props.card.kind === 'kanji' ? props.card.char : props.card.text,
)

const container = ref<HTMLElement | null>(null)
/** The tap hint earns its place only until the parent has tapped once. */
const hintVisible = ref(true)

const controlsVisible = computed(() => settings.settings.showFocusControls)

/**
 * English gets the bare screen: the word, and nothing else.
 *
 * The reveal earns its place in Filipino and Japanese because it carries a
 * translation or a reading — a comprehension aid for a language the child is
 * still acquiring. An English sentence under an English word is not that; it
 * is just more text competing with the one thing this mode exists to show.
 * Tap still speaks and swipe still moves, so nothing is actually lost.
 */
const minimal = computed(() => props.card.language === 'en')

/**
 * What this card reveals, and what to call it. A kanji reveals readings and a
 * meaning, a kana reveals an example word, everything else a sentence — all
 * behind one button, so the label has to follow the card rather than assume.
 */
const kind = computed(() => detailKind(props.card))
const hasDetail = computed(() => !minimal.value && kind.value !== null)

/**
 * Whether to draw the previous/next buttons. Swiping and the arrow keys stay
 * live regardless — this only decides whether the buttons are on screen.
 */
const showNavButtons = computed(() => props.navigable && !minimal.value)

const toggleLabelKey = computed(() => {
  if (!kind.value) return 'session.showSentence'
  const keys = detailLabelKeys(kind.value)
  return props.showDetail ? keys.hide : keys.show
})

const speakDetailKey = computed(() =>
  kind.value ? detailSpeakKey(kind.value) : 'speak.hearSentence',
)

/** Null when the reveal holds nothing that reads as a single utterance. */
const detailSpeech = computed(() => spokenDetail(props.card))

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
      event.preventDefault()
      emit('speak')
      break
    // Keyboard parity for the reveal button, so the translation is not a
    // pointer-only affordance. Silent where there is nothing to reveal.
    case 'Enter':
      if (!hasDetail.value) break
      event.preventDefault()
      emit('toggleDetail')
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
  () => props.card.id,
  () => (hintVisible.value = false),
)
</script>

<template>
  <div
    ref="container"
    class="fixed inset-0 z-[120] flex touch-none flex-col bg-paper select-none dark:bg-night"
    role="dialog"
    aria-modal="true"
        :aria-label="t('session.focusLabel')"
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
        class="chunky-btn relative z-10 ml-auto flex h-10 w-10 items-center justify-center bg-white text-ink shadow-[0_3px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_3px_0_0_rgba(0,0,0,0.5)]"
        :aria-label="t('session.leaveFocus')"
        @click.stop="emit('close')"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- The word. Nothing competes with it.

         The size is bounded by height as well as width: `22vw` alone ignores
         the viewport's height, so a landscape phone sized the word off the
         bottom of its own row and straight over the sentence below. -->
    <div class="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4">
      <p
        class="font-[family-name:var(--font-word)] leading-none font-bold text-[clamp(2.5rem,min(22vw,38vh),16rem)]"
        :class="[ACCENT_TEXT[accent], card.language === 'ja' ? 'break-normal' : 'break-all']"
        :lang="card.language"
        :style="{
          transform: `translateX(${offset}px)`,
          transition: dragX === 0 ? 'transform 0.28s var(--ease-settle)' : 'none',
        }"
      >
        {{ face }}
      </p>
    </div>

    <!-- Sentence and translation, revealed by a double tap. Kept out of the
         flex-1 region above so revealing it never resizes the word itself. -->
    <Transition
      enter-active-class="transition duration-200 ease-[var(--ease-settle)]"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="hasDetail && showDetail && card.kind === 'word'"
        class="relative z-10 flex max-h-[38vh] shrink-0 flex-col items-center gap-1 overflow-y-auto px-6 pb-3 text-center"
      >
        <div class="flex items-center justify-center gap-2">
          <p
            v-if="card.sentence"
            :lang="card.language"
            class="font-[family-name:var(--font-word)] text-lg opacity-70 [@media(min-height:560px)]:text-2xl"
          >
            {{ card.sentence }}
          </p>
          <button
            v-if="canSpeak && detailSpeech"
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink transition hover:bg-ink/10 dark:bg-white/10 dark:text-paper"
            :aria-label="t(speakDetailKey)"
            @click.stop="emit('speakDetail')"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              <path d="M16 9a4 4 0 0 1 0 6" />
            </svg>
          </button>
        </div>
        <p
          v-if="card.sentenceMeaning"
          lang="en"
          class="text-sm opacity-45 [@media(min-height:560px)]:text-lg"
        >
          {{ card.sentenceMeaning }}
        </p>
        <p v-if="card.meaning" lang="en" class="text-sm font-semibold opacity-40">
          {{ card.meaning }}
        </p>
      </div>

      <!-- Kanji reveal: readings and gloss. Without this the whole point of a
           kanji card was unreachable from big word mode. -->
      <div
        v-else-if="hasDetail && showDetail && card.kind === 'kanji'"
        class="relative z-10 flex max-h-[38vh] shrink-0 flex-col items-center gap-1 overflow-y-auto px-6 pb-3 text-center"
      >
        <dl class="flex flex-wrap items-baseline justify-center gap-x-4">
          <div v-if="card.on.length" class="flex items-baseline gap-1.5">
            <dt class="text-xs font-semibold tracking-wide uppercase opacity-40">on</dt>
            <dd lang="ja" class="text-lg opacity-70">{{ card.on.join('・') }}</dd>
          </div>
          <div v-if="card.kun.length" class="flex items-baseline gap-1.5">
            <dt class="text-xs font-semibold tracking-wide uppercase opacity-40">kun</dt>
            <dd lang="ja" class="text-lg opacity-70">{{ card.kun.join('・') }}</dd>
          </div>
        </dl>

        <p class="text-lg font-semibold opacity-75 [@media(min-height:560px)]:text-xl">
          {{ card.meaning }}
        </p>

        <div v-if="card.example" class="flex items-center justify-center gap-2">
          <p class="text-base opacity-50">
            <span lang="ja">{{ card.example.text }}</span>
            <span lang="ja" class="opacity-70">（{{ card.example.reading }}）</span>
            <span>— {{ card.example.meaning }}</span>
          </p>
          <button
            v-if="canSpeak"
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink transition hover:bg-ink/10 dark:bg-white/10 dark:text-paper"
            :aria-label="t(speakDetailKey)"
            @click.stop="emit('speakDetail')"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              <path d="M16 9a4 4 0 0 1 0 6" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Bottom bar: real controls, so this works without gestures. -->
    <div
      class="relative z-10 flex shrink-0 items-center justify-center gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-opacity duration-200"
      :class="controlsClass"
    >
      <button
        v-if="showNavButtons"
        type="button"
        class="chunky-btn flex h-11 w-11 items-center justify-center bg-white text-ink shadow-[0_3px_0_0_rgba(30,42,71,0.15)] disabled:opacity-30 dark:bg-night-card dark:text-paper dark:shadow-[0_3px_0_0_rgba(0,0,0,0.5)]"
        :disabled="!canPrevious"
        :aria-label="t('session.previousCard')"
        @click.stop="emit('previous')"
      >
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <button
        v-if="canSpeak"
        type="button"
        class="chunky-btn flex items-center gap-2 bg-grape px-4 py-2.5 text-sm text-white shadow-[0_3px_0_0_var(--color-grape-deep)]"
        :aria-label="t('speak.hearWord', { word: face })"
        @click.stop="emit('speak')"
      >
        <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="M16 9a4 4 0 0 1 0 6" />
          <path d="M19 6.5a8 8 0 0 1 0 11" />
        </svg>
        {{ t('speak.hearIt') }}
      </button>

      <!-- Deliberately quieter than Hear it: revealing the sentence is the
           fallback for a child who is stuck, not the first thing to reach for. -->
      <button
        v-if="hasDetail"
        type="button"
        class="chunky-btn flex items-center gap-2 bg-white px-4 py-2.5 text-ink shadow-[0_3px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_3px_0_0_rgba(0,0,0,0.5)]"
        :aria-pressed="showDetail"
        @click.stop="emit('toggleDetail')"
      >
        <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 6h16M4 12h10M4 18h7" />
        </svg>
        <span class="text-sm font-bold">{{ t(toggleLabelKey) }}</span>
      </button>

      <button
        v-if="showNavButtons"
        type="button"
        class="chunky-btn flex h-11 w-11 items-center justify-center bg-white text-ink shadow-[0_3px_0_0_rgba(30,42,71,0.15)] disabled:opacity-30 dark:bg-night-card dark:text-paper dark:shadow-[0_3px_0_0_rgba(0,0,0,0.5)]"
        :disabled="!canNext"
        :aria-label="t('session.nextCard')"
        @click.stop="emit('next')"
      >
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>

    <!-- Marking controls for modes where a grown-up scores each card. -->
    <div v-if="$slots.actions" class="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <slot name="actions" />
    </div>

    <!-- With the controls hidden, this hint is the only thing telling a parent
         how the screen works, so it stays until the first tap. -->
    <p
      v-if="hintVisible"
      class="hidden shrink-0 pb-4 text-center text-sm opacity-40 transition-opacity duration-500 [@media(min-height:560px)]:block"
    >
      {{ navigable ? t('session.tapHintSwipe') : t('session.tapHint') }}
    </p>
    <div v-else class="shrink-0 pb-4" aria-hidden="true" />
  </div>
</template>
