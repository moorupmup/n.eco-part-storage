import { setupBackButton } from '~/composables/useBackButton'
import { usePartsStore } from '~/stores/parts'

export default defineNuxtPlugin(() => {
  if (process.server) return

  const router = useRouter()
  const toast = useToast()
  const partsStore = usePartsStore()

  setupBackButton({
    router,
    toast,
    partsStore
  })
})
