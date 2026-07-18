import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/level/:levelId',
      name: 'level',
      component: () => import('@/views/LevelView.vue'),
      props: true,
    },
    {
      path: '/flashcards/:levelId',
      name: 'flashcards',
      component: () => import('@/views/FlashcardsView.vue'),
      props: true,
    },
    {
      path: '/practice/:levelId',
      name: 'practice',
      component: () => import('@/views/PracticeView.vue'),
      props: true,
    },
    {
      path: '/quiz/:levelId',
      name: 'quiz',
      component: () => import('@/views/QuizView.vue'),
      props: true,
    },
    {
      path: '/review',
      name: 'review',
      component: () => import('@/views/ReviewView.vue'),
    },
    {
      path: '/daily',
      name: 'daily',
      component: () => import('@/views/DailyView.vue'),
    },
    {
      path: '/achievements',
      name: 'achievements',
      component: () => import('@/views/AchievementsView.vue'),
    },
    {
      path: '/parent',
      name: 'parent',
      component: () => import('@/views/ParentView.vue'),
    },
    {
      path: '/parent/words',
      name: 'words',
      component: () => import('@/views/WordsView.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
