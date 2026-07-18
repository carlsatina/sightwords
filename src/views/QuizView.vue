<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useWordsStore } from '@/stores/words'
import { sample, shuffle } from '@/lib/random'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'
import { useSpeech } from '@/composables/useSpeech'
import { useConfetti } from '@/composables/useConfetti'
import AppButton from '@/components/AppButton.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import type { LevelId, SightWord } from '@/types'

const props = defineProps<{ levelId: string }>()

const library = useWordsStore()
const progress = useProgressStore()
const settings = useSettingsStore()
const { speak, supported } = useSpeech()
const { burst } = useConfetti()

const QUESTION_COUNT = 10
const CHOICES = 4

const level = computed(() => library.getLevel(Number(props.levelId) as LevelId))

interface Question {
  answer: SightWord
  choices: SightWord[]
}

const questions = ref<Question[]>([])
const index = ref(0)
const selectedId = ref<string | null>(null)
const correctCount = ref(0)
const finished = ref(false)

/**
 * Distractors come from the same level first — words of similar length and
 * familiarity make a real discrimination test. Falling back to the full list
 * only matters for levels smaller than the choice count.
 */
function buildQuestions(): Question[] {
  const levelWords = level.value?.words ?? []
  if (levelWords.length === 0) return []

  const asked = sample(levelWords, Math.min(QUESTION_COUNT, levelWords.length))

  return asked.map((answer) => {
    const sameLevel = levelWords.filter((w) => w.id !== answer.id)
    let distractors = sample(sameLevel, CHOICES - 1)

    if (distractors.length < CHOICES - 1) {
      const elsewhere = library.allWords.filter(
        (w) => w.id !== answer.id && !distractors.some((d) => d.id === w.id),
      )
      distractors = [
        ...distractors,
        ...sample(elsewhere, CHOICES - 1 - distractors.length),
      ]
    }

    return { answer, choices: shuffle([answer, ...distractors]) }
  })
}

const current = computed(() => questions.value[index.value])
const answered = computed(() => selectedId.value !== null)
const isRight = computed(
  () => answered.value && selectedId.value === current.value?.answer.id,
)

function askCurrent() {
  if (current.value && settings.settings.speechEnabled) speak(current.value.answer.text)
}

function start() {
  questions.value = buildQuestions()
  index.value = 0
  selectedId.value = null
  correctCount.value = 0
  finished.value = false
  askCurrent()
}

onMounted(start)
watch(index, askCurrent)

function choose(word: SightWord) {
  if (answered.value || !current.value) return

  selectedId.value = word.id
  const correct = word.id === current.value.answer.id
  if (correct) correctCount.value++
  progress.recordAnswer(current.value.answer.id, correct, 'quiz')

  // Hold the result on screen so the child connects the choice to the outcome.
  setTimeout(advance, correct ? 900 : 1600)
}

function advance() {
  if (index.value >= questions.value.length - 1) {
    finished.value = true
    progress.recordQuizResult(correctCount.value, questions.value.length)
    if (correctCount.value === questions.value.length) burst(120)
  } else {
    index.value++
    selectedId.value = null
  }
}

function choiceClass(word: SightWord) {
  if (!answered.value) {
    return 'bg-white dark:bg-night-card shadow-[0_5px_0_0_rgba(30,42,71,0.15)] dark:shadow-[0_5px_0_0_rgba(0,0,0,0.5)] hover:-translate-y-1'
  }
  if (word.id === current.value?.answer.id) {
    return 'bg-mint text-white shadow-[0_5px_0_0_var(--color-mint-deep)]'
  }
  if (word.id === selectedId.value) {
    return 'bg-coral text-white shadow-[0_5px_0_0_var(--color-coral-deep)]'
  }
  return 'bg-white dark:bg-night-card opacity-40'
}

const scorePercent = computed(() =>
  questions.value.length === 0
    ? 0
    : Math.round((correctCount.value / questions.value.length) * 100),
)
</script>

<template>
  <div v-if="level" class="pt-6">
    <template v-if="!finished && current">
      <div class="mb-6">
        <ProgressBar
          :value="index + 1"
          :max="questions.length"
          :accent="level.accent"
          :label="`Question ${index + 1} of ${questions.length}`"
          :show-percent="false"
        />
      </div>

      <div class="deck-card mb-6 p-6 text-center sm:p-8">
        <p class="text-sm font-bold tracking-[0.2em] uppercase opacity-50">
          Find this word
        </p>

        <!-- With speech available the word is spoken, not shown — otherwise the
             question answers itself. Without speech we show the sentence with
             the word blanked out, which tests the same recognition. -->
        <template v-if="supported && settings.settings.speechEnabled">
          <button
            type="button"
            class="chunky-btn mx-auto mt-4 flex items-center gap-3 bg-grape px-7 py-4 text-xl text-white shadow-[0_5px_0_0_var(--color-grape-deep)]"
            @click="speak(current.answer.text)"
          >
            <span aria-hidden="true">🔊</span> Hear it again
          </button>
        </template>
        <template v-else>
          <p class="mt-4 font-[family-name:var(--font-word)] text-3xl leading-snug sm:text-4xl">
            {{ current.answer.sentence.replace(new RegExp(`\\b${current.answer.text}\\b`, 'i'), '____') }}
          </p>
        </template>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          v-for="choice in current.choices"
          :key="choice.id"
          type="button"
          class="chunky-btn px-4 py-6 font-[family-name:var(--font-word)] text-3xl font-bold break-all sm:text-4xl"
          :class="choiceClass(choice)"
          :disabled="answered"
          @click="choose(choice)"
        >
          {{ choice.text }}
        </button>
      </div>

      <p
        v-if="answered"
        class="mt-6 text-center text-2xl font-extrabold"
        role="status"
        aria-live="polite"
      >
        {{ isRight ? '⭐️ That’s right!' : `The word was “${current.answer.text}”` }}
      </p>
    </template>

    <div v-else-if="finished" class="deck-card mx-auto max-w-2xl p-8 text-center">
      <p class="text-7xl" aria-hidden="true">
        {{ scorePercent === 100 ? '🎉' : scorePercent >= 70 ? '🌟' : '💪' }}
      </p>
      <p class="mt-3 text-sm font-bold tracking-[0.2em] uppercase opacity-50">
        Quiz complete
      </p>
      <p class="my-2 font-[family-name:var(--font-word)] text-6xl font-bold">
        {{ correctCount }} / {{ questions.length }}
      </p>
      <p class="text-lg opacity-70">
        {{
          scorePercent === 100
            ? 'A perfect score.'
            : scorePercent >= 70
              ? 'Nicely done.'
              : 'Keep practising — these words are close.'
        }}
      </p>

      <div class="mx-auto mt-6 max-w-sm">
        <ProgressBar :value="scorePercent" :accent="level.accent" :show-percent="false" />
      </div>

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <AppButton variant="ghost" @click="start">Play again</AppButton>
        <AppButton variant="primary" :to="{ name: 'level', params: { levelId: level.id } }">
          Back to level
        </AppButton>
      </div>
    </div>
  </div>
</template>
