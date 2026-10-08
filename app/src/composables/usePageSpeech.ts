import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { StoryPage } from '@/types/story'
import { asWordCues, followWordAt, type WordCue } from '@/utils/followCue'

export type SpeechLang = 'en' | 'zh'

export type PlayOptions = {
  onEnded?: () => void
  silent?: boolean
  deferAutoplay?: boolean
  onBlocked?: () => void
  onSilentFail?: () => void
  onPlaying?: () => void
}

/** One silent wav so the first tap can unlock audio on iOS. */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

let sharedAudio: HTMLAudioElement | null = null
let unlocked = false
let seq = 0
let followRaf = 0
const timingsByUrl = new Map<string, Promise<Record<string, WordCue[]> | null>>()

function cancelFollowLoop() {
  if (!followRaf) return
  cancelAnimationFrame(followRaf)
  followRaf = 0
}

function element(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio()
    sharedAudio.preload = 'auto'
  }
  return sharedAudio
}

function clipUrl(file: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}${file.replace(/^\//, '')}`
}

export function plainSpeakText(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\s+/g, ' ').trim()
}

function pickZhVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? []
  return (
    voices.find((voice) => /^zh[-_]cn/i.test(voice.lang)) ??
    voices.find((voice) => /^zh/i.test(voice.lang))
  )
}

function unlockAudio(): void {
  if (unlocked) return
  const el = element()
  if (el.src && !el.src.startsWith('data:')) {
    unlocked = true
    return
  }
  el.volume = 0
  el.src = SILENT_WAV
  const pending = el.play()
  el.volume = 1
  void pending
    .then(() => {
      unlocked = true
      if (el.src.startsWith('data:')) el.pause()
    })
    .catch(() => {
      unlocked = false
    })
}

const NORMAL_EN_SPEECH_RATE = 0.86
const MIN_SPEECH_RATE = 0.3

function applyPlaybackRate(el: HTMLAudioElement, rate: number) {
  el.playbackRate = rate
  el.preservesPitch = true
  const pitched = el as HTMLAudioElement & {
    webkitPreservesPitch?: boolean
    mozPreservesPitch?: boolean
  }
  pitched.webkitPreservesPitch = true
  pitched.mozPreservesPitch = true
}

function stopShared(): void {
  seq += 1
  cancelFollowLoop()
  window.speechSynthesis?.cancel()
  if (sharedAudio) {
    sharedAudio.onended = null
    sharedAudio.onerror = null
    sharedAudio.onloadedmetadata = null
    sharedAudio.pause()
    applyPlaybackRate(sharedAudio, 1)
  }
}

function timingsPathFromAudio(audioEn: string): string {
  const clean = audioEn.replace(/^\//, '')
  const slash = clean.lastIndexOf('/')
  if (slash <= 0) return ''
  return `${clean.slice(0, slash)}/timings.json`
}

function loadTimings(path: string): Promise<Record<string, WordCue[]> | null> {
  if (!path) return Promise.resolve(null)
  const url = clipUrl(path)
  let pending = timingsByUrl.get(url)
  if (!pending) {
    pending = fetch(url)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data || typeof data !== 'object') return null
        const mapped: Record<string, WordCue[]> = {}
        for (const [pageId, raw] of Object.entries(data as Record<string, unknown>)) {
          const cues = asWordCues(raw)
          if (cues.length) mapped[pageId] = cues
        }
        return mapped
      })
      .catch(() => null)
    timingsByUrl.set(url, pending)
  }
  return pending
}

function systemSpeak(
  text: string,
  lang: SpeechLang,
  token: number,
  onDone: () => void,
  rate = 1,
  device = false,
): void {
  if (!window.speechSynthesis || seq !== token) {
    onDone()
    return
  }
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = lang === 'zh' ? 'zh-CN' : 'en-US'
  if (device) {
    utter.rate = Math.max(MIN_SPEECH_RATE, rate)
    utter.pitch = 1
    if (lang === 'zh') {
      const voice = pickZhVoice()
      if (voice) utter.voice = voice
    }
  } else {
    const base = lang === 'zh' ? 1 : NORMAL_EN_SPEECH_RATE
    utter.rate = Math.max(MIN_SPEECH_RATE, base * rate)
    utter.pitch = 1.12
    if (lang === 'zh') {
      const voice = pickZhVoice()
      if (voice) utter.voice = voice
    }
  }
  const finish = () => {
    if (seq !== token) return
    onDone()
  }
  utter.onend = finish
  utter.onerror = finish
  window.speechSynthesis.speak(utter)
}

function isAutoplayBlocked(error: unknown): boolean {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : ''
  return name === 'NotAllowedError' || /interact|autoplay/i.test(message)
}

function playFile(
  src: string,
  text: string,
  lang: SpeechLang,
  token: number,
  onDone: () => void,
  rate = 1,
  options: PlayOptions = {},
): void {
  const el = element()
  let handed = false
  const fail = (error?: unknown) => {
    if (seq !== token || handed) return
    if (options.deferAutoplay && isAutoplayBlocked(error)) {
      handed = true
      el.onended = null
      el.onerror = null
      el.onloadedmetadata = null
      options.onBlocked?.()
      return
    }
    handed = true
    el.onended = null
    el.onerror = null
    el.onloadedmetadata = null
    if (options.silent) {
      options.onSilentFail?.()
      return
    }
    systemSpeak(text, lang, token, onDone, rate)
  }
  el.onended = null
  el.onerror = null
  el.onloadedmetadata = null
  el.pause()
  el.src = src
  applyPlaybackRate(el, rate)
  el.onloadedmetadata = () => {
    if (seq !== token) return
    applyPlaybackRate(el, rate)
  }
  el.onended = () => {
    if (seq !== token || handed) return
    handed = true
    applyPlaybackRate(el, 1)
    onDone()
  }
  el.onerror = () => fail()
  void el.play().then(() => {
    if (seq !== token) return
    applyPlaybackRate(el, rate)
    options.onPlaying?.()
  }).catch((error) => fail(error))
}

export function usePageSpeech(page: Ref<StoryPage | undefined>) {
  const playingLang = ref<SpeechLang | null>(null)
  const playingWord = ref<string | null>(null)
  const playingRate = ref(1)
  const followIndex = ref<number | null>(null)
  const playingPhrase = ref<string | null>(null)

  function clearFollow() {
    cancelFollowLoop()
    followIndex.value = null
  }

  function startFollow(token: number, cues: WordCue[]) {
    cancelFollowLoop()
    const el = element()
    const tick = () => {
      if (seq !== token || el.ended || el.paused) {
        followIndex.value = null
        followRaf = 0
        return
      }
      followIndex.value = followWordAt(cues, el.currentTime * 1000)
      followRaf = requestAnimationFrame(tick)
    }
    tick()
  }

  function clearPlaying(token: number) {
    if (seq !== token) return
    clearFollow()
    playingLang.value = null
    playingWord.value = null
    playingRate.value = 1
    playingPhrase.value = null
  }

  function stop() {
    stopShared()
    clearFollow()
    playingLang.value = null
    playingWord.value = null
    playingRate.value = 1
    playingPhrase.value = null
  }

  function playLine(lang: SpeechLang, rate = 1, options: PlayOptions = {}) {
    const current = page.value
    if (!current) return
    const text = plainSpeakText(lang === 'zh' ? current.zh : current.en)
    if (!text) return
    const speed = lang === 'en' ? rate : 1
    stopShared()
    const token = seq
    playingLang.value = lang
    playingWord.value = null
    playingRate.value = speed
    followIndex.value = null
    playingPhrase.value = null
    const done = () => {
      clearPlaying(token)
      options.onEnded?.()
    }
    const blocked = () => {
      clearPlaying(token)
      options.onBlocked?.()
    }
    const skip = () => {
      clearPlaying(token)
    }
    if (lang === 'zh') {
      systemSpeak(text, 'zh', token, done, 1, true)
      return
    }
    const file = String(current.audioEn || '').trim()
    const wantFollow = speed < 1 && Boolean(file)
    if (file) {
      playFile(clipUrl(file), text, lang, token, done, speed, {
        ...options,
        onBlocked: blocked,
        onSilentFail: skip,
        onPlaying: wantFollow
          ? () => {
              void loadTimings(timingsPathFromAudio(file)).then((data) => {
                const el = element()
                if (seq !== token || !data || el.paused || el.ended) return
                const cues = data[current.id]
                if (!cues?.length) return
                startFollow(token, cues)
              })
            }
          : undefined,
      })
      return
    }
    if (options.silent) {
      skip()
      return
    }
    systemSpeak(text, lang, token, done, speed)
  }

  function playWord(word: string) {
    playDevice(word, 'en')
  }

  function playDevice(text: string, lang: SpeechLang) {
    const spoken = plainSpeakText(text)
    if (!spoken) return
    stopShared()
    const token = seq
    playingLang.value = lang === 'zh' ? 'zh' : null
    playingWord.value = lang === 'en' ? spoken : null
    playingRate.value = 1
    followIndex.value = null
    playingPhrase.value = null
    const done = () => clearPlaying(token)
    systemSpeak(spoken, lang, token, done, 1, true)
  }

  function playPhrase(file: string | null | undefined, text: string) {
    const spoken = plainSpeakText(text)
    if (!spoken) return
    stopShared()
    const token = seq
    playingLang.value = null
    playingWord.value = null
    playingRate.value = 1
    followIndex.value = null
    playingPhrase.value = spoken
    const done = () => clearPlaying(token)
    const src = String(file || '').trim()
    if (src) {
      playFile(clipUrl(src), spoken, 'en', token, done, 1)
      return
    }
    systemSpeak(spoken, 'en', token, done, 1, true)
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    window.speechSynthesis?.getVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', () => {
      window.speechSynthesis.getVoices()
    })
    window.addEventListener('pointerdown', unlockAudio, { capture: true })
  })

  watch(
    () => page.value?.id,
    () => stop(),
  )

  onUnmounted(() => {
    stop()
    window.removeEventListener('pointerdown', unlockAudio, { capture: true })
  })

  return {
    playingLang,
    playingWord,
    playingRate,
    followIndex,
    playingPhrase,
    playLine,
    playWord,
    playDevice,
    playPhrase,
    stop,
  }
}
