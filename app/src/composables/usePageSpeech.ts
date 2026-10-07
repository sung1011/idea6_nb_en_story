import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { StoryPage } from '@/types/story'

export type SpeechLang = 'en' | 'zh'

/** One silent wav so the first tap can unlock audio on iOS. */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

let sharedAudio: HTMLAudioElement | null = null
let unlocked = false
let seq = 0

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

function stopShared(): void {
  seq += 1
  window.speechSynthesis?.cancel()
  if (sharedAudio) {
    sharedAudio.onended = null
    sharedAudio.onerror = null
    sharedAudio.pause()
  }
}

function systemSpeak(text: string, lang: SpeechLang, token: number, onDone: () => void): void {
  if (!window.speechSynthesis || seq !== token) {
    onDone()
    return
  }
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = lang === 'zh' ? 'zh-CN' : 'en-US'
  utter.rate = lang === 'zh' ? 1 : 0.86
  utter.pitch = 1.12
  if (lang === 'zh') {
    const voice = pickZhVoice()
    if (voice) utter.voice = voice
  }
  const finish = () => {
    if (seq !== token) return
    onDone()
  }
  utter.onend = finish
  utter.onerror = finish
  window.speechSynthesis.speak(utter)
}

function playFile(
  src: string,
  text: string,
  lang: SpeechLang,
  token: number,
  onDone: () => void,
): void {
  const el = element()
  let handed = false
  const fail = () => {
    if (seq !== token || handed) return
    handed = true
    el.onended = null
    el.onerror = null
    systemSpeak(text, lang, token, onDone)
  }
  el.onended = null
  el.onerror = null
  el.pause()
  el.src = src
  el.onended = () => {
    if (seq !== token || handed) return
    handed = true
    onDone()
  }
  el.onerror = fail
  void el.play().catch(fail)
}

export function usePageSpeech(page: Ref<StoryPage | undefined>) {
  const playingLang = ref<SpeechLang | null>(null)
  const playingWord = ref<string | null>(null)

  function clearPlaying(token: number) {
    if (seq !== token) return
    playingLang.value = null
    playingWord.value = null
  }

  function stop() {
    stopShared()
    playingLang.value = null
    playingWord.value = null
  }

  function playLine(lang: SpeechLang) {
    const current = page.value
    if (!current) return
    const text = plainSpeakText(lang === 'zh' ? current.zh : current.en)
    if (!text) return
    stopShared()
    const token = seq
    playingLang.value = lang
    playingWord.value = null
    const file = lang === 'zh' ? current.audioZh : current.audioEn
    const done = () => clearPlaying(token)
    if (file) {
      playFile(clipUrl(file), text, lang, token, done)
      return
    }
    systemSpeak(text, lang, token, done)
  }

  function playWord(word: string, file?: string | null) {
    const text = plainSpeakText(word)
    if (!text) return
    stopShared()
    const token = seq
    playingLang.value = null
    playingWord.value = text
    const done = () => clearPlaying(token)
    if (file) {
      playFile(clipUrl(file), text, 'en', token, done)
      return
    }
    systemSpeak(text, 'en', token, done)
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
    playLine,
    playWord,
    stop,
  }
}
