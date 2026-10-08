import { nextTick, onMounted, onUnmounted, watch, type Ref } from 'vue'
import type { Story, StoryPage } from '@/types/story'

const WARM_CONCURRENCY = 2
const LOOKAHEAD_PAGES = 2
const IDLE_TIMEOUT_MS = 1500
const IDLE_FALLBACK_MS = 200

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

function pageLookaheadUrls(page: StoryPage): string[] {
  const urls = [assetUrl(page.image), assetUrl(page.audioEn), assetUrl(page.audioZh)]
  for (const item of page.learnItems ?? []) urls.push(assetUrl(item.image))
  return uniqueUrls(urls)
}

function pageWarmUrls(page: StoryPage): string[] {
  const urls = [assetUrl(page.image), assetUrl(page.audioEn), assetUrl(page.audioZh)]
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

function warmUrl(url: string, signal?: AbortSignal): Promise<void> {
  if (!url || cachedUrls.has(url)) return Promise.resolve()
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

async function runQueue(urls: string[], signal?: AbortSignal, concurrency = WARM_CONCURRENCY) {
  let cursor = 0
  async function worker() {
    while (cursor < urls.length) {
      if (signal?.aborted) return
      const url = urls[cursor]
      cursor += 1
      await warmUrl(url, signal)
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

export function useStoryPreload(story: Ref<Story>, pageIndex: Ref<number>) {
  let warmAbort: AbortController | null = null
  let idleHandle = 0

  function preloadAhead() {
    const pages = upcomingPages(story.value, pageIndex.value)
    const urls = uniqueUrls(pages.flatMap(pageLookaheadUrls))
    void runQueue(urls, undefined, LOOKAHEAD_PAGES)
  }

  function startWarmup() {
    const id = story.value.id
    if (!id || warmedStories.has(id) || warmingStories.has(id) || saveDataOn()) return
    warmingStories.add(id)
    warmAbort?.abort()
    warmAbort = new AbortController()
    const signal = warmAbort.signal
    const urls = uniqueUrls(orderedWarmPages(story.value, pageIndex.value).flatMap(pageWarmUrls))
    void runQueue(urls, signal, WARM_CONCURRENCY).then(() => {
      if (signal.aborted) {
        warmingStories.delete(id)
        return
      }
      warmingStories.delete(id)
      warmedStories.add(id)
    })
  }

  watch(
    () => [story.value.id, pageIndex.value] as const,
    () => {
      preloadAhead()
    },
    { immediate: true },
  )

  onMounted(() => {
    void nextTick(() => {
      idleHandle = whenIdle(startWarmup)
    })
  })

  onUnmounted(() => {
    warmAbort?.abort()
    if (idleHandle) cancelIdle(idleHandle)
    warmingStories.delete(story.value.id)
  })
}
