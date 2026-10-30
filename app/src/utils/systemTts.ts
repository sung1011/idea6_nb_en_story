/** Chrome / iOS Safari drop speak() in the same turn as cancel(), or stay paused. */
const SPEAK_AFTER_CANCEL_MS = 50

let speakTimer = 0

function synthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null
  return window.speechSynthesis ?? null
}

function clearSpeakTimer(): void {
  if (!speakTimer) return
  window.clearTimeout(speakTimer)
  speakTimer = 0
}

export function resetSystemTts(): void {
  clearSpeakTimer()
  const synth = synthesis()
  if (!synth) return
  synth.cancel()
  if (synth.paused) synth.resume()
}

export function speakSystemTts(
  utter: SpeechSynthesisUtterance,
  shouldSpeak?: () => boolean,
): void {
  const synth = synthesis()
  if (!synth) return
  resetSystemTts()
  const kick = () => {
    if (shouldSpeak && !shouldSpeak()) return
    if (synth.paused) synth.resume()
    synth.speak(utter)
    if (synth.paused) synth.resume()
  }
  speakTimer = window.setTimeout(() => {
    speakTimer = 0
    kick()
  }, SPEAK_AFTER_CANCEL_MS)
}
