import { onMounted, ref, watch } from 'vue'
import { isDisplayMode, type DisplayMode } from '@/types/displayMode'

const STORAGE_KEY = 'idea6_nb_en_story:displayMode'
const LEGACY_SHOW_ZH_PREFIX = 'idea6_nb_en_story:showZh:'

function readLegacyShowZh(): DisplayMode | null {
  if (typeof localStorage === 'undefined') return null
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(LEGACY_SHOW_ZH_PREFIX)) continue
    const raw = localStorage.getItem(key)
    if (raw === '0' || raw === 'false') return 'en'
    return 'en+zh'
  }
  return null
}

function readStored(): DisplayMode {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (isDisplayMode(raw)) return raw
  return readLegacyShowZh() ?? 'en+zh'
}

export function useDisplayMode() {
  const displayMode = ref<DisplayMode>('en+zh')
  const ready = ref(false)

  onMounted(() => {
    displayMode.value = readStored()
    ready.value = true
  })

  watch(displayMode, (value) => {
    if (!ready.value) return
    localStorage.setItem(STORAGE_KEY, value)
  })

  return {
    displayMode,
    ready,
  }
}
