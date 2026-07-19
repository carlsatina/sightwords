import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import type { Component } from 'vue'
import { messages } from '@/i18n'

/**
 * Shared mounting harness. Every view reaches for the router, a pinia store,
 * and i18n, so a test that forgets one fails on plumbing rather than on the
 * behaviour it meant to check.
 */

export function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/level/:levelId', name: 'level', component: { template: '<div/>' } },
      {
        path: '/flashcards/:levelId',
        name: 'flashcards',
        component: { template: '<div/>' },
      },
      {
        path: '/practice/:levelId',
        name: 'practice',
        component: { template: '<div/>' },
      },
      { path: '/quiz/:levelId', name: 'quiz', component: { template: '<div/>' } },
      { path: '/review', name: 'review', component: { template: '<div/>' } },
      { path: '/daily', name: 'daily', component: { template: '<div/>' } },
      {
        path: '/achievements',
        name: 'achievements',
        component: { template: '<div/>' },
      },
      { path: '/parent', name: 'parent', component: { template: '<div/>' } },
      { path: '/parent/words', name: 'words', component: { template: '<div/>' } },
    ],
  })
}

/**
 * A fresh i18n instance per mount. Sharing one would let a test that switches
 * locale leak that choice into every test that runs after it.
 */
export function makeI18n(locale = 'en') {
  return createI18n({ legacy: false, locale, fallbackLocale: 'en', messages })
}

export async function mountView(
  component: Component,
  props: Record<string, unknown> = {},
  options: { locale?: string } = {},
) {
  const router = makeRouter()
  await router.push('/')
  await router.isReady()
  return mount(component, {
    props,
    global: { plugins: [router, makeI18n(options.locale)] },
  })
}

/** Mounts a component that needs i18n but not the router. */
export function mountWithI18n(
  component: Component,
  props: Record<string, unknown> = {},
  options: { locale?: string } = {},
) {
  return mount(component, {
    props,
    global: { plugins: [makeI18n(options.locale)] },
  })
}

/** Resets every source of cross-test state the app persists into. */
export function resetAppState() {
  localStorage.clear()
  setActivePinia(createPinia())
}
