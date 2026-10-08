import { computed, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { Story, StoryPage } from '@/types/story'

const WARM_CONCURRENCY = 2
const LOOKAHEAD_PAGES = 2
const IDLE_TIMEOUT_MS = 1500
const IDLE_FALLBACK_MS = 200
const CACHE_FADE_MS = 1800

const warmedStories = new Set<string>()
const warmingStories = new Set<string>()
const cachedUrls = new Set<string>()
const inflight = new Map<string, Promise<void>>()

function assetUrl(file: string | null | undefined): string {
  const name = String(file || '').trim()
  if (!name) return ''
  return `${import.meta.env.BASE_URL}${name.replace(/^\//, '')}`
}

function uniqueUrls(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const list: string[] = []
  for (const url of urls) {
    const value = String(url || '').trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    list.push(value)
  }
  return list
}

export function pageWarmUrls(page: StoryPage): string[] {
  const urls = [assetUrl(page.image), assetUrl(page.audioEn)]
  for (const item of page.learnItems ?? []) urls.push(assetUrl(item.image))
  return uniqueUrls(urls)
}

function saveDataOn(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return Boolean(connection?.saveData)
}

function whenIdle(callback: () => void): number {
  if (typeof requestIdleCallback === 'function') {
    return requestIdleCallback(() => callback(), { timeout: IDLE_TIMEOUT_MS })
  }
  return window.setTimeout(callback, IDLE_FALLBACK_MS)
}

function cancelIdle(handle: number) {
  if (typeof cancelIdleCallback === 'function') {
    cancelIdleCallback(handle)
    return
  }
  window.clearTimeout(handle)
}

function absoluteUrl(url: string): string {
  if (typeof window === 'undefined') return url
  return new URL(url, window.location.origin).href
}

async function urlInCache(url: string): Promise<boolean> {
  if (!url) return false
  if (cachedUrls.has(url)) return true
  if (typeof caches === 'undefined') return false
  try {
    const hit = await caches.match(absoluteUrl(url), { ignoreSearch: true })
    if (hit) {
      cachedUrls.add(url)
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

function warmUrl(url: string, signal?: AbortSignal, onCached?: () => void): Promise<void> {
  if (!url) return Promise.resolve()
  if (cachedUrls.has(url)) {
    onCached?.()
    return Promise.resolve()
  }
  const existing = inflight.get(url)
  if (existing && !signal) return existing
  if (existing && signal) {
    if (signal.aborted) return Promise.resolve()
    return new Promise((resolve) => {
      const finish = () => resolve()
      signal.addEventListener('abort', finish, { once: true })
      existing.finally(() => {
        signal.removeEventListener('abort', finish)
        resolve()
      })
    })
  }

  const job = fetch(url, { signal, credentials: 'same-origin' })
    .then(async (response) => {
      if (!response.ok) return
      await response.blob()
      cachedUrls.add(url)
      onCached?.()
    })
    .catch((error: unknown) => {
      const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
      if (name === 'AbortError') return
    })
    .finally(() => {
      inflight.delete(url)
    })
  inflight.set(url, job)
  return job
}

async function runQueue(
  urls: string[],
  signal?: AbortSignal,
  concurrency = WARM_CONCURRENCY,
  onCached?: () => void,
) {
  let cursor = 0
  async function worker() {
    while (cursor < urls.length) {
      if (signal?.aborted) return
      const url = urls[cursor]
      cursor += 1
      await warmUrl(url, signal, onCached)
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker())
  await Promise.all(workers)
}

function upcomingPages(story: Story, pageIndex: number): StoryPage[] {
  const pages: StoryPage[] = []
  for (let step = 1; step <= LOOKAHEAD_PAGES; step += 1) {
    const next = story.pages.find((item) => item.index === pageIndex + step)
    if (next) pages.push(next)
  }
  return pages
}

function orderedWarmPages(story: Story, pageIndex: number): StoryPage[] {
  const prefer = new Set<number>([pageIndex, pageIndex + 1, pageIndex + 2])
  const first = story.pages.filter((item) => prefer.has(item.index))
  const rest = story.pages.filter((item) => !prefer.has(item.index))
  return [...first, ...rest]
}

function pageFullyCached(page: StoryPage): boolean {
  const urls = pageWarmUrls(page)
  return urls.every((url) => cachedUrls.has(url))
}

export function useStoryPreload(story: Ref<Story>, pageIndex: Ref<number>) {
  const cacheTick = ref(0)
  const cacheDone = ref(0)
  const cacheTotal = ref(0)
  const cacheSkipped = ref(false)
  const cacheComplete = ref(false)
  const cacheFade = ref(false)
  let warmAbort: AbortController | null = null
  let idleHandle = 0
  let fadeTimer = 0

  function recount() {
    if (cacheSkipped.value) return
    const pages = story.value.pages
    cacheTotal.value = pages.length
    cacheDone.value = pages.filter((page) => pageFullyCached(page)).length
    const complete = cacheTotal.value > 0 && cacheDone.value >= cacheTotal.value
    if (complete) {
      if (!cacheComplete.value) {
        cacheComplete.value = true
        cacheFade.value = false
        if (fadeTimer) window.clearTimeout(fadeTimer)
        fadeTimer = window.setTimeout(() => {
          cacheFade.value = true
        }, CACHE_FADE_MS)
      }
    } else {
      cacheComplete.value = false
      cacheFade.value = false
      if (fadeTimer) {
        window.clearTimeout(fadeTimer)
        fadeTimer = 0
      }
    }
    cacheTick.value += 1
  }

  const cacheLabel = computed(() => {
    if (cacheSkipped.value) return ''
    if (!cacheTotal.value) return ''
    if (cacheComplete.value) return 'Cached ✓'
    return `Cached ${cacheDone.value}/${cacheTotal.value} pages`
  })

  const nextPageLoading = computed(() => {
    cacheTick.value
    if (cacheSkipped.value) return false
    const next = story.value.pages.find((page) => page.index === pageIndex.value + 1)
    if (!next) return false
    return !pageFullyCached(next)
  })

  function preloadAhead() {
    const pages = upcomingPages(story.value, pageIndex.value)
    const urls = uniqueUrls(pages.flatMap((page) => pageWarmUrls(page)))
    void runQueue(urls, undefined, LOOKAHEAD_PAGES, recount)
  }

  async function scanExisting() {
    if (saveDataOn()) {
      cacheSkipped.value = true
      cacheDone.value = 0
      cacheTotal.value = 0
      cacheComplete.value = false
      cacheFade.value = false
      return
    }
    cacheSkipped.value = false
    const urls = uniqueUrls(
      orderedWarmPages(story.value, pageIndex.value).flatMap((page) => pageWarmUrls(page)),
    )
    await Promise.all(urls.map(urlInCache))
    recount()
  }

  function startWarmup() {
    const id = story.value.id
    if (!id || cacheSkipped.value || warmedStories.has(id) || warmingStories.has(id) || saveDataOn()) {
      return
    }
    warmingStories.add(id)
    warmAbort?.abort()
    warmAbort = new AbortController()
    const signal = warmAbort.signal
    const urls = uniqueUrls(
      orderedWarmPages(story.value, pageIndex.value).flatMap((page) => pageWarmUrls(page)),
    )
    void runQueue(urls, signal, WARM_CONCURRENCY, recount).then(() => {
      if (signal.aborted) {
        warmingStories.delete(id)
        return
      }
      warmingStories.delete(id)
      warmedStories.add(id)
      recount()
    })
  }

  watch(
    () => [story.value.id, pageIndex.value] as const,
    () => {
      preloadAhead()
    },
    { immediate: true },
  )

  watch(
    () => story.value.id,
    () => {
      void scanExisting().then(() => {
        if (idleHandle) cancelIdle(idleHandle)
        idleHandle = whenIdle(startWarmup)
      })
    },
  )

  onMounted(() => {
    void nextTick(() => {
      void scanExisting().then(() => {
        idleHandle = whenIdle(startWarmup)
      })
    })
  })

  onUnmounted(() => {
    warmAbort?.abort()
    if (idleHandle) cancelIdle(idleHandle)
    if (fadeTimer) window.clearTimeout(fadeTimer)
    warmingStories.delete(story.value.id)
  })

  return {
    cacheLabel,
    cacheFade,
    nextPageLoading,
  }
}
