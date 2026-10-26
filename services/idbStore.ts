/**
 * Lightweight IndexedDB Key-Value Store
 * Provides gigabytes of storage space, bypassing the strict 5MB localStorage quota.
 * Automatically migrates existing data from localStorage on first run.
 */

const DB_NAME = 'neco_app_storage'
const STORE_NAME = 'keyval'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'))
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB'))
      }
    })
  }

  return dbPromise
}

export const idbStore = {
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(key)
        req.onsuccess = () => resolve(req.result ?? null)
        req.onerror = () => reject(req.error)
      })
    } catch {
      // Fallback to localStorage if IndexedDB is blocked (e.g. private mode)
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key)
        if (val) {
          try {
            return JSON.parse(val) as T
          } catch {
            return val as any
          }
        }
      }
      return null
    }
  },

  async set<T = any>(key: string, value: T): Promise<void> {
    try {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.put(value, key)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch (err) {
      // Fallback to localStorage if IndexedDB fails, but catch quota errors
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
        } catch {
          console.warn(`[Storage] Failed to save key '${key}' to localStorage fallback:`, err)
        }
      }
    }
  },

  async del(key: string): Promise<void> {
    try {
      const db = await getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.delete(key)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key)
      }
    }
  },

  /**
   * Migrate a key from localStorage to IndexedDB if it doesn't already exist in IndexedDB
   */
  async migrateFromLocalStorage(key: string): Promise<any | null> {
    const existing = await this.get(key)
    if (existing !== null) {
      return existing
    }

    if (typeof localStorage !== 'undefined') {
      const localVal = localStorage.getItem(key)
      if (localVal) {
        try {
          const parsed = JSON.parse(localVal)
          await this.set(key, parsed)
          // Clean up old localStorage entry to free up the 5MB quota
          try {
            localStorage.removeItem(key)
          } catch {}
          return parsed
        } catch {
          await this.set(key, localVal)
          return localVal
        }
      }
    }

    return null
  }
}
