import { computed, ref } from 'vue'
import { STALE_SLOW_SPEED_KEY, VOICE_SPEED_KEY } from '@/utils/appStorage'

export const VOICE_SPEED_MIN = 50
export const VOICE_SPEED_MAX = 100
export const VOICE_SPEED_STEP = 10
export const VOICE_SPEED_DEFAULT = 100

const percent = ref(readStored())

export function clampVoicePercent(value: number): number {
  if (!Number.isFinite(value)) return VOICE_SPEED_DEFAULT
  const snapped = Math.round(value / VOICE_SPEED_STEP) * VOICE_SPEED_STEP
  return Math.min(VOICE_SPEED_MAX, Math.max(VOICE_SPEED_MIN, snapped))
}

function readStored(): number {
  if (typeof localStorage === 'undefined') return VOICE_SPEED_DEFAULT
  localStorage.removeItem(STALE_SLOW_SPEED_KEY)
  const stored = localStorage.getItem(VOICE_SPEED_KEY)
  if (stored == null || stored === '') return VOICE_SPEED_DEFAULT
  const raw = Number(stored)
  if (!Number.isFinite(raw)) return VOICE_SPEED_DEFAULT
  return clampVoicePercent(raw)
}

function persist(value: number) {
  try {
    localStorage.setItem(VOICE_SPEED_KEY, String(value))
  } catch {
    /* ignore quota / private mode */
  }
}

export function useVoiceSpeed() {
  function setPercent(next: number) {
    const value = clampVoicePercent(next)
    percent.value = value
    persist(value)
  }

  return {
    percent,
    rate: computed(() => percent.value / 100),
    setPercent,
    slower: () => setPercent(percent.value - VOICE_SPEED_STEP),
    faster: () => setPercent(percent.value + VOICE_SPEED_STEP),
    canSlower: computed(() => percent.value > VOICE_SPEED_MIN),
    canFaster: computed(() => percent.value < VOICE_SPEED_MAX),
  }
}
