export const STORAGE_PREFIX = 'idea6_nb_en_story:'

export const ACKED_VERSION_KEY = `${STORAGE_PREFIX}ackedVersion`
export const SELECTED_STORY_KEY = `${STORAGE_PREFIX}selectedStory`
export const SLOW_SPEED_KEY = `${STORAGE_PREFIX}slowSpeed`
export const AUTO_READ_KEY = `${STORAGE_PREFIX}autoRead`
export const DISPLAY_MODE_KEY = `${STORAGE_PREFIX}displayMode`
export const LEGACY_SHOW_ZH_PREFIX = `${STORAGE_PREFIX}showZh:`

export function storageKey(suffix: string) {
  return `${STORAGE_PREFIX}${suffix}`
}

export function progressKey(storyId: string) {
  return storageKey(`progress:${storyId}`)
}

export function clearStaleDisplayModeKeys() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(DISPLAY_MODE_KEY)
  const stale: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key && key.startsWith(LEGACY_SHOW_ZH_PREFIX)) stale.push(key)
  }
  for (const key of stale) localStorage.removeItem(key)
}

export function clearAppStorage() {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key)
  }
  for (const key of keys) localStorage.removeItem(key)
}
