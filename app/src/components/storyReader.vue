<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { LearnItem, Story } from '@/types/story'
import { parseEnSegments } from '@/utils/parseEn'
import { useStoryProgress } from '@/composables/useStoryProgress'
import { usePageSpeech } from '@/composables/usePageSpeech'
import PagePlaceholder from './pagePlaceholder.vue'
import GlossPanel, { type GlossAnchor } from './glossPanel.vue'
import AppSettings from './appSettings.vue'

const props = defineProps<{
  story: Story
}>()

const pageCount = computed(() => props.story.pageCount || props.story.pages.length)
const { pageIndex, next, prev, restart } = useStoryProgress(props.story.id, pageCount.value)

const page = computed(() => {
  return props.story.pages.find((item) => item.index === pageIndex.value) ?? props.story.pages[0]
})
const { playingLang, playingWord, playLine, playWord, stop } = usePageSpeech(page)

const learnItems = computed(() => page.value?.learnItems ?? [])
const learnWords = computed(() => learnItems.value.map((item) => item.word))
const enSegments = computed(() => parseEnSegments(page.value?.en ?? '', learnWords.value))
const canPrev = computed(() => pageIndex.value > 1)
const canNext = computed(() => pageIndex.value < pageCount.value)
const showChinese = computed(() => Boolean(page.value?.zh))
const patternLearn = computed(() => {
  if (!page.value?.pattern?.includes('___')) return null
  return learnItems.value[0] ?? null
})
const openLearn = ref<LearnItem | null>(null)
const openZh = ref(false)
const glossAnchor = ref<GlossAnchor | null>(null)

function findLearnItem(word: string): LearnItem | null {
  const key = word.trim().toLowerCase()
  return learnItems.value.find((item) => item.word.toLowerCase() === key) ?? null
}

function openGloss(word: string, event: Event) {
  const item = findLearnItem(word)
  if (!item) return
  openZh.value = false
  const target = event.currentTarget as HTMLElement | null
  if (target) glossAnchor.value = target.getBoundingClientRect()
  openLearn.value = item
  playWord(item.word, item.audioWord)
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

function toggleZh(event: Event) {
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
  if (target.closest('.chip.tap')) return
  closePanels()
}

function onViewportChange() {
  if (openLearn.value || openZh.value) closePanels()
}

function onKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
  if (event.key === 'Escape' && (openLearn.value || openZh.value)) {
    event.preventDefault()
    closePanels()
    return
  }
  if (event.key === 'ArrowRight' || event.key === 'PageDown') {
    event.preventDefault()
    next()
  } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    event.preventDefault()
    prev()
  } else if (event.key === 'Home') {
    event.preventDefault()
    restart()
  } else if (event.key === 'End') {
    event.preventDefault()
    pageIndex.value = pageCount.value
  }
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
        <p class="kicker">{{ story.label || 'Story' }}</p>
        <h1>
          {{ story.title }}<span v-if="story.titleZh" class="title-zh"> · {{ story.titleZh }}</span>
        </h1>
      </div>
      <AppSettings />
    </header>

    <PagePlaceholder
      :page-index="page.index"
      :image="page.image"
    />

    <section class="copy">
      <div class="en-row">
        <button
          v-if="showChinese"
          type="button"
          class="chip zh tap"
          :class="{ open: openZh }"
          aria-label="Show Chinese"
          :aria-expanded="openZh"
          @click="toggleZh"
        >中文</button>
        <div class="line en" :class="{ playing: playingLang === 'en' }">
          <button
            type="button"
            class="speaker"
            :aria-pressed="playingLang === 'en'"
            aria-label="Play English"
            @click="playLine('en')"
          >
            🔊
          </button>
          <p class="line-text" @click="playLine('en')">
            <template v-for="(seg, i) in enSegments" :key="`${page.id}-${i}`">
              <span :class="{ hl: seg.highlight }">{{ seg.text }}</span>
            </template>
          </p>
        </div>
      </div>
      <div class="meta">
        <button
          v-if="page.pattern"
          type="button"
          class="chip"
          :class="{ tap: Boolean(patternLearn), open: patternLearn && isOpenWord(patternLearn.word) }"
          :disabled="!patternLearn"
          @click="patternLearn && openGloss(patternLearn.word, $event)"
        >{{ page.pattern }}</button>
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

    <nav class="nav" aria-label="Page navigation">
      <button type="button" :disabled="!canPrev" @click="prev">Prev</button>
      <p class="count">{{ page.index }} / {{ pageCount }}</p>
      <button type="button" class="next" :disabled="!canNext" @click="next">Next</button>
    </nav>

    <GlossPanel
      v-if="glossAnchor && (openLearn || openZh)"
      :heading="openLearn?.word"
      :body="openLearn ? openLearn.gloss : (page.zh || '')"
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

.kicker {
  margin: 0 0 4px;
  color: var(--teal);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.78rem;
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

.en-row .chip.zh {
  flex-shrink: 0;
  margin-top: 12px;
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

  .nav button {
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
