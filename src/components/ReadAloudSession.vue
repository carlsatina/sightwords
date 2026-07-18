<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { AccentName, PracticeMode, SightWord } from '@/types'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'
import { useSpeech } from '@/composables/useSpeech'
import { useConfetti } from '@/composables/useConfetti'
import { useFullscreen } from '@/composables/useFullscreen'
import WordCard from '@/components/WordCard.vue'
import FocusCard from '@/components/FocusCard.vue'
import AppButton from '@/components/AppButton.vue'
import SpeakButton from '@/components/SpeakButton.vue'
import ProgressBar from '@/components/ProgressBar.vue'

/**
 * The shared "child reads aloud, grown-up marks it" flow, used by Practice,
 * Review, and Daily. The child never self-marks — the two buttons are sized
 * and worded for the adult holding the device.
 */
const props = withDefaults(
  defineProps<{
    words: SightWord[]
    mode: PracticeMode
    accent?: AccentName
    title: string
    /** Shown on the results screen once every word has been marked. */
    finishLabel?: string
  }>(),
  { accent: 'mint', finishLabel: 'Done' },
)

const emit = defineEmits<{ finished: [correct: number, total: number] }>()

const progress = useProgressStore()
const settings = useSettingsStore()
const { speak } = useSpeech()
const { burst } = useConfetti()
const focus = useFullscreen()

function speakCurrent() {
  if (current.value) speak(current.value.text)
}

const index = ref(0)
const correctCount = ref(0)
const missedWords = ref<SightWord[]>([])
const showSentence = ref(false)
const finished = ref(false)
/** Brief visual acknowledgement of the last mark, cleared on the next word. */
const lastMark = ref<'correct' | 'retry' | null>(null)

const current = computed<SightWord | undefined>(() => props.words[index.value])
const total = computed(() => props.words.length)

/**
 * Speaks the word only when the parent has opted into automatic audio. Off by
 * default here especially: this mode asks the child to read the word aloud, so
 * speaking it first hands them the answer. "Hear it" stays available as a hint.
 */
function maybeSpeak() {
  if (!settings.settings.autoSpeak) return
  if (current.value && settings.settings.speechEnabled) speak(current.value.text)
}

onMounted(maybeSpeak)
watch(index, () => {
  showSentence.value = false
  maybeSpeak()
})

function mark(correct: boolean) {
  const word = current.value
  if (!word || finished.value) return

  progress.recordAnswer(word.id, correct, props.mode)
  if (correct) correctCount.value++
  else missedWords.value.push(word)

  lastMark.value = correct ? 'correct' : 'retry'
  setTimeout(() => (lastMark.value = null), 450)

  if (index.value >= total.value - 1) {
    finished.value = true
    // The results screen has nothing to do with focus mode, so step out of it.
    if (focus.active.value) focus.exit()
    // Celebrate only a clean run; confetti for every session makes it noise.
    if (correctCount.value === total.value) burst(120)
    emit('finished', correctCount.value, total.value)
  } else {
    index.value++
  }
}

function restart() {
  index.value = 0
  correctCount.value = 0
  missedWords.value = []
  finished.value = false
  showSentence.value = false
  maybeSpeak()
}

const scorePercent = computed(() =>
  total.value === 0 ? 0 : Math.round((correctCount.value / total.value) * 100),
)

const summary = computed(() => {
  if (scorePercent.value === 100) return 'Every word, first try.'
  if (scorePercent.value >= 70) return 'Strong reading today.'
  if (scorePercent.value >= 40) return 'Good effort — a few to practise again.'
  return 'These words need more practice. Try them again tomorrow.'
})
</script>

<template>
  <div class="pt-6">
    <template v-if="!finished && current">
      <div class="mb-6">
        <ProgressBar
          :value="index + 1"
          :max="total"
          :accent="accent"
          :label="`${title} · word ${index + 1} of ${total}`"
          :show-percent="false"
        />
      </div>

      <Transition
        mode="out-in"
        enter-active-class="transition duration-300 ease-[var(--ease-settle)]"
        enter-from-class="opacity-0 translate-y-4 scale-95"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0 -translate-y-3 scale-95"
      >
        <div :key="current.id" class="relative">
          <WordCard
            :word="current.text"
            :sentence="current.sentence"
            :accent="accent"
            :show-sentence="showSentence"
            :stack-depth="Math.min(2, total - index - 1)"
          />
          <!-- The mark flash sits over the card so the adult's tap gets a
               visible receipt without moving the child's eye off the word. -->
          <Transition
            enter-active-class="transition duration-150"
            enter-from-class="opacity-0 scale-50"
            leave-active-class="transition duration-300"
            leave-to-class="opacity-0 scale-125"
          >
            <div
              v-if="lastMark"
              class="pointer-events-none absolute inset-0 flex items-center justify-center text-[10rem]"
              aria-hidden="true"
            >
              {{ lastMark === 'correct' ? '⭐️' : '💪' }}
            </div>
          </Transition>
        </div>
      </Transition>

      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <SpeakButton :text="current.text" />
        <button
          type="button"
          class="chunky-btn bg-white px-5 py-2.5 text-ink shadow-[0_4px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_4px_0_0_rgba(0,0,0,0.5)]"
          @click="showSentence = !showSentence"
        >
          {{ showSentence ? 'Hide sentence' : 'Show sentence' }}
        </button>
        <button
          type="button"
          class="chunky-btn flex items-center gap-2 bg-white px-5 py-2.5 text-ink shadow-[0_4px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_4px_0_0_rgba(0,0,0,0.5)]"
          @click="focus.enter()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
          Big word mode
        </button>
      </div>

      <p class="mt-8 mb-3 text-center text-sm font-bold tracking-[0.18em] uppercase opacity-45">
        Grown-up: did they read it?
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        <AppButton variant="success" size="lg" block @click="mark(true)">
          ✓ Correct
        </AppButton>
        <AppButton variant="danger" size="lg" block @click="mark(false)">
          ↻ Try again
        </AppButton>
      </div>

      <!-- Marking is what advances a card here, so focus mode keeps the two
           buttons rather than offering a swipe that would skip the score. -->
      <FocusCard
        v-if="focus.active.value"
        :word="current.text"
        :accent="accent"
        :position="index + 1"
        :total="total"
        @close="focus.exit()"
        @speak="speakCurrent"
      >
        <template #actions>
          <div class="grid gap-3 sm:grid-cols-2">
            <AppButton variant="success" size="lg" block @click="mark(true)">
              ✓ Correct
            </AppButton>
            <AppButton variant="danger" size="lg" block @click="mark(false)">
              ↻ Try again
            </AppButton>
          </div>
        </template>
      </FocusCard>
    </template>

    <!-- Results ------------------------------------------------------------->
    <template v-else-if="finished">
      <div class="deck-card mx-auto max-w-2xl p-8 text-center">
        <p class="text-7xl" aria-hidden="true">
          {{ scorePercent === 100 ? '🎉' : scorePercent >= 70 ? '🌟' : '💪' }}
        </p>
        <p class="mt-3 text-sm font-bold tracking-[0.2em] uppercase opacity-50">
          {{ title }} complete
        </p>
        <p class="my-2 font-[family-name:var(--font-word)] text-6xl font-bold">
          {{ correctCount }} / {{ total }}
        </p>
        <p class="text-lg opacity-70">{{ summary }}</p>

        <div class="mx-auto mt-6 max-w-sm">
          <ProgressBar :value="scorePercent" :accent="accent" :show-percent="false" />
        </div>

        <div v-if="missedWords.length" class="mt-8 text-left">
          <p class="mb-2 text-sm font-bold tracking-wider uppercase opacity-50">
            Practise these again
          </p>
          <ul class="flex flex-wrap gap-2">
            <li
              v-for="word in missedWords"
              :key="word.id"
              class="rounded-2xl bg-coral/20 px-4 py-2 font-[family-name:var(--font-word)] text-xl font-bold"
            >
              {{ word.text }}
            </li>
          </ul>
        </div>

        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <AppButton variant="ghost" @click="restart">Go again</AppButton>
          <slot name="finish-action">
            <AppButton variant="primary" :to="{ name: 'home' }">
              {{ finishLabel }}
            </AppButton>
          </slot>
        </div>
      </div>
    </template>
  </div>
</template>
