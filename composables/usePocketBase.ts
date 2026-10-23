import PocketBase from 'pocketbase'

let pbInstance: PocketBase | null = null

export function usePocketBase() {
  const config = useRuntimeConfig()
  const url = config.public.pocketbaseUrl || 'http://195.209.213.115:8090'

  if (!pbInstance) {
    pbInstance = new PocketBase(url)
  }

  return pbInstance
}
