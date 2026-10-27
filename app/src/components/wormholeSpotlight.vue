<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import hashes from 'virtual:media-manifest'
import type { LearnItem, Story } from '@/types/story'
import { mediaUrl } from '@/utils/mediaUrl'
import {
  SPOTLIGHT_MIN_WORDS,
  collectWordCards,
  makeSpotlightRound,
  type SpotlightQuestion,
} from '@/utils/wormholeSpotlight'

const props = defineProps<{
  storyId: string
}>()

const emit = defineEmits<{
  back: []
}>()

type Phase = 'play' | 'correct' | 'done'

const TAP_SLOP = 12

const error = ref('')
const loading = ref(true)
const storyTitle = ref('')
const pool = ref<LearnItem[]>([])
const questions = ref<SpotlightQuestion[]>([])
const questionIndex = ref(0)
const phase = ref<Phase>('play')
const shakingWord = ref('')
const niceTick = ref(0)
const showNice = ref(false)
const spot = ref({ x: 0.5, y: 0.42 })
const stageW = ref(320)
const stageH = ref(240)
const dragging = ref(false)

const stageRef = ref<HTMLElement | null>(null)
const speakerSrc = computed(() => mediaUrl('games/wormhole-orchard/img/btn-speaker.webp'))

let audio: HTMLAudioElement | null = null
let shakeTimer: ReturnType<typeof setTimeout> | null = null
let advanceTimer: ReturnType<typeof setTimeout> | null = null
let niceTimer: ReturnType<typeof setTimeout> | null = null
let uttering: SpeechSynthesisUtterance | null = null
let resizeObserver: ResizeObserver | null = null
let pointerId: number | null = null
let startClient = { x: 0, y: 0 }
let startSpot = { x: 0.5, y: 0.42 }
let moved = false

const current = computed(() => questions.value[questionIndex.value] ?? null)
const questionLabel = computed(() => `${questionIndex.value + 1} / ${questions.value.length || 6}`)
const radius = computed(() => Math.round(Math.max(70, Math.min(stageW.value, stageH.value) * 0.22)))

const stageVars = computed(() => ({
  '--spot-x': `${spot.value.x * 100}%`,
  '--spot-y': `${spot.value.y * 100}%`,
  '--spot-r': `${radius.value}px`,
}))

const veilStyle = computed(() => {
  const r = radius.value
  const mask = `radial-gradient(circle ${r}px at ${spot.value.x * 100}% ${spot.value.y * 100}%, transparent ${Math.max(0, r - 3)}px, #000 ${r}px)`
  return {
    WebkitMaskImage: mask,
    maskImage: mask,
  }
})

function storiesUrl(file: string) {
  return `${import.meta.env.BASE_URL}stories/${file}`
}

function stopAudio() {
  if (audio) {
    audio.pause()
    audio = null
  }
  if (uttering) {
    window.speechSynthesis?.cancel()
    uttering = null
  }
}

function speakFallback(word: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(word)
  utter.lang = 'en-US'
  utter.rate = 1
  utter.pitch = 1
  uttering = utter
  window.speechSynthesis.speak(utter)
}

function playWordAudio(word: string) {
  stopAudio()
  const key = word.trim().toLowerCase()
  if (!key) return
  const file = `games/wormhole-orchard/audio/${key}.mp3`
  if (!hashes[file]) {
    speakFallback(key)
    return
  }
  const src = mediaUrl(file)
  if (!src) {
    speakFallback(key)
    return
  }
  const el = new Audio(src)
  audio = el
  void el.play().catch(() => {
    if (audio === el) speakFallback(key)
  })
}

function clearTimers() {
  if (shakeTimer) {
    clearTimeout(shakeTimer)
    shakeTimer = null
  }
  if (advanceTimer) {
    clearTimeout(advanceTimer)
    advanceTimer = null
  }
  if (niceTimer) {
    clearTimeout(niceTimer)
    niceTimer = null
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function syncStageSize() {
  const el = stageRef.value
  if (!el) return
  stageW.value = el.clientWidth || 320
  stageH.value = el.clientHeight || 240
}

function resetSpot() {
  spot.value = { x: 0.5, y: 0.42 }
}

function enterQuestion() {
  resetSpot()
  shakingWord.value = ''
  showNice.value = false
  const word = current.value?.target
  if (word) playWordAudio(word)
}

function dealRound() {
  clearTimers()
  stopAudio()
  shakingWord.value = ''
  niceTick.value = 0
  showNice.value = false
  questions.value = makeSpotlightRound(pool.value)
  questionIndex.value = 0
  phase.value = 'play'
  void nextTick(() => {
    syncStageSize()
    enterQuestion()
  })
}

function replay() {
  const word = current.value?.target
  if (!word || phase.value === 'done') return
  playWordAudio(word)
}

function goNext() {
  if (questionIndex.value + 1 < questions.value.length) {
    questionIndex.value += 1
    phase.value = 'play'
    enterQuestion()
    return
  }
  phase.value = 'done'
}

function pickCard(word: string) {
  if (phase.value !== 'play' || !current.value) return
  if (word.toLowerCase() === current.value.target.toLowerCase()) {
    shakingWord.value = ''
    phase.value = 'correct'
    niceTick.value += 1
    showNice.value = true
    if (niceTimer) clearTimeout(niceTimer)
    niceTimer = setTimeout(() => {
      showNice.value = false
    }, 700)
    advanceTimer = setTimeout(() => goNext(), 720)
    return
  }
  shakingWord.value = word
  if (shakeTimer) clearTimeout(shakeTimer)
  shakeTimer = setTimeout(() => {
    shakingWord.value = ''
  }, 420)
}

function pointInSpot(clientX: number, clientY: number) {
  const el = stageRef.value
  if (!el) return false
  const box = el.getBoundingClientRect()
  const px = clientX - box.left
  const py = clientY - box.top
  const cx = spot.value.x * box.width
  const cy = spot.value.y * box.height
  return Math.hypot(px - cx, py - cy) <= radius.value
}

function cardAtPoint(clientX: number, clientY: number) {
  const root = stageRef.value
  if (!root) return ''
  const pics = root.querySelectorAll<HTMLElement>('[data-word]')
  for (const pic of pics) {
    const box = pic.getBoundingClientRect()
    if (clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom) {
      return pic.dataset.word || ''
    }
  }
  return ''
}

function onPointerDown(event: PointerEvent) {
  if (phase.value === 'done' || phase.value === 'correct') return
  const el = stageRef.value
  if (!el) return
  pointerId = event.pointerId
  moved = false
  dragging.value = false
  startClient = { x: event.clientX, y: event.clientY }
  startSpot = { ...spot.value }
  el.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (pointerId !== event.pointerId) return
  const dx = event.clientX - startClient.x
  const dy = event.clientY - startClient.y
  if (!moved && Math.hypot(dx, dy) < TAP_SLOP) return
  moved = true
  dragging.value = true
  const w = stageW.value || 1
  const h = stageH.value || 1
  const mX = radius.value / w
  const mY = radius.value / h
  spot.value = {
    x: clamp(startSpot.x + dx / w, mX, 1 - mX),
    y: clamp(startSpot.y + dy / h, mY, 1 - mY),
  }
}

function endPointer(event: PointerEvent) {
  if (pointerId !== event.pointerId) return
  const wasMoved = moved
  pointerId = null
  dragging.value = false
  moved = false
  try {
    stageRef.value?.releasePointerCapture(event.pointerId)
  } catch {
    /* already released */
  }
  if (wasMoved || phase.value !== 'play') return
  if (!pointInSpot(event.clientX, event.clientY)) return
  const word = cardAtPoint(event.clientX, event.clientY)
  if (word) pickCard(word)
}

onMounted(async () => {
  try {
    const response = await fetch(storiesUrl(`${props.storyId}.json`))
    if (!response.ok) throw new Error(`Failed to load story (${response.status})`)
    const story = (await response.json()) as Story
    storyTitle.value = story.title || ''
    const cards = collectWordCards(story)
    if (cards.length < SPOTLIGHT_MIN_WORDS) {
      error.value = 'Need at least 3 word cards to play.'
      return
    }
    pool.value = cards
    loading.value = false
    await nextTick()
    dealRound()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load spotlight'
  } finally {
    loading.value = false
  }
})

watch(stageRef, (el) => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (!el || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(() => syncStageSize())
  resizeObserver.observe(el)
  syncStageSize()
})

onUnmounted(() => {
  stopAudio()
  clearTimers()
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <section class="spotlight">
    <header class="bar">
      <button type="button" class="back tap" aria-label="Back to Games" @click="emit('back')">
        ← Back
      </button>
      <div class="titles">
        <h1>Wormhole Spotlight</h1>
        <p class="zh">虫洞探照灯</p>
      </div>
      <span class="spacer" aria-hidden="true" />
    </header>

    <p v-if="error" class="status error">{{ error }}</p>
    <p v-else-if="loading" class="status">Loading…</p>

    <div v-else-if="phase === 'done'" class="done">
      <div class="done-card">
        <p class="done-title">You did it!</p>
        <p class="done-sub">Six pictures found in the light.</p>
        <div class="done-actions">
          <button type="button" class="primary tap" @click="dealRound">Play again</button>
          <button type="button" class="ghost tap" @click="emit('back')">Back to Games</button>
        </div>
      </div>
    </div>

    <div v-else class="play">
      <div class="meta">
        <p v-if="storyTitle" class="story">{{ storyTitle }}</p>
        <p class="count" aria-live="polite">{{ questionLabel }}</p>
        <button
          type="button"
          class="speaker tap"
          aria-label="Listen again"
          title="Listen again"
          @click="replay"
        >
          <img v-if="speakerSrc" :src="speakerSrc" alt="" draggable="false" />
          <span v-else>Listen</span>
        </button>
      </div>

      <div
        ref="stageRef"
        class="stage"
        :class="{ dragging }"
        :style="stageVars"
        role="application"
        aria-label="Dark stage with a draggable spotlight. Tap a picture inside the light."
        @pointerdown.prevent="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="endPointer"
        @pointercancel="endPointer"
      >
        <div
          v-for="card in current?.cards || []"
          :key="`${questionIndex}-${card.word}`"
          class="pic"
          :class="{ shake: shakingWord === card.word, correct: phase === 'correct' && card.word === current?.target }"
          :data-word="card.word"
          :style="{ left: `${card.left}%`, top: `${card.top}%` }"
        >
          <img :src="mediaUrl(card.image)" :alt="card.word" draggable="false" />
        </div>
        <div class="veil" :style="veilStyle" aria-hidden="true" />
        <div class="beam" aria-hidden="true" />
        <p v-if="showNice" class="nice" :key="niceTick">Nice!</p>
      </div>
      <p class="hint">Drag the light. Tap a picture inside it.</p>
    </div>
  </section>
</template>

<style scoped>
.spotlight {
  max-width: 720px;
  margin: 0 auto;
  background: var(--paper);
  border-radius: 28px;
  box-shadow: var(--shadow);
  padding: 22px 22px 28px;
}

.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.titles {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.titles h1 {
  margin: 0;
  font-size: 1.35rem;
}

.zh {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 0.92rem;
}

.back {
  min-height: 44px;
  padding: 0 14px;
  border: 2px solid var(--outline);
  border-radius: 999px;
  background: rgba(31, 138, 128, 0.14);
  color: var(--teal-dark);
  font: inherit;
  font-weight: 700;
}

.spacer {
  width: 72px;
}

.status {
  text-align: center;
  color: var(--muted);
  padding: 28px 8px;
}

.error {
  color: var(--coral);
}

.meta {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.story,
.count {
  margin: 0;
  color: var(--muted);
  font-size: 0.95rem;
}

.count {
  font-weight: 700;
  color: var(--teal-dark);
}

.speaker {
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  background: transparent;
}

.speaker img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.stage {
  position: relative;
  overflow: hidden;
  height: min(62vh, 520px);
  min-height: 280px;
  border-radius: 22px;
  background:
    radial-gradient(circle at 20% 18%, rgba(70, 90, 110, 0.35), transparent 36%),
    linear-gradient(#1a2430, #0b1016 62%, #07090d);
  box-shadow: inset 0 0 0 3px rgba(47, 63, 59, 0.16);
  touch-action: none;
  user-select: none;
  cursor: grab;
}

.stage.dragging {
  cursor: grabbing;
}

.pic {
  position: absolute;
  width: 34%;
  aspect-ratio: 1;
  padding: 0;
  border: 3px solid #fffdf7;
  border-radius: 18px;
  overflow: hidden;
  background: #fffdf7;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.pic img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.pic.shake {
  z-index: 1;
  border-color: var(--coral);
  animation: shake 0.42s ease;
}

.pic.correct {
  border-color: #7ec8c0;
  box-shadow: 0 0 0 3px rgba(31, 138, 128, 0.55);
}

.veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgba(3, 6, 10, 0.9);
}

.beam {
  position: absolute;
  width: calc(var(--spot-r) * 2);
  height: calc(var(--spot-r) * 2);
  left: var(--spot-x);
  top: var(--spot-y);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 3px solid rgba(255, 236, 176, 0.88);
  box-shadow:
    0 0 18px rgba(255, 236, 176, 0.35),
    inset 0 0 22px rgba(255, 252, 230, 0.18);
  pointer-events: none;
}

.nice {
  position: absolute;
  left: 50%;
  top: 18px;
  z-index: 3;
  margin: 0;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(255, 253, 247, 0.94);
  color: var(--teal-dark);
  font-weight: 800;
  box-shadow: var(--shadow);
  transform: translateX(-50%);
  animation: nice-in 0.45s ease both;
  pointer-events: none;
}

.hint {
  margin: 12px 0 0;
  text-align: center;
  color: var(--muted);
  font-size: 0.9rem;
}

.done {
  min-height: 280px;
  display: grid;
  place-items: center;
  padding: 18px 8px 8px;
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

.done-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.primary,
.ghost {
  min-height: 48px;
  min-width: 180px;
  padding: 0 22px;
  border: 2px solid var(--outline);
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
}

.primary {
  background: rgba(31, 138, 128, 0.18);
  color: var(--teal-dark);
}

.ghost {
  background: #fff;
  color: var(--ink);
}

.tap {
  touch-action: manipulation;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-8px);
  }
  40% {
    transform: translateX(8px);
  }
  60% {
    transform: translateX(-6px);
  }
  80% {
    transform: translateX(6px);
  }
}

@keyframes nice-in {
  0% {
    opacity: 0;
    transform: translate(-50%, 8px);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@media (max-width: 480px) {
  .spotlight {
    padding: 16px 12px 20px;
    border-radius: 22px;
  }

  .titles h1 {
    font-size: 1.12rem;
  }

  .stage {
    height: min(58vh, 460px);
    min-height: 260px;
    border-radius: 18px;
  }

  .pic {
    width: 38%;
  }

  .meta {
    grid-template-columns: 1fr auto auto;
  }

  .story {
    font-size: 0.85rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pic.shake,
  .nice {
    animation: none;
  }
}
</style>
