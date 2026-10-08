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
  const ready = ref(false)

  onMounted(() => {
    pageIndex.value = readStoredPage(storyId, pageCount)
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

  function restart() {
    goTo(1)
  }

  return {
    pageIndex,
    ready,
    goTo,
    next,
    prev,
    restart,
  }
}
