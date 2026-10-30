<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import hashes from 'virtual:media-manifest'
import type { LearnItem, Story } from '@/types/story'
import { mediaUrl } from '@/utils/mediaUrl'
import { resetSystemTts, speakSystemTts } from '@/utils/systemTts'
import {
  WORD_MATCH_MIN_PAIRS,
  collectWordCards,
  makeGardenTiles,
  pickWordCards,
  type GardenTile,
} from '@/utils/wordMatchGarden'

const props = defineProps<{
  storyId: string
}>()

const emit = defineEmits<{
  back: []
}>()

type Phase = 'play' | 'done'

const error = ref('')
const loading = ref(true)
const storyTitle = ref('')
const pool = ref<LearnItem[]>([])
const tiles = ref<GardenTile[]>([])
const cleared = ref<Set<string>>(new Set())
const selectedId = ref<string | null>(null)
const shakingIds = ref<string[]>([])
const matchingIds = ref<string[]>([])
const phase = ref<Phase>('play')
const niceTick = ref(0)
const showNice = ref(false)

let audio: HTMLAudioElement | null = null
let shakeTimer: ReturnType<typeof setTimeout> | null = null
let matchTimer: ReturnType<typeof setTimeout> | null = null
let niceTimer: ReturnType<typeof setTimeout> | null = null
let uttering: SpeechSynthesisUtterance | null = null

const remaining = computed(() => tiles.value.filter((tile) => !cleared.value.has(tile.id)).length)

function storiesUrl(file: string) {
  return `${import.meta.env.BASE_URL}stories/${file}`
}

function stopAudio() {
  if (audio) {
    audio.pause()
    audio = null
  }
  resetSystemTts()
  uttering = null
}

function speakFallback(word: string) {
  if (!window.speechSynthesis) return
  const utter = new SpeechSynthesisUtterance(word)
  utter.lang = 'en-US'
  utter.rate = 1
  utter.pitch = 1
  uttering = utter
  speakSystemTts(utter, () => uttering === utter)
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
  if (matchTimer) {
    clearTimeout(matchTimer)
    matchTimer = null
  }
  if (niceTimer) {
    clearTimeout(niceTimer)
    niceTimer = null
  }
}

function dealRound() {
  clearTimers()
  stopAudio()
  selectedId.value = null
  shakingIds.value = []
  matchingIds.value = []
  niceTick.value = 0
  showNice.value = false
  const picked = pickWordCards(pool.value)
  tiles.value = makeGardenTiles(picked)
  cleared.value = new Set()
  phase.value = 'play'
}

function isCleared(id: string) {
  return cleared.value.has(id)
}

function isSelected(id: string) {
  return selectedId.value === id
}

function isShaking(id: string) {
  return shakingIds.value.includes(id)
}

function isMatching(id: string) {
  return matchingIds.value.includes(id)
}

function tileById(id: string | null) {
  if (!id) return null
  return tiles.value.find((tile) => tile.id === id) ?? null
}

function finishMatch(first: GardenTile, second: GardenTile) {
  matchingIds.value = [first.id, second.id]
  niceTick.value += 1
  showNice.value = true
  if (niceTimer) clearTimeout(niceTimer)
  niceTimer = setTimeout(() => {
    showNice.value = false
  }, 700)
  matchTimer = setTimeout(() => {
    const next = new Set(cleared.value)
    next.add(first.id)
    next.add(second.id)
    cleared.value = next
    matchingIds.value = []
    selectedId.value = null
    if (next.size >= tiles.value.length) phase.value = 'done'
  }, 480)
}

function mismatch(first: GardenTile, second: GardenTile) {
  selectedId.value = null
  shakingIds.value = [first.id, second.id]
  shakeTimer = setTimeout(() => {
    shakingIds.value = []
  }, 420)
}

function tapTile(tile: GardenTile) {
  if (phase.value !== 'play') return
  if (isCleared(tile.id) || isMatching(tile.id)) return
  playWordAudio(tile.word)
  if (matchingIds.value.length) return
  if (shakingIds.value.length) shakingIds.value = []
  if (selectedId.value === tile.id) {
    selectedId.value = null
    return
  }
  const first = tileById(selectedId.value)
  if (!first) {
    selectedId.value = tile.id
    return
  }
  if (first.word.toLowerCase() === tile.word.toLowerCase() && first.kind !== tile.kind) {
    finishMatch(first, tile)
    return
  }
  mismatch(first, tile)
}

onMounted(async () => {
  try {
    const response = await fetch(storiesUrl(`${props.storyId}.json`))
    if (!response.ok) throw new Error(`Failed to load story (${response.status})`)
    const story = (await response.json()) as Story
    storyTitle.value = story.title || ''
    const cards = collectWordCards(story)
    if (cards.length < WORD_MATCH_MIN_PAIRS) {
      error.value = 'Need at least 2 word cards to play.'
      return
    }
    pool.value = cards
    dealRound()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load garden'
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  stopAudio()
  clearTimers()
})
</script>

<template>
  <section class="garden">
    <header class="bar">
      <button type="button" class="back tap" aria-label="Back to Games" @click="emit('back')">
        ← Back
      </button>
      <div class="titles">
        <h1>Word Match Garden</h1>
        <p class="zh">词卡小园</p>
      </div>
      <span class="spacer" aria-hidden="true" />
    </header>

    <p v-if="error" class="status error">{{ error }}</p>
    <p v-else-if="loading" class="status">Loading…</p>

    <div v-else-if="phase === 'done'" class="done">
      <div class="done-card">
        <p class="done-title">You did it!</p>
        <p class="done-sub">Every word found its picture.</p>
        <div class="done-actions">
          <button type="button" class="primary tap" @click="dealRound">Play again</button>
          <button type="button" class="ghost tap" @click="emit('back')">Back to Games</button>
        </div>
      </div>
    </div>

    <div v-else class="stage">
      <p v-if="storyTitle" class="story">{{ storyTitle }}</p>
      <p v-if="showNice" class="nice" :key="niceTick">Nice!</p>
      <ul class="board" aria-label="Word and picture tiles">
        <li v-for="tile in tiles" :key="tile.id">
          <button
            type="button"
            class="tile tap"
            :class="[
              tile.kind,
              {
                selected: isSelected(tile.id),
                shake: isShaking(tile.id),
                matching: isMatching(tile.id),
                cleared: isCleared(tile.id),
              },
            ]"
            :disabled="isCleared(tile.id)"
            :aria-label="tile.kind === 'word' ? `Word ${tile.word}` : `Picture ${tile.word}`"
            :aria-pressed="isSelected(tile.id)"
            @click="tapTile(tile)"
          >
            <img
              v-if="tile.kind === 'picture'"
              class="art"
              :src="mediaUrl(tile.image)"
              :alt="tile.word"
              draggable="false"
            />
            <span v-else class="word">{{ tile.word }}</span>
          </button>
        </li>
      </ul>
      <p class="hint">{{ remaining }} tiles left · tap a word and its picture</p>
    </div>
  </section>
</template>

<style scoped>
.garden {
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
  margin-bottom: 16px;
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

.stage {
  position: relative;
}

.story {
  margin: 0 0 10px;
  text-align: center;
  color: var(--muted);
  font-size: 0.95rem;
}

.nice {
  position: absolute;
  left: 50%;
  top: 44px;
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

.board {
  list-style: none;
  max-width: 540px;
  margin: 0 auto;
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  border-radius: 22px;
  background:
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.55), transparent 28%),
    linear-gradient(#9fd0ef 0%, #b7e08a 52%, #7cb86a 100%);
  box-shadow: inset 0 0 0 3px rgba(47, 63, 59, 0.12);
}

.tile {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 3px solid #2f3f3b;
  border-radius: 18px;
  background: #fffdf7;
  color: inherit;
  font: inherit;
  box-shadow: 0 4px 0 rgba(47, 63, 59, 0.18);
  overflow: hidden;
}

.tile.word {
  background: #fff4dc;
}

.tile.selected {
  box-shadow:
    0 0 0 3px rgba(31, 138, 128, 0.55),
    0 4px 0 rgba(47, 63, 59, 0.18);
  border-color: var(--teal-dark);
}

.tile.matching {
  animation: match-pop 0.48s ease;
  border-color: var(--teal-dark);
  background: #e7f6ef;
}

.tile.shake {
  animation: shake 0.42s ease;
}

.tile.cleared {
  visibility: hidden;
  pointer-events: none;
}

.tile:not(:disabled):active {
  transform: scale(0.97);
}

.art {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.word {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 8px;
  color: #b4452e;
  font-size: clamp(1rem, 4.2vw, 1.45rem);
  font-weight: 800;
  line-height: 1.15;
  text-transform: lowercase;
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

@keyframes match-pop {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(0.92);
    opacity: 0.35;
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
  .garden {
    padding: 16px 12px 20px;
    border-radius: 22px;
  }

  .board {
    gap: 8px;
    padding: 10px;
  }

  .titles h1 {
    font-size: 1.15rem;
  }

  .word {
    font-size: clamp(0.92rem, 4.8vw, 1.2rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile.shake,
  .tile.matching,
  .nice {
    animation: none;
  }
}
</style>
