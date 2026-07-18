<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import BadgeToast from '@/components/BadgeToast.vue'
import { useSettingsStore } from '@/stores/settings'

// Instantiated here so the theme class lands on <html> before the first paint
// of any route.
useSettingsStore()
</script>

<template>
  <a
    href="#main"
    class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[200] focus:rounded-xl focus:bg-grape focus:px-4 focus:py-2 focus:font-bold focus:text-white"
  >
    Skip to content
  </a>

  <AppHeader />
  <BadgeToast />

  <main id="main" class="mx-auto max-w-5xl px-4 pb-16">
    <RouterView v-slot="{ Component }">
      <Transition
        mode="out-in"
        enter-active-class="transition duration-300 ease-[var(--ease-settle)]"
        enter-from-class="opacity-0 translate-y-3"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <component :is="Component" />
      </Transition>
    </RouterView>
  </main>
</template>
