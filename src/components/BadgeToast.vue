<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import type { Badge } from '@/types'
import { useProgressStore } from '@/stores/progress'
import { useConfetti } from '@/composables/useConfetti'

/**
 * Watches the progress store for newly earned badges and announces them one at
 * a time. Mounted once at the app root so any mode can trigger it.
 */
const progress = useProgressStore()
const { burst } = useConfetti()

const current = ref<Badge | null>(null)
const queue = ref<Badge[]>([])
let timer: ReturnType<typeof setTimeout> | undefined

function showNext() {
  if (current.value || queue.value.length === 0) return
  current.value = queue.value.shift() ?? null
  if (!current.value) return
  burst()
  timer = setTimeout(dismiss, 4200)
}

function dismiss() {
  clearTimeout(timer)
  current.value = null
  // Let the leave transition finish before the next badge slides in.
  setTimeout(showNext, 380)
}

watch(
  () => progress.pendingBadges.length,
  (length) => {
    if (length === 0) return
    queue.value.push(...progress.drainPendingBadges())
    showNext()
  },
)

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <Transition
    enter-active-class="transition duration-500 ease-[var(--ease-pop)]"
    enter-from-class="opacity-0 -translate-y-6 scale-90"
    leave-active-class="transition duration-300 ease-in"
    leave-to-class="opacity-0 -translate-y-4 scale-95"
  >
    <div
      v-if="current"
      class="fixed inset-x-0 top-4 z-[100] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        class="deck-card flex w-full max-w-sm items-center gap-4 border-4 border-marigold p-4 text-left"
        @click="dismiss"
      >
        <span class="text-5xl leading-none" aria-hidden="true">{{ current.emoji }}</span>
        <span class="min-w-0">
          <span class="block text-xs font-bold tracking-[0.18em] text-marigold-deep uppercase">
            Badge earned
          </span>
          <span class="block truncate text-xl font-extrabold">{{ current.name }}</span>
          <span class="block truncate text-sm opacity-70">{{ current.description }}</span>
        </span>
      </button>
    </div>
  </Transition>
</template>
