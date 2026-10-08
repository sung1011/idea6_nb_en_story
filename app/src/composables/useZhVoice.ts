import { computed, ref } from 'vue'
import { ZH_VOICE_KEY } from '@/utils/appStorage'

export const ZH_VOICE_XIAOXIAO = 'xiaoxiao'
export const ZH_VOICE_DEVICE = 'device'

export type ZhVoiceId = typeof ZH_VOICE_XIAOXIAO | typeof ZH_VOICE_DEVICE

const voice = ref<ZhVoiceId>(readStored())

function readStored(): ZhVoiceId {
  if (typeof localStorage === 'undefined') return ZH_VOICE_XIAOXIAO
  const stored = localStorage.getItem(ZH_VOICE_KEY)
  if (stored === ZH_VOICE_DEVICE) return ZH_VOICE_DEVICE
  return ZH_VOICE_XIAOXIAO
}

function persist(value: ZhVoiceId) {
  try {
    localStorage.setItem(ZH_VOICE_KEY, value)
  } catch {
    /* ignore quota / private mode */
  }
}

export function useZhVoice() {
  function setVoice(next: ZhVoiceId) {
    voice.value = next === ZH_VOICE_DEVICE ? ZH_VOICE_DEVICE : ZH_VOICE_XIAOXIAO
    persist(voice.value)
  }

  return {
    voice,
    setVoice,
    isDevice: computed(() => voice.value === ZH_VOICE_DEVICE),
  }
}
