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

let audio: HTMLAudioElement | null = null
let advanceTimer: ReturnType<typeof setTimeout> | null = null
let shakeTimer: ReturnType<typeof setTimeout> | null = null

const round = computed(() => chapter.value?.rounds[roundIndex.value] ?? null)
const item = computed(() => round.value?.items[itemIndex.value] ?? null)
const isWhole = computed(() => item.value?.mode === 'whole')
const sceneBg = computed(() => mediaUrl('games/wormhole-orchard/img/sample-ui.webp'))
const leafBg = computed(() => mediaUrl('games/wormhole-orchard/img/leaf.webp'))

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
  phase.value = 'done'
}

function choose(choice: string) {
  if (phase.value !== 'choose' || !item.value) return
  if (choice === item.value.answer) {
    phase.value = 'correct'
    if (stars.value < 3) stars.value += 1
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
    <header class="bar">
      <button type="button" class="icon-btn tap" aria-label="Back to Games" @click="emit('back')">
        ←
      </button>
      <h1>{{ chapter?.title || 'Worm Hole Orchard' }}</h1>
      <div class="stars" aria-label="Stars">
        <span
          v-for="n in 3"
          :key="n"
          class="star"
          :class="{ on: n <= stars }"
          aria-hidden="true"
        >★</span>
      </div>
    </header>

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
      <div class="hole-wrap" aria-live="polite">
        <div class="hole">
          <span class="hole-text" :class="{ whole: isWhole }">{{ item?.hole }}</span>
        </div>
      </div>
      <button
        type="button"
        class="speaker tap"
        aria-label="Listen again"
        title="Listen again"
        @click="replay"
      >
        🔊
      </button>
      <div class="choices" :class="{ shake: shaking }">
        <button
          v-for="choice in shuffled"
          :key="`${round?.id}-${itemIndex}-${choice}`"
          type="button"
          class="leaf tap"
          :class="{ whole: isWhole }"
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
  background: var(--paper);
  border-radius: 28px;
  box-shadow: var(--shadow);
  padding: 14px 14px 18px;
  overflow: hidden;
}

.bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.bar h1 {
  flex: 1;
  margin: 0;
  text-align: center;
  font-size: 1.2rem;
  color: #6b3f1f;
}

.icon-btn,
.speaker {
  width: 48px;
  height: 48px;
  min-width: 48px;
  border: 0;
  border-radius: 50%;
  background: #3f9d4a;
  color: #fff;
  font-size: 1.25rem;
  font-weight: 700;
  box-shadow: 0 4px 0 rgba(47, 63, 59, 0.2);
}

.stars {
  display: flex;
  gap: 4px;
  min-width: 84px;
  justify-content: flex-end;
}

.star {
  font-size: 1.35rem;
  color: rgba(47, 63, 59, 0.22);
  line-height: 1;
}

.star.on {
  color: #f0b429;
  text-shadow: 0 1px 0 rgba(120, 70, 0, 0.25);
}

.status {
  text-align: center;
  color: var(--muted);
  padding: 40px 12px;
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

.hole-wrap {
  position: absolute;
  left: 50%;
  top: 38%;
  transform: translate(-50%, -50%);
  z-index: 2;
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
    0 0 0 6px rgba(190, 40, 40, 0.35);
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
  left: 3%;
  bottom: 18%;
  z-index: 3;
}

.choices {
  position: absolute;
  left: 50%;
  bottom: 4%;
  transform: translateX(-50%);
  display: flex;
  gap: clamp(8px, 2vw, 18px);
  z-index: 3;
}

.choices.shake {
  animation: shake 0.42s ease;
}

.leaf {
  width: clamp(64px, 14vw, 96px);
  height: clamp(52px, 11vw, 78px);
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
  width: clamp(88px, 18vw, 120px);
}

.leaf:disabled {
  opacity: 0.92;
}

.leaf:not(:disabled):active {
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
  top: 12%;
  transform: translateX(-50%);
  margin: 0;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 253, 247, 0.92);
  color: #6b3f1f;
  font-weight: 700;
  z-index: 4;
  box-shadow: var(--shadow);
}

.done {
  min-height: 360px;
  display: grid;
  place-items: center;
  padding: 24px;
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

@media (max-width: 640px) {
  .orchard {
    padding: 10px;
    border-radius: 18px;
  }

  .stage {
    aspect-ratio: 4 / 5;
  }

  .hole-wrap {
    top: 34%;
  }

  .speaker {
    bottom: 22%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .choices.shake {
    animation: none;
  }
}
</style>
