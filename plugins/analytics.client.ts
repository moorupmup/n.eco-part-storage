import { useAnalytics } from '~/composables/useAnalytics'

export default defineNuxtPlugin(async () => {
  if (process.server) return

  const { initAnalytics, track } = useAnalytics()

  // Initialize on app startup
  await initAnalytics()

  // Automatically track screen views on navigation
  const router = useRouter()
  router.afterEach((to) => {
    track('screen_view', {
      screen_path: to.path,
      screen_name: to.name?.toString() || to.path
    })
  })
})
