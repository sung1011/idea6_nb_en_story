import { computed, ref } from 'vue'
import { SLOW_SPEED_KEY } from '@/utils/appStorage'

export const SLOW_SPEED_MIN = 30
export const SLOW_SPEED_MAX = 90
export const SLOW_SPEED_STEP = 10
export const SLOW_SPEED_DEFAULT = 60

const percent = ref(readStored())

export function clampSlowPercent(value: number): number {
  if (!Number.isFinite(value)) return SLOW_SPEED_DEFAULT
  const snapped = Math.round(value / SLOW_SPEED_STEP) * SLOW_SPEED_STEP
  return Math.min(SLOW_SPEED_MAX, Math.max(SLOW_SPEED_MIN, snapped))
}

function readStored(): number {
  if (typeof localStorage === 'undefined') return SLOW_SPEED_DEFAULT
  const stored = localStorage.getItem(SLOW_SPEED_KEY)
  if (stored == null || stored === '') return SLOW_SPEED_DEFAULT
  const raw = Number(stored)
  if (!Number.isFinite(raw)) return SLOW_SPEED_DEFAULT
  return clampSlowPercent(raw)
}

function persist(value: number) {
  try {
    localStorage.setItem(SLOW_SPEED_KEY, String(value))
  } catch {
    /* ignore quota / private mode */
  }
}

export function useSlowSpeed() {
  function setPercent(next: number) {
    const value = clampSlowPercent(next)
    percent.value = value
    persist(value)
  }

  return {
    percent,
    rate: computed(() => percent.value / 100),
    setPercent,
    slower: () => setPercent(percent.value - SLOW_SPEED_STEP),
    faster: () => setPercent(percent.value + SLOW_SPEED_STEP),
    canSlower: computed(() => percent.value > SLOW_SPEED_MIN),
    canFaster: computed(() => percent.value < SLOW_SPEED_MAX),
  }
}
