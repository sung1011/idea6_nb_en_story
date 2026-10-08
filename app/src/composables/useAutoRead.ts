import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { AUTO_READ_KEY } from '@/utils/appStorage'
import type { StoryPage } from '@/types/story'
import { plainSpeakText, type PlayOptions, type SpeechLang } from '@/composables/usePageSpeech'

const ZH_GAP_MS = 500
const AUTO_READ_DEFAULT = true

const enabled = ref(readStored())

function readStored(): boolean {
  if (typeof localStorage === 'undefined') return AUTO_READ_DEFAULT
  const stored = localStorage.getItem(AUTO_READ_KEY)
  if (stored == null || stored === '') return AUTO_READ_DEFAULT
  if (stored === '0' || stored === 'false') return false
  if (stored === '1' || stored === 'true') return true
  return AUTO_READ_DEFAULT
}

function persist(value: boolean) {
  try {
    localStorage.setItem(AUTO_READ_KEY, value ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
}

export function useAutoReadSetting() {
  function setEnabled(next: boolean) {
    enabled.value = next
    persist(next)
  }

  return {
    enabled,
    setEnabled,
    toggle: () => setEnabled(!enabled.value),
    label: computed(() => (enabled.value ? 'On' : 'Off')),
  }
}

export function useAutoRead(
  page: Ref<StoryPage | undefined>,
  onSummary: Ref<boolean>,
  ready: Ref<boolean>,
  playLine: (lang: SpeechLang, rate?: number, options?: PlayOptions) => void,
  stop: () => void,
) {
  let generation = 0
  let zhTimer = 0
  let waitingGesture = false

  function cancelAuto() {
    generation += 1
    waitingGesture = false
    if (zhTimer) {
      window.clearTimeout(zhTimer)
      zhTimer = 0
    }
  }

  function startAutoRead() {
    if (!enabled.value || onSummary.value) return
    const current = page.value
    if (!current) return
    const hasEn = Boolean(String(current.audioEn || '').trim())
    const hasZh = Boolean(plainSpeakText(current.zh))
    if (!hasEn && !hasZh) return

    const token = generation
    const playZh = () => {
      if (token !== generation || onSummary.value) return
      if (!hasZh) return
      playLine('zh', 1, {
        silent: true,
        deferAutoplay: true,
        onBlocked: () => {
          if (token === generation) waitingGesture = true
        },
      })
    }
    const afterEn = () => {
      if (token !== generation) return
      zhTimer = window.setTimeout(playZh, ZH_GAP_MS)
    }

    if (hasEn) {
      playLine('en', 1, {
        silent: true,
        deferAutoplay: true,
        onBlocked: () => {
          if (token === generation) waitingGesture = true
        },
        onEnded: afterEn,
      })
      return
    }
    afterEn()
  }

  function onPointerDown(event: PointerEvent) {
    if (!waitingGesture || !enabled.value || onSummary.value) return
    const target = event.target as HTMLElement | null
    if (target?.closest('button, .line-text, input, textarea, a, [role="switch"]')) return
    waitingGesture = false
    startAutoRead()
  }

  watch(
    () => [page.value?.id, onSummary.value, enabled.value, ready.value] as const,
    () => {
      if (!ready.value) return
      cancelAuto()
      stop()
      if (enabled.value && !onSummary.value) startAutoRead()
    },
  )

  onMounted(() => {
    window.addEventListener('pointerdown', onPointerDown, { capture: true })
  })

  onUnmounted(() => {
    cancelAuto()
    window.removeEventListener('pointerdown', onPointerDown, { capture: true })
  })

  return {
    cancelAuto,
  }
}
