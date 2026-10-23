import { useAnalytics } from '~/composables/useAnalytics'

export default defineNuxtPlugin(() => {
  if (process.server) return

  const { initAnalytics, track } = useAnalytics()

  // Initialize asynchronously in the background so Nuxt mounting is never blocked
  initAnalytics().catch(err => {
    console.warn('[Analytics] Init error:', err)
  })

  // Automatically track screen views on navigation
  const router = useRouter()
  router.afterEach((to) => {
    track('screen_view', {
      screen_path: to.path,
      screen_name: to.name?.toString() || to.path
    }).catch(() => {})
  })
})
