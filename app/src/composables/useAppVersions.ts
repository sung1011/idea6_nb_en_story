import { computed, onMounted, onUnmounted, ref } from 'vue'
import { parseVersions, type AppVersion } from '@/types/appVersion'
import { ACKED_VERSION_KEY } from '@/utils/appStorage'

const POLL_MS = 10_000
const TOAST_LIMIT = 10
const RELOAD_PARAM = '_reload'

function versionsUrl() {
  return `${import.meta.env.BASE_URL}versions.json?t=${Date.now()}`
}

function readAcked(): string | null {
  return localStorage.getItem(ACKED_VERSION_KEY)
}

function writeAcked(id: string) {
  localStorage.setItem(ACKED_VERSION_KEY, id)
}

function stripReloadParam() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(RELOAD_PARAM)) return
  url.searchParams.delete(RELOAD_PARAM)
  const next = `${url.pathname}${url.search}${url.hash}`
  history.replaceState(null, '', next)
}

export function hardReload() {
  const url = new URL(window.location.href)
  url.searchParams.set(RELOAD_PARAM, String(Date.now()))
  window.location.replace(url.toString())
}

export function useAppVersions() {
  const versions = ref<AppVersion[]>([])
  const current = computed(() => versions.value[0] ?? null)
  const pending = computed(() => {
    const acked = readAcked()
    if (!acked) return []
    const idx = versions.value.findIndex((entry) => entry.id === acked)
    return idx === -1 ? versions.value : versions.value.slice(0, idx)
  })
  const toastPending = computed(() => pending.value.slice(0, TOAST_LIMIT))

  async function refresh() {
    try {
      const response = await fetch(versionsUrl(), { cache: 'no-store' })
      if (!response.ok) return
      const next = parseVersions(await response.json())
      if (!next.length) return
      const acked = readAcked()
      if (!acked || !next.some((entry) => entry.id === acked)) {
        writeAcked(next[0].id)
      }
      versions.value = next
    } catch {
      // ignore network errors; next poll retries
    }
  }

  async function clearCaches(reloadDelayMs = 0) {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((reg) => reg.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
    } catch {
      // still reload so the shell and story assets refetch
    }
    if (reloadDelayMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, reloadDelayMs))
    }
    hardReload()
  }

  async function applyUpdate() {
    const newest = versions.value[0]
    if (newest) writeAcked(newest.id)
    try {
      await clearCaches()
    } catch {
      hardReload()
    }
  }

  let timer = 0

  onMounted(() => {
    stripReloadParam()
    void refresh()
    timer = window.setInterval(() => {
      void refresh()
    }, POLL_MS)
  })

  onUnmounted(() => {
    if (timer) window.clearInterval(timer)
  })

  return {
    versions,
    current,
    pending,
    toastPending,
    refresh,
    applyUpdate,
    clearCaches,
  }
}
