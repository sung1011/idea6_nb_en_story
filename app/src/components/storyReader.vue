<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, toRef, watch } from 'vue'
import type { LearnItem, Story } from '@/types/story'
import type { StoryIndexEntry } from '@/types/storyIndex'
import { parseEnSegments } from '@/utils/parseEn'
import { useStoryProgress } from '@/composables/useStoryProgress'
import { usePageSpeech } from '@/composables/usePageSpeech'
import { useSlowSpeed } from '@/composables/useSlowSpeed'
import { useStoryPreload } from '@/composables/useStoryPreload'
import { useAutoRead } from '@/composables/useAutoRead'
import PagePlaceholder from './pagePlaceholder.vue'
import GlossPanel, { type GlossAnchor } from './glossPanel.vue'
import AppSettings from './appSettings.vue'
import StorySummary from './storySummary.vue'
import StorySwitcher from './storySwitcher.vue'

const props = defineProps<{
  story: Story
  stories: StoryIndexEntry[]
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const pageCount = computed(() => props.story.pageCount || props.story.pages.length)
const { pageIndex, ready, next, prev, restart } = useStoryProgress(props.story.id, pageCount.value)
const onSummary = ref(false)
useStoryPreload(toRef(props, 'story'), pageIndex)

const page = computed(() => {
  return props.story.pages.find((item) => item.index === pageIndex.value) ?? props.story.pages[0]
})
const { playingLang, playingWord, playingRate, playLine, playWord, stop } = usePageSpeech(page)
const { cancelAuto } = useAutoRead(page, onSummary, ready, playLine, stop)
const { rate: slowRate } = useSlowSpeed()
const slowPlaying = computed(() => playingLang.value === 'en' && playingRate.value < 1)

const learnItems = computed(() => page.value?.learnItems ?? [])
const learnWords = computed(() => learnItems.value.map((item) => item.word))
const enSegments = computed(() => parseEnSegments(page.value?.en ?? '', learnWords.value))
const uniqueWords = computed(() => {
  const seen = new Set<string>()
  const items: LearnItem[] = []
  for (const storyPage of props.story.pages) {
    for (const item of storyPage.learnItems ?? []) {
      const key = item.word.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      items.push(item)
    }
  }
  return items
})
const uniquePatterns = computed(() => {
  const seen = new Set<string>()
  const patterns: string[] = []
  for (const storyPage of props.story.pages) {
    const pattern = storyPage.pattern?.trim()
    if (!pattern || seen.has(pattern)) continue
    seen.add(pattern)
    patterns.push(pattern)
  }
  return patterns
})
const canPrev = computed(() => onSummary.value || pageIndex.value > 1)
const canNext = computed(() => !onSummary.value)
const showChinese = computed(() => Boolean(page.value?.zh))
const openLearn = ref<LearnItem | null>(null)
const openZh = ref(false)
const glossAnchor = ref<GlossAnchor | null>(null)

function findLearnItem(word: string): LearnItem | null {
  const key = word.trim().toLowerCase()
  return uniqueWords.value.find((item) => item.word.toLowerCase() === key) ?? null
}

function openGloss(word: string, event: Event) {
  const item = findLearnItem(word)
  if (!item) return
  cancelAuto()
  openZh.value = false
  const target = event.currentTarget as HTMLElement | null
  if (target) glossAnchor.value = target.getBoundingClientRect()
  openLearn.value = item
  playWord(item.word, item.audioWord)
}

function openSummaryWord(item: LearnItem, event: Event) {
  openGloss(item.word, event)
}

function closeGloss() {
  openLearn.value = null
  if (!openZh.value) glossAnchor.value = null
}

function closeZh() {
  openZh.value = false
  if (!openLearn.value) glossAnchor.value = null
}

function closePanels() {
  openLearn.value = null
  openZh.value = false
  glossAnchor.value = null
}

function playSlow() {
  cancelAuto()
  closePanels()
  playLine('en', slowRate.value)
}

function playEnglish() {
  cancelAuto()
  playLine('en')
}

function toggleZh(event: Event) {
  cancelAuto()
  if (openZh.value) {
    closeZh()
    return
  }
  openLearn.value = null
  const target = event.currentTarget as HTMLElement | null
  if (target) glossAnchor.value = target.getBoundingClientRect()
  openZh.value = true
  playLine('zh')
}

function replayPanel() {
  cancelAuto()
  if (openLearn.value) {
    playWord(openLearn.value.word, openLearn.value.audioWord)
    return
  }
  if (openZh.value) playLine('zh')
}

function isOpenWord(word: string) {
  return openLearn.value?.word.toLowerCase() === word.trim().toLowerCase()
}

function onPointerDown(event: PointerEvent) {
  if (!openLearn.value && !openZh.value) return
  const target = event.target as HTMLElement | null
  if (!target) return
  if (target.closest('[data-gloss-panel]')) return
  if (target.closest('.chip.tap, .word-card')) return
  closePanels()
}

function onViewportChange() {
  if (openLearn.value || openZh.value) closePanels()
}

function onKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
  if (document.querySelector('[data-story-switcher-open]')) {
    if (event.key === 'Escape') closePanels()
    return
  }
  if (event.key === 'Escape' && (openLearn.value || openZh.value)) {
    event.preventDefault()
    closePanels()
    return
  }
  if (event.key === 'ArrowRight' || event.key === 'PageDown') {
    event.preventDefault()
    goNext()
  } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    event.preventDefault()
    goPrev()
  } else if (event.key === 'Home') {
    event.preventDefault()
    goRestart()
  } else if (event.key === 'End') {
    event.preventDefault()
    onSummary.value = false
    pageIndex.value = pageCount.value
  }
}

function goNext() {
  if (onSummary.value) return
  if (pageIndex.value >= pageCount.value) {
    closePanels()
    onSummary.value = true
    return
  }
  next()
}

function goPrev() {
  if (onSummary.value) {
    closePanels()
    onSummary.value = false
    return
  }
  prev()
}

function goRestart() {
  closePanels()
  onSummary.value = false
  restart()
}

watch(
  () => page.value?.id,
  () => {
    closePanels()
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
  stop()
})
</script>

<template>
  <article v-if="page" class="reader">
    <header class="top">
      <div class="titles">
        <StorySwitcher
          :stories="stories"
          :current-id="story.id"
          @select="emit('select', $event)"
        />
        <h1>
          {{ story.title }}<span v-if="story.titleZh" class="title-zh"> · {{ story.titleZh }}</span>
        </h1>
      </div>
      <AppSettings />
    </header>

    <template v-if="!onSummary">
      <PagePlaceholder
        :page-index="page.index"
        :image="page.image"
      />

      <section class="copy">
        <div class="en-row">
          <div class="side-btns">
            <button
              v-if="showChinese"
              type="button"
              class="chip zh tap side-chip"
              :class="{ open: openZh }"
              aria-label="Chinese translation"
              :aria-expanded="openZh"
              @click="toggleZh"
            >
              <svg class="side-icon icon-bubble" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M4.4 3.8h15.2A2.8 2.8 0 0 1 22.4 6.6v8.1a2.8 2.8 0 0 1-2.8 2.8h-7.15l-5.35 4.05v-4.05H4.4A2.8 2.8 0 0 1 1.6 14.7V6.6A2.8 2.8 0 0 1 4.4 3.8Z"
                />
              </svg>
              <span>CN</span>
            </button>
            <button
              type="button"
              class="chip slow tap side-chip"
              :class="{ playing: slowPlaying }"
              aria-label="Read slowly"
              :aria-pressed="slowPlaying"
              @click="playSlow"
            >
              <svg class="side-icon icon-snail" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  fill-rule="evenodd"
                  d="M9.1 4.2a6.7 6.7 0 0 1 4.7 11.5c1.1.1 2.3.15 3.55.05 2.5-.2 4.55-.75 5.35-1.75.4-.5 1.2-.15 1.05.6-.4 1.7-2.8 2.95-6.15 3.15-2.55.15-5.4-.25-7.5-1.5A6.7 6.7 0 0 1 9.1 4.2Zm0 2.45a4.25 4.25 0 1 0 0 8.5 4.25 4.25 0 0 0 0-8.5Zm0 2.35a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8Z"
                />
                <path
                  fill="currentColor"
                  d="M17.4 10.15c.2-1.4 1.15-2.55 2.15-3.1.4-.22.85.28.62.7-.55.95-1.05 1.75-1.18 2.65l-1.59-.25Zm1.82.18c.48-1.15 1.6-1.95 2.58-2.15.48-.1.72.5.38.8-.78.55-1.52 1.15-1.72 2.05l-1.24-.7Z"
                />
              </svg>
              <span>Slow</span>
            </button>
          </div>
          <div class="line en" :class="{ playing: playingLang === 'en' }">
            <button
              type="button"
              class="speaker"
              :aria-pressed="playingLang === 'en'"
              aria-label="Play English"
              @click="playEnglish"
            >
              🔊
            </button>
            <p class="line-text" @click="playEnglish">
              <template v-for="(seg, i) in enSegments" :key="`${page.id}-${i}`">
                <span :class="{ hl: seg.highlight }">{{ seg.text }}</span>
              </template>
            </p>
          </div>
        </div>
        <div class="meta">
          <p v-if="page.pattern && page.pattern !== '—'" class="chip pattern">{{ page.pattern }}</p>
          <button
            v-for="item in learnItems"
            :key="`${page.id}-${item.word}`"
            type="button"
            class="chip word tap"
            :class="{ open: isOpenWord(item.word) }"
            @click="openGloss(item.word, $event)"
          >{{ item.word }}</button>
        </div>
      </section>
    </template>

    <StorySummary
      v-else
      :words="uniqueWords"
      :patterns="uniquePatterns"
      :open-word="openLearn?.word"
      @open-word="openSummaryWord"
    />

    <nav class="nav" aria-label="Page navigation">
      <button type="button" :disabled="!canPrev" @click="goPrev">Prev</button>
      <p v-if="!onSummary" class="count">{{ page.index }} / {{ pageCount }}</p>
      <p v-else class="count">Summary</p>
      <button type="button" class="next" :disabled="!canNext" @click="goNext">Next</button>
    </nav>
    <button
      v-if="onSummary"
      type="button"
      class="again"
      @click="goRestart"
    >
      Read again
    </button>

    <GlossPanel
      v-if="glossAnchor && (openLearn || openZh)"
      :heading="openLearn?.word"
      :body="openLearn ? openLearn.gloss : (page.zh || '')"
      :image="openLearn?.image"
      :playing="openLearn ? Boolean(playingWord) : playingLang === 'zh'"
      :anchor="glossAnchor"
      :ariaLabel="openLearn ? 'Word meaning' : 'Chinese translation'"
      @replay="replayPanel"
      @close="openLearn ? closeGloss() : closeZh()"
    />
  </article>
</template>

<style scoped>
.reader {
  max-width: 840px;
  margin: 0 auto;
  background: var(--paper);
  border-radius: 28px;
  box-shadow: var(--shadow);
  padding: 22px 22px 18px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.titles {
  min-width: 0;
  flex: 1;
}

h1 {
  margin: 0;
  font-size: 1.7rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.title-zh {
  font-size: 0.62em;
  font-weight: 500;
  color: var(--muted);
}

.copy {
  padding: 18px 4px 8px;
}

.en-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.side-btns {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  margin-top: 12px;
}

.en-row .chip.zh,
.en-row .chip.slow {
  margin: 0;
}

.side-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 44px;
  min-width: 44px;
  min-height: 48px;
  padding: 6px 4px 5px;
  font-size: 0.7rem;
  line-height: 1;
  letter-spacing: 0.02em;
}

.side-icon {
  display: block;
  width: 16px;
  height: 16px;
}

.chip.slow {
  background: rgba(31, 138, 128, 0.12);
  color: var(--teal-dark);
}

.chip.slow.playing {
  background: rgba(31, 138, 128, 0.28);
  box-shadow: 0 0 0 3px rgba(31, 138, 128, 0.28);
}

.en-row .line {
  flex: 1;
  min-width: 0;
  width: auto;
}

.line {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  margin: 0;
  padding: 12px 14px;
  border: 3px solid transparent;
  border-radius: 18px;
  background: transparent;
  text-align: left;
  color: inherit;
  font: inherit;
}

.line.en {
  font-size: 1.55rem;
  line-height: 1.45;
  font-weight: 500;
  color: var(--ink);
}

.line:hover,
.line:focus-visible {
  background: rgba(31, 138, 128, 0.08);
  border-color: rgba(47, 63, 59, 0.28);
}

.line.playing {
  background: rgba(31, 138, 128, 0.14);
  border-color: #2f3f3b;
  box-shadow: 0 3px 0 rgba(47, 63, 59, 0.16);
}

.speaker {
  flex-shrink: 0;
  margin-top: 0.05em;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 0.72em;
  line-height: 1;
  opacity: 0.72;
}

button.speaker {
  min-width: 44px;
  min-height: 44px;
  border-radius: 14px;
}

.line.playing .speaker,
button.speaker[aria-pressed='true'] {
  opacity: 1;
}

.line-text {
  display: block;
  flex: 1;
  min-width: 0;
  margin: 0;
  cursor: pointer;
}

.line.en .line-text {
  min-height: calc(2 * 1.45em);
}

.hl {
  color: var(--coral);
  font-weight: 700;
}

.chip.open {
  background: rgba(224, 106, 78, 0.2);
  box-shadow: 0 0 0 3px rgba(224, 106, 78, 0.28);
}

.chip.zh.open {
  background: rgba(31, 138, 128, 0.28);
  box-shadow: 0 0 0 3px rgba(31, 138, 128, 0.28);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.chip {
  padding: 8px 12px;
  border: 0;
  border-radius: 999px;
  background: rgba(31, 138, 128, 0.12);
  color: var(--teal-dark);
  font-size: 0.92rem;
  font-weight: 700;
}

.chip.word {
  background: rgba(224, 106, 78, 0.14);
  color: #b4452e;
}

.chip.tap {
  min-height: 40px;
}

.chip.pattern {
  margin: 0;
  cursor: default;
  pointer-events: none;
}

.chip:disabled {
  cursor: default;
}

.nav {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 12px 0 4px;
}

.nav button {
  min-height: 56px;
  min-width: 120px;
  border: 3px solid #2f3f3b;
  background: var(--teal);
  color: white;
  border-radius: 18px;
  padding: 14px 18px;
  font-size: 1.1rem;
  font-weight: 700;
  box-shadow: 0 4px 0 #2f3f3b;
}

.nav button:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  box-shadow: none;
}

.nav .next {
  justify-self: end;
}

.nav button:first-child {
  justify-self: start;
}

.count {
  margin: 0;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--muted);
}

.again {
  display: block;
  width: 100%;
  min-height: 56px;
  margin: 4px 0 0;
  border: 3px solid #2f3f3b;
  background: var(--coral);
  color: white;
  border-radius: 18px;
  padding: 14px 18px;
  font-size: 1.1rem;
  font-weight: 700;
  box-shadow: 0 4px 0 #2f3f3b;
}

@media (max-width: 720px) {
  .reader {
    padding: 16px 14px 12px;
    border-radius: 20px;
  }

  h1 {
    font-size: 1.35rem;
  }

  .line.en {
    font-size: 1.28rem;
  }

  .nav button,
  .again {
    min-width: 0;
    width: 100%;
    min-height: 56px;
    font-size: 1.05rem;
  }
}

@media (min-width: 768px) {
  .reader {
    padding: 28px 32px 24px;
  }

  h1 {
    font-size: 1.9rem;
  }

  .line.en {
    font-size: 1.75rem;
  }

  .nav button {
    min-height: 64px;
    min-width: 148px;
    font-size: 1.15rem;
  }
}
</style>
