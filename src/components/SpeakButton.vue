<script setup lang="ts">
import { computed } from 'vue'
import { useSpeech } from '@/composables/useSpeech'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    text: string
    label?: string
    size?: 'sm' | 'md'
    /** BCP-47 tag to read the text as; defaults to the language in play. */
    lang?: string
  }>(),
  { size: 'md' },
)

const { supported, speak, currentLang, hasVoiceFor } = useSpeech()
const settings = useSettingsStore()
const { t } = useI18n()

const speechLang = computed(() => props.lang ?? currentLang.value)

/**
 * Hidden outright when the device has no voice for this language, rather than
 * shown as a button that silently does nothing. Filipino is the common case —
 * most desktop browsers and iOS ship no fil-PH voice.
 */
const visible = computed(
  () =>
    supported && settings.settings.speechEnabled && hasVoiceFor(speechLang.value),
)
</script>

<template>
  <button
    v-if="visible"
    type="button"
    class="chunky-btn inline-flex items-center gap-2 bg-white px-5 py-2.5 text-ink shadow-[0_4px_0_0_rgba(30,42,71,0.15)] dark:bg-night-card dark:text-paper dark:shadow-[0_4px_0_0_rgba(0,0,0,0.5)]"
    :class="size === 'sm' ? 'text-sm' : 'text-base'"
    :aria-label="label ?? t('speak.hearWord', { word: props.text })"
    @click="speak(props.text, { lang: speechLang })"
  >
    <svg
      class="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
      <path d="M19 6.5a8 8 0 0 1 0 11" />
    </svg>
    <span>{{ label ?? t('speak.hearIt') }}</span>
  </button>
</template>
