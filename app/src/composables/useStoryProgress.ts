import { onMounted, ref, watch } from 'vue'

function progressKey(storyId: string) {
  return `idea6_nb_en_story:progress:${storyId}`
}

function showZhKey(storyId: string) {
  return `idea6_nb_en_story:showZh:${storyId}`
}

function readStoredPage(storyId: string, pageCount: number): number {
  const raw = localStorage.getItem(progressKey(storyId))
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) return 1
  return Math.min(value, pageCount)
}

function readStoredShowZh(storyId: string): boolean {
  const raw = localStorage.getItem(showZhKey(storyId))
  if (raw === null) return true
  return raw === '1' || raw === 'true'
}

export function useStoryProgress(storyId: string, pageCount: number) {
  const pageIndex = ref(1)
  const showZh = ref(true)
  const resumedFrom = ref<number | null>(null)
  const ready = ref(false)

  onMounted(() => {
    const stored = readStoredPage(storyId, pageCount)
    pageIndex.value = stored
    showZh.value = readStoredShowZh(storyId)
    if (stored > 1) resumedFrom.value = stored
    ready.value = true
  })

  watch(pageIndex, (value) => {
    if (!ready.value) return
    localStorage.setItem(progressKey(storyId), String(value))
  })

  watch(showZh, (value) => {
    if (!ready.value) return
    localStorage.setItem(showZhKey(storyId), value ? '1' : '0')
  })

  function goTo(index: number) {
    pageIndex.value = Math.min(pageCount, Math.max(1, index))
  }

  function next() {
    goTo(pageIndex.value + 1)
  }

  function prev() {
    goTo(pageIndex.value - 1)
  }

  function dismissResume() {
    resumedFrom.value = null
  }

  return {
    pageIndex,
    showZh,
    resumedFrom,
    ready,
    goTo,
    next,
    prev,
    dismissResume,
  }
}
