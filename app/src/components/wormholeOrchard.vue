<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { OrchardChapter, OrchardItem } from '@/types/games'
import { mediaUrl } from '@/utils/mediaUrl'

const props = defineProps<{
  storyId: string
}>()

const emit = defineEmits<{
  back: []
}>()

type Phase = 'listen' | 'choose' | 'correct' | 'wrong' | 'bloom' | 'done'

const chapter = ref<OrchardChapter | null>(null)
const error = ref('')
const roundIndex = ref(0)
const itemIndex = ref(0)
const stars = ref(0)
const phase = ref<Phase>('listen')
const shuffled = ref<string[]>([])
const shaking = ref(false)
const bloom = ref(false)
const pickedChoice = ref<string | null>(null)
const pulseStar = ref(0)

let audio: HTMLAudioElement | null = null
let advanceTimer: ReturnType<typeof setTimeout> | null = null
let shakeTimer: ReturnType<typeof setTimeout> | null = null

const round = computed(() => chapter.value?.rounds[roundIndex.value] ?? null)
const item = computed(() => round.value?.items[itemIndex.value] ?? null)
const isWhole = computed(() => item.value?.mode === 'whole')
const sceneBg = computed(() => mediaUrl('games/wormhole-orchard/img/scene-clean.webp'))
const leafBg = computed(() => mediaUrl('games/wormhole-orchard/img/leaf.webp'))
const titleBarBg = computed(() => mediaUrl('games/wormhole-orchard/img/title-bar.webp'))
const btnBack = computed(() => mediaUrl('games/wormhole-orchard/img/btn-back.webp'))
const btnSpeaker = computed(() => mediaUrl('games/wormhole-orchard/img/btn-speaker.webp'))
const starOn = computed(() => mediaUrl('games/wormhole-orchard/img/star-on.webp'))
const starOff = computed(() => mediaUrl('games/wormhole-orchard/img/star-off.webp'))

function gamesUrl(path: string) {
  return `${import.meta.env.BASE_URL}games/${path}`
}

function stopAudio() {
  if (!audio) return
  audio.pause()
  audio = null
}

function playHear(word: string) {
  stopAudio()
  const src = mediaUrl(`games/wormhole-orchard/audio/${word}.mp3`)
  if (!src) return
  const el = new Audio(src)
  audio = el
  void el.play().catch(() => {})
}

function shuffleChoices(choices: string[]) {
  const next = [...choices]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function clearTimers() {
  if (advanceTimer) {
    clearTimeout(advanceTimer)
    advanceTimer = null
  }
  if (shakeTimer) {
    clearTimeout(shakeTimer)
    shakeTimer = null
  }
}

function enterItem(next: OrchardItem) {
  clearTimers()
  shaking.value = false
  bloom.value = false
  pickedChoice.value = null
  pulseStar.value = 0
  shuffled.value = shuffleChoices(next.choices)
  phase.value = 'listen'
  playHear(next.hear)
  phase.value = 'choose'
}

function replay() {
  if (!item.value) return
  playHear(item.value.hear)
}

function goNext() {
  const rounds = chapter.value?.rounds ?? []
  const items = round.value?.items ?? []
  if (itemIndex.value + 1 < items.length) {
    itemIndex.value += 1
    const next = items[itemIndex.value]
    if (next) enterItem(next)
    return
  }
  if (roundIndex.value + 1 < rounds.length) {
    pickedChoice.value = null
    pulseStar.value = 0
    bloom.value = true
    phase.value = 'bloom'
    advanceTimer = setTimeout(() => {
      bloom.value = false
      roundIndex.value += 1
      itemIndex.value = 0
      stars.value = 0
      const next = chapter.value?.rounds[roundIndex.value]?.items[0]
      if (next) enterItem(next)
    }, 1100)
    return
  }
  pickedChoice.value = null
  pulseStar.value = 0
  phase.value = 'done'
}

function choose(choice: string) {
  if (phase.value !== 'choose' || !item.value) return
  if (choice === item.value.answer) {
    pickedChoice.value = choice
    if (stars.value < 3) {
      stars.value += 1
      pulseStar.value = stars.value
    } else {
      pulseStar.value = 0
    }
    phase.value = 'correct'
    advanceTimer = setTimeout(() => goNext(), 650)
    return
  }
  phase.value = 'wrong'
  shaking.value = true
  shakeTimer = setTimeout(() => {
    shaking.value = false
    phase.value = 'choose'
  }, 420)
}

onMounted(async () => {
  try {
    const response = await fetch(gamesUrl(`wormhole-orchard/chapters/${props.storyId}.json`))
    if (!response.ok) throw new Error(`Failed to load orchard (${response.status})`)
    chapter.value = (await response.json()) as OrchardChapter
    const first = chapter.value.rounds[0]?.items[0]
    if (first) enterItem(first)
    else error.value = 'No orchard items'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load orchard'
  }
})

watch(
  () => props.storyId,
  () => {
    stopAudio()
    clearTimers()
  },
)

onUnmounted(() => {
  stopAudio()
  clearTimers()
})
</script>

<template>
  <section class="orchard">
    <p v-if="error" class="status error">{{ error }}</p>
    <p v-else-if="!chapter" class="status">Loading…</p>

    <div v-else-if="phase === 'done'" class="done">
      <div class="done-card">
        <p class="done-title">You did it!</p>
        <p class="done-sub">All three fruit rounds are complete.</p>
        <button type="button" class="primary tap" @click="emit('back')">Back to Games</button>
      </div>
    </div>

    <div v-else class="stage" :class="{ bloom }">
      <img class="scene" :src="sceneBg" alt="" draggable="false" />

      <div class="hud" aria-label="Game controls">
        <img class="title-bar" :src="titleBarBg" alt="" draggable="false" />
        <button type="button" class="btn-back tap" aria-label="Back to Games" @click="emit('back')">
          <img :src="btnBack" alt="" draggable="false" />
        </button>
        <h1 class="title">{{ chapter?.title || 'Worm Hole Orchard' }}</h1>
        <div class="stars" aria-label="Stars">
          <img
            v-for="n in 3"
            :key="n"
            class="star"
            :class="{ 'star-pulse': pulseStar === n }"
            :src="n <= stars ? starOn : starOff"
            alt=""
            draggable="false"
          />
        </div>
      </div>

      <div class="hole-wrap" aria-live="polite">
        <div class="hole">
          <span class="hole-text" :class="{ whole: isWhole }">{{ item?.hole }}</span>
        </div>
        <p v-if="phase === 'correct'" class="great">Great!</p>
      </div>

      <button
        type="button"
        class="speaker tap"
        aria-label="Listen again"
        title="Listen again"
        @click="replay"
      >
        <img :src="btnSpeaker" alt="" draggable="false" />
      </button>

      <div class="choices" :class="{ shake: shaking }">
        <button
          v-for="choice in shuffled"
          :key="`${round?.id}-${itemIndex}-${choice}`"
          type="button"
          class="leaf tap"
          :class="{ whole: isWhole, 'leaf-correct': phase === 'correct' && pickedChoice === choice }"
          :style="{ backgroundImage: `url(${leafBg})` }"
          :disabled="phase !== 'choose' && phase !== 'wrong'"
          :aria-label="`Choose ${choice}`"
          @click="choose(choice)"
        >
          <span class="leaf-text">{{ choice }}</span>
        </button>
      </div>

      <p v-if="bloom" class="bloom-note">Fruit bloom! Next round…</p>
    </div>
  </section>
</template>

<style scoped>
.orchard {
  max-width: 920px;
  margin: 0 auto;
  background: transparent;
  padding: 0;
  overflow: hidden;
}

.status {
  text-align: center;
  color: var(--muted);
  padding: 40px 12px;
  background: var(--paper);
  border-radius: 28px;
  box-shadow: var(--shadow);
}

.error {
  color: var(--coral);
}

.stage {
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: #9fd0ef;
  box-shadow: var(--shadow);
}

.stage.bloom .scene {
  filter: saturate(1.25) brightness(1.08);
}

.scene {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
}

.hud {
  position: absolute;
  left: 50%;
  top: 2.5%;
  transform: translateX(-50%);
  width: min(92%, 640px);
  height: clamp(48px, 12%, 72px);
  z-index: 5;
  pointer-events: none;
}

.title-bar {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
}

.btn-back {
  position: absolute;
  left: 1.5%;
  top: 50%;
  transform: translateY(-50%);
  width: clamp(40px, 11%, 58px);
  height: clamp(40px, 90%, 58px);
  padding: 0;
  border: 0;
  background: transparent;
  pointer-events: auto;
}

.btn-back img,
.speaker img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.title {
  position: absolute;
  left: 14%;
  right: 22%;
  top: 50%;
  transform: translateY(-50%);
  margin: 0;
  text-align: center;
  font-size: clamp(0.85rem, 2.4vw, 1.25rem);
  font-weight: 800;
  color: #6b3f1f;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.stars {
  position: absolute;
  right: 3%;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: clamp(2px, 0.6vw, 6px);
  align-items: center;
  pointer-events: none;
}

.star {
  width: clamp(22px, 5.5vw, 34px);
  height: clamp(22px, 5.5vw, 34px);
  object-fit: contain;
}

.star.star-pulse {
  animation: star-pulse 0.5s ease;
}

.hole-wrap {
  position: absolute;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.great {
  position: absolute;
  left: 50%;
  top: calc(100% + 10px);
  transform: translateX(-50%);
  margin: 0;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(255, 253, 247, 0.92);
  color: #1f8a80;
  font-weight: 800;
  font-size: clamp(0.95rem, 2.4vw, 1.15rem);
  white-space: nowrap;
  box-shadow: var(--shadow);
  animation: great-in 0.45s ease both;
  pointer-events: none;
}

.hole {
  width: clamp(88px, 16vw, 128px);
  height: clamp(88px, 16vw, 128px);
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #3a2a22 0%, #120e0c 70%);
  display: grid;
  place-items: center;
  box-shadow:
    inset 0 8px 16px rgba(0, 0, 0, 0.45),
    0 0 0 5px rgba(190, 40, 40, 0.28);
}

.hole-text {
  color: #fff;
  font-weight: 800;
  font-size: clamp(1.5rem, 4.2vw, 2.3rem);
  letter-spacing: 0.04em;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
}

.hole-text.whole {
  font-size: clamp(1.1rem, 3vw, 1.6rem);
  letter-spacing: 0.08em;
}

.speaker {
  position: absolute;
  left: 3.5%;
  bottom: 14%;
  z-index: 4;
  width: clamp(56px, 11vw, 78px);
  height: clamp(56px, 11vw, 78px);
  padding: 0;
  border: 0;
  background: transparent;
}

.choices {
  position: absolute;
  left: 50%;
  bottom: 5%;
  transform: translateX(-50%);
  display: flex;
  gap: clamp(10px, 2.4vw, 22px);
  z-index: 4;
}

.choices.shake {
  animation: shake 0.42s ease;
}

.leaf {
  width: clamp(68px, 14vw, 100px);
  height: clamp(56px, 11.5vw, 82px);
  min-width: 48px;
  min-height: 48px;
  border: 0;
  background-color: transparent;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  display: grid;
  place-items: center;
  padding: 0;
  filter: drop-shadow(0 4px 0 rgba(40, 70, 30, 0.25));
}

.leaf.whole {
  width: clamp(92px, 18vw, 128px);
}

.leaf:disabled {
  opacity: 0.92;
}

.leaf:not(:disabled):active {
  transform: scale(0.94);
}

.leaf.leaf-correct {
  animation: leaf-bounce 0.45s ease;
}

.btn-back:active,
.speaker:active {
  transform: translateY(-50%) scale(0.94);
}

.speaker:active {
  transform: scale(0.94);
}

.leaf-text {
  color: #fff;
  font-weight: 800;
  font-size: clamp(1.35rem, 3.6vw, 2rem);
  text-shadow:
    0 2px 0 rgba(0, 0, 0, 0.35),
    0 0 6px rgba(0, 0, 0, 0.25);
  text-transform: lowercase;
}

.bloom-note {
  position: absolute;
  left: 50%;
  top: 18%;
  transform: translateX(-50%);
  margin: 0;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 253, 247, 0.92);
  color: #6b3f1f;
  font-weight: 700;
  z-index: 6;
  box-shadow: var(--shadow);
}

.done {
  min-height: 360px;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--paper);
  border-radius: 28px;
  box-shadow: var(--shadow);
}

.done-card {
  text-align: center;
  max-width: 360px;
}

.done-title {
  margin: 0 0 8px;
  font-size: 2rem;
  color: var(--teal-dark);
}

.done-sub {
  margin: 0 0 22px;
  color: var(--muted);
}

.primary {
  min-height: 48px;
  padding: 0 22px;
  border: 2px solid var(--outline);
  border-radius: 999px;
  background: rgba(31, 138, 128, 0.18);
  color: var(--teal-dark);
  font: inherit;
  font-weight: 700;
}

.tap {
  touch-action: manipulation;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(-50%);
  }
  20% {
    transform: translateX(calc(-50% - 8px));
  }
  40% {
    transform: translateX(calc(-50% + 8px));
  }
  60% {
    transform: translateX(calc(-50% - 6px));
  }
  80% {
    transform: translateX(calc(-50% + 6px));
  }
}

@keyframes leaf-bounce {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.14);
  }
  65% {
    transform: scale(0.96);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes great-in {
  0% {
    opacity: 0;
    transform: translate(-50%, 8px);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@keyframes star-pulse {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.28);
  }
  100% {
    transform: scale(1);
  }
}

@media (max-width: 640px) {
  .stage {
    aspect-ratio: 4 / 5;
    border-radius: 18px;
  }

  .hud {
    top: 2%;
    width: 94%;
    height: clamp(44px, 10%, 58px);
  }

  .title {
    font-size: clamp(0.78rem, 3.4vw, 1rem);
    left: 16%;
    right: 24%;
  }

  .hole-wrap {
    top: 38%;
  }

  .speaker {
    left: 4%;
    bottom: 18%;
    width: clamp(52px, 16vw, 68px);
    height: clamp(52px, 16vw, 68px);
  }

  .choices {
    bottom: 6%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .choices.shake,
  .leaf.leaf-correct,
  .star.star-pulse {
    animation: none;
  }

  .great {
    animation: none;
    opacity: 1;
    transform: translateX(-50%);
  }
}
</style>
