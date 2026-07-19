<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCardsStore } from '@/stores/cards'
import { useSettingsStore } from '@/stores/settings'
import { useProgressStore } from '@/stores/progress'
import { useSpeech } from '@/composables/useSpeech'
import AppButton from '@/components/AppButton.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import type { Language, LanguageCode, LevelId } from '@/types'

const library = useCardsStore()
const settings = useSettingsStore()
const progress = useProgressStore()
const {
  voices,
  supported: speechSupported,
  speak,
  voicesFor,
  hasVoiceFor,
  voiceStatusFor,
  substituteLangFor,
} = useSpeech()
const { t } = useI18n()

const confirmingReset = ref(false)

/** The language whose levels and words this page is currently editing. */
const active = computed(() => library.language)

/**
 * Toggling starts from the effective list, not the stored one. Stored is
 * `undefined` until the parent touches a language, which means "all unlocked";
 * reading it directly would treat the first click as unlocking from empty and
 * silently lock every other level.
 */
function toggleLevel(id: LevelId) {
  const code = active.value.code
  const current = active.value.levels
    .map((level) => level.id)
    .filter((levelId) => settings.isLevelUnlocked(levelId, code))

  const next = current.includes(id)
    ? current.filter((levelId) => levelId !== id)
    : [...current, id]

  settings.setUnlockedLevels(next, code)
}

function confirmReset() {
  progress.resetAll()
  confirmingReset.value = false
}

const recentActivity = computed(() =>
  progress.state.recentAnswers.slice(0, 12).map((answer) => {
    const card = library.getCard(answer.cardId)
    return {
      ...answer,
      text: card ? (card.kind === 'kanji' ? card.char : card.text) : answer.cardId,
      language: card?.language ?? 'en',
      when: new Date(answer.at).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    }
  }),
)

/**
 * A sample sentence in each language, so pressing a voice actually
 * demonstrates that voice rather than reading English at a Japanese engine.
 */
const VOICE_SAMPLES: Record<LanguageCode, string> = {
  en: 'The cat is here.',
  fil: 'Ang pusa ay nandito.',
  ja: 'ねこがいます。',
}

/** Picking a voice plays it straight away — you judge a voice by hearing it. */
function chooseVoice(code: LanguageCode, voiceURI: string) {
  settings.setVoiceFor(code, voiceURI || null)
  speak(VOICE_SAMPLES[code], { lang: languageByCode(code)?.speechLang })
}

function languageByCode(code: LanguageCode): Language | undefined {
  return library.languages.find((l) => l.code === code)
}

function sortedVoicesFor(language: Language) {
  // When a stand-in is doing the reading, the picker has to offer the
  // stand-in's voices — listing the missing language's (none) would show an
  // empty dropdown beside audio that demonstrably works.
  const tags =
    voiceStatusFor(language.code) === 'substitute'
      ? (language.fallbackSpeechLangs ?? [])
      : [language.speechLang]

  const seen = new Set<string>()
  return tags
    .flatMap((tag) => voicesFor(tag))
    .filter((v) => !seen.has(v.voiceURI) && seen.add(v.voiceURI))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** A human name for the language standing in, e.g. "Spanish". */
function substituteName(code: LanguageCode): string {
  const tag = substituteLangFor(code)
  if (!tag) return ''
  const primary = tag.split('-')[0]
  try {
    return new Intl.DisplayNames([settings.settings.uiLocale], { type: 'language' }).of(
      primary,
    ) ?? primary
  } catch {
    return primary
  }
}
</script>

<template>
  <div class="pt-6">
    <h1 class="mb-6 text-4xl font-extrabold">{{ t('parent.title') }}</h1>

    <!-- Overview -->
    <section class="deck-card mb-5 p-5">
      <h2 class="mb-4 text-xl font-extrabold">{{ t('parent.progress') }}</h2>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p class="text-3xl font-extrabold tabular-nums">
            {{ progress.masteredCount }}
          </p>
          <p class="text-xs font-semibold opacity-55">{{ t('parent.statMastered') }}</p>
        </div>
        <div>
          <p class="text-3xl font-extrabold tabular-nums">{{ progress.accuracy }}%</p>
          <p class="text-xs font-semibold opacity-55">{{ t('parent.statAccuracy') }}</p>
        </div>
        <div>
          <p class="text-3xl font-extrabold tabular-nums">
            {{ progress.state.currentStreak }}
          </p>
          <p class="text-xs font-semibold opacity-55">{{ t('parent.statStreak') }}</p>
        </div>
        <div>
          <p class="text-3xl font-extrabold tabular-nums">
            {{ progress.state.dailyCompletions }}
          </p>
          <p class="text-xs font-semibold opacity-55">{{ t('parent.statDailies') }}</p>
        </div>
      </div>

      <div class="mt-6 space-y-3">
        <ProgressBar
          v-for="level in library.levels"
          :key="level.id"
          :value="progress.masteredByLevel[level.id] ?? 0"
          :max="level.cards.length"
          :accent="level.accent"
          :label="level.name"
        />
      </div>
    </section>

    <!-- Languages -->
    <section class="deck-card mb-5 p-5">
      <h2 class="mb-3 text-xl font-extrabold">{{ t('parent.languageSection') }}</h2>

      <label class="block">
        <span class="mb-1 block text-sm font-semibold opacity-70">
          {{ t('parent.practiceLanguage') }}
        </span>
        <select
          class="w-full rounded-2xl bg-ink/5 p-3 font-semibold dark:bg-white/10"
          :value="settings.settings.language"
          @change="
            settings.setLanguage(
              ($event.target as HTMLSelectElement).value as LanguageCode,
            )
          "
        >
          <option v-for="l in library.languages" :key="l.code" :value="l.code">
            {{ l.name }} — {{ l.endonym }}
          </option>
        </select>
        <span class="mt-1 block text-xs opacity-55">
          {{ t('parent.practiceLanguageBlurb') }}
        </span>
      </label>

      <label class="mt-4 block">
        <span class="mb-1 block text-sm font-semibold opacity-70">
          {{ t('parent.uiLanguage') }}
        </span>
        <select
          class="w-full rounded-2xl bg-ink/5 p-3 font-semibold dark:bg-white/10"
          :value="settings.settings.uiLocale"
          @change="
            settings.setUiLocale(
              ($event.target as HTMLSelectElement).value as LanguageCode,
            )
          "
        >
          <option v-for="l in library.languages" :key="l.code" :value="l.code">
            {{ l.name }} — {{ l.endonym }}
          </option>
        </select>
        <span class="mt-1 block text-xs opacity-55">
          {{ t('parent.uiLanguageBlurb') }}
        </span>
      </label>
    </section>

    <!-- Words -->
    <section class="deck-card mb-5 p-5">
      <h2 class="text-xl font-extrabold">{{ t('parent.wordsSection') }}</h2>
      <p class="mb-1 text-sm opacity-60">
        {{
          t('parent.wordsSummary', {
            count: library.allCards.length,
            levels: library.levels.length,
            language: active.name,
          })
        }}
      </p>
      <p v-if="library.isCustomised" class="mb-3 text-sm font-semibold opacity-60">
        {{ t('parent.wordsCustomised') }}
      </p>
      <AppButton variant="quiet" size="sm" :to="{ name: 'words' }">
        {{ t('parent.manageWords') }}
      </AppButton>
    </section>

    <!-- Levels -->
    <section class="deck-card mb-5 p-5">
      <h2 class="text-xl font-extrabold">
        {{ t('parent.levelsSection', { language: active.name }) }}
      </h2>
      <p class="mb-4 text-sm opacity-60">{{ t('parent.levelsBlurb') }}</p>
      <div class="space-y-2">
        <label
          v-for="level in library.levels"
          :key="level.id"
          class="flex cursor-pointer items-center gap-3 rounded-2xl bg-ink/5 p-3 dark:bg-white/5"
        >
          <input
            type="checkbox"
            class="h-6 w-6 accent-[var(--color-grape)]"
            :checked="settings.isLevelUnlocked(level.id, active.code)"
            @change="toggleLevel(level.id)"
          />
          <span>
            <span class="block font-bold" :lang="active.code">{{ level.name }}</span>
            <span class="block text-xs opacity-55">
              {{
                t('parent.levelMeta', {
                  ageRange: level.ageRange,
                  count: level.cards.length,
                })
              }}
            </span>
          </span>
        </label>
      </div>
    </section>

    <!-- Daily goal -->
    <section class="deck-card mb-5 p-5">
      <h2 class="text-xl font-extrabold">{{ t('parent.dailySection') }}</h2>
      <p class="mb-4 text-sm opacity-60">{{ t('parent.dailyBlurb') }}</p>
      <label class="flex items-center gap-4">
        <input
          type="range"
          min="5"
          max="20"
          step="1"
          class="w-full accent-[var(--color-grape)]"
          :value="settings.settings.dailyGoal"
          :aria-label="t('parent.dailySection')"
          @input="
            settings.update(
              'dailyGoal',
              Number(($event.target as HTMLInputElement).value),
            )
          "
        />
        <span class="w-16 text-right text-2xl font-extrabold tabular-nums">
          {{ settings.settings.dailyGoal }}
        </span>
      </label>
    </section>

    <!-- Speech -->
    <section class="deck-card mb-5 p-5">
      <h2 class="text-xl font-extrabold">{{ t('parent.speechSection') }}</h2>
      <p v-if="!speechSupported" class="mt-2 text-sm opacity-60">
        {{ t('parent.speechUnsupported') }}
      </p>

      <template v-else>
        <label class="mt-3 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            class="h-6 w-6 accent-[var(--color-grape)]"
            :checked="settings.settings.speechEnabled"
            @change="
              settings.update(
                'speechEnabled',
                ($event.target as HTMLInputElement).checked,
              )
            "
          />
          <span class="font-bold">{{ t('parent.speechEnabled') }}</span>
        </label>

        <template v-if="settings.settings.speechEnabled">
          <label class="mt-3 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              class="h-6 w-6 accent-[var(--color-grape)]"
              :checked="settings.settings.autoSpeak"
              @change="
                settings.update(
                  'autoSpeak',
                  ($event.target as HTMLInputElement).checked,
                )
              "
            />
            <span>
              <span class="block font-bold">{{ t('parent.autoSpeak') }}</span>
              <span class="block text-xs opacity-55">
                {{ t('parent.autoSpeakBlurb') }}
              </span>
            </span>
          </label>

          <label class="mt-5 block">
            <span class="mb-1 block text-sm font-semibold opacity-70">
              {{
                t('parent.speechRate', {
                  rate: settings.settings.speechRate.toFixed(2),
                })
              }}
            </span>
            <input
              type="range"
              min="0.5"
              max="1.2"
              step="0.05"
              class="w-full accent-[var(--color-grape)]"
              :value="settings.settings.speechRate"
              @input="
                settings.update(
                  'speechRate',
                  Number(($event.target as HTMLInputElement).value),
                )
              "
            />
          </label>

          <!-- One picker per language rather than one global list: the whole
               point is that each language gets a voice that can read it. -->
          <div class="mt-5">
            <h3 class="text-sm font-bold">{{ t('parent.voiceSection') }}</h3>
            <p class="mt-1 mb-3 text-xs opacity-55">{{ t('parent.voiceBlurb') }}</p>

            <label
              v-for="l in library.languages"
              :key="l.code"
              class="mt-3 block first:mt-0"
            >
              <span class="mb-1 block text-sm font-semibold opacity-70">
                {{ l.name }}
              </span>
              <select
                class="w-full rounded-2xl bg-ink/5 p-3 font-semibold disabled:opacity-50 dark:bg-white/10"
                :value="settings.voiceFor(l.code) ?? ''"
                :disabled="!hasVoiceFor(l.speechLang)"
                @change="
                  chooseVoice(l.code, ($event.target as HTMLSelectElement).value)
                "
              >
                <option value="">{{ t('parent.voiceDefault') }}</option>
                <option
                  v-for="voice in sortedVoicesFor(l)"
                  :key="voice.voiceURI"
                  :value="voice.voiceURI"
                >
                  {{ voice.name }} ({{ voice.lang }})
                </option>
              </select>

              <!-- Named plainly rather than left as an empty dropdown. A
                   missing Filipino voice is the expected case on most
                   desktops, and a parent should know both that a stand-in is
                   reading and where it will be wrong. -->
              <span
                v-if="voiceStatusFor(l.code) === 'substitute'"
                class="mt-1 block text-xs font-semibold text-marigold-deep dark:text-marigold"
              >
                {{
                  t('parent.voiceSubstitute', {
                    language: l.name,
                    substitute: substituteName(l.code),
                  })
                }}
              </span>
              <span
                v-else-if="!hasVoiceFor(l.speechLang)"
                class="mt-1 block text-xs font-semibold text-coral-deep dark:text-coral"
              >
                {{ t('parent.voiceMissing', { language: l.name }) }}
              </span>
            </label>

            <p v-if="voices.length === 0" class="mt-3 text-xs opacity-55">
              {{ t('parent.voiceSearching') }}
            </p>
            <p v-else class="mt-3 text-xs opacity-55">
              {{ t('parent.voiceCount', { count: voices.length }) }}
            </p>
          </div>

          <AppButton
            v-if="hasVoiceFor(active.speechLang)"
            class="mt-4"
            variant="ghost"
            size="sm"
            @click="speak(VOICE_SAMPLES[active.code], { lang: active.speechLang })"
          >
            {{ t('parent.testVoice') }}
          </AppButton>
        </template>
      </template>
    </section>

    <!-- Display -->
    <section class="deck-card mb-5 p-5">
      <h2 class="mb-3 text-xl font-extrabold">{{ t('parent.displaySection') }}</h2>

      <span class="mb-1 block text-sm font-semibold opacity-70">
        {{ t('parent.theme') }}
      </span>
      <div class="mb-5 flex gap-2">
        <button
          v-for="mode in (['light', 'dark', 'system'] as const)"
          :key="mode"
          type="button"
          class="chunky-btn flex-1 px-3 py-2.5 text-sm capitalize"
          :class="
            settings.settings.darkMode === mode
              ? 'bg-grape text-white shadow-[0_4px_0_0_var(--color-grape-deep)]'
              : 'bg-ink/5 dark:bg-white/10'
          "
          @click="settings.setDarkMode(mode)"
        >
          {{
            mode === 'light'
              ? t('parent.themeLight')
              : mode === 'dark'
                ? t('parent.themeDark')
                : t('parent.themeSystem')
          }}
        </button>
      </div>

      <label class="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          class="h-6 w-6 accent-[var(--color-grape)]"
          :checked="settings.settings.confettiEnabled"
          @change="
            settings.update(
              'confettiEnabled',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        <span class="font-bold">{{ t('parent.confetti') }}</span>
      </label>

      <label class="mt-3 flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          class="h-6 w-6 accent-[var(--color-grape)]"
          :checked="settings.settings.showFocusControls"
          @change="
            settings.update(
              'showFocusControls',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        <span>
          <span class="block font-bold">{{ t('parent.focusControls') }}</span>
          <span class="block text-xs opacity-55">
            {{ t('parent.focusControlsBlurb') }}
          </span>
        </span>
      </label>

      <label class="mt-3 flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          class="h-6 w-6 accent-[var(--color-grape)]"
          :checked="settings.settings.reduceMotion"
          @change="
            settings.update(
              'reduceMotion',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        <span>
          <span class="block font-bold">{{ t('parent.reduceMotion') }}</span>
          <span class="block text-xs opacity-55">
            {{ t('parent.reduceMotionBlurb') }}
          </span>
        </span>
      </label>
    </section>

    <!-- Recent activity -->
    <section v-if="recentActivity.length" class="deck-card mb-5 p-5">
      <h2 class="mb-3 text-xl font-extrabold">{{ t('parent.activity') }}</h2>
      <ul class="divide-y divide-ink/10 dark:divide-white/10">
        <li
          v-for="(answer, i) in recentActivity"
          :key="`${answer.cardId}-${i}`"
          class="flex items-center gap-3 py-2.5"
        >
          <span aria-hidden="true">{{ answer.correct ? '✅' : '🔁' }}</span>
          <span
            class="font-[family-name:var(--font-word)] text-lg font-bold"
            :lang="answer.language"
          >
            {{ answer.text }}
          </span>
          <span class="ml-auto text-xs capitalize opacity-50">
            {{ answer.mode }} · {{ answer.when }}
          </span>
        </li>
      </ul>
    </section>

    <!-- Reset -->
    <section class="deck-card border-l-8 border-coral p-5">
      <h2 class="text-xl font-extrabold">{{ t('parent.resetSection') }}</h2>
      <p class="mb-4 text-sm opacity-60">{{ t('parent.resetBlurb') }}</p>

      <div v-if="!confirmingReset">
        <AppButton variant="ghost" size="sm" @click="confirmingReset = true">
          {{ t('parent.resetProgress') }}
        </AppButton>
      </div>
      <div v-else class="flex flex-wrap items-center gap-3">
        <span class="font-bold">{{ t('parent.eraseConfirm') }}</span>
        <AppButton variant="danger" size="sm" @click="confirmReset">
          {{ t('parent.eraseYes') }}
        </AppButton>
        <AppButton variant="ghost" size="sm" @click="confirmingReset = false">
          {{ t('parent.cancel') }}
        </AppButton>
      </div>
    </section>
  </div>
</template>
