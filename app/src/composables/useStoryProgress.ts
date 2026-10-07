import { onMounted, ref, watch } from 'vue'
import { progressKey } from '@/utils/appStorage'

function clampPage(value: number, pageCount: number): number {
  if (!Number.isInteger(value) || value < 1) return 1
  return Math.min(value, Math.max(1, pageCount))
}

function readStoredPage(storyId: string, pageCount: number): number {
  const raw = localStorage.getItem(progressKey(storyId))
  return clampPage(Number(raw), pageCount)
}

export function useStoryProgress(storyId: string, pageCount: number) {
  const pageIndex = ref(1)
  const resumedFrom = ref<number | null>(null)
  const ready = ref(false)

  onMounted(() => {
    const stored = readStoredPage(storyId, pageCount)
    pageIndex.value = stored
    if (stored > 1) resumedFrom.value = stored
    ready.value = true
  })

  watch(pageIndex, (value) => {
    if (!ready.value) return
    const clamped = clampPage(value, pageCount)
    if (clamped !== value) {
      pageIndex.value = clamped
      return
    }
    localStorage.setItem(progressKey(storyId), String(clamped))
  })

  function goTo(index: number) {
    pageIndex.value = clampPage(index, pageCount)
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

  function restart() {
    goTo(1)
    resumedFrom.value = null
  }

  return {
    pageIndex,
    resumedFrom,
    ready,
    goTo,
    next,
    prev,
    dismissResume,
    restart,
  }
}
