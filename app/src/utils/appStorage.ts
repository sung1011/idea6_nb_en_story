export const STORAGE_PREFIX = 'idea6_nb_en_story:'

export const ACKED_VERSION_KEY = `${STORAGE_PREFIX}ackedVersion`
export const DISPLAY_MODE_KEY = `${STORAGE_PREFIX}displayMode`
export const LEGACY_SHOW_ZH_PREFIX = `${STORAGE_PREFIX}showZh:`

export function storageKey(suffix: string) {
  return `${STORAGE_PREFIX}${suffix}`
}

export function progressKey(storyId: string) {
  return storageKey(`progress:${storyId}`)
}

export function clearAppStorage() {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key)
  }
  for (const key of keys) localStorage.removeItem(key)
}
