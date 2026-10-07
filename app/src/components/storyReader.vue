<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { LearnItem, Story } from '@/types/story'
import { DISPLAY_MODE_OPTIONS } from '@/types/displayMode'
import { parseEnSegments } from '@/utils/parseEn'
import { useStoryProgress } from '@/composables/useStoryProgress'
import { useDisplayMode } from '@/composables/useDisplayMode'
import { usePageSpeech } from '@/composables/usePageSpeech'
import PagePlaceholder from './pagePlaceholder.vue'
import GlossPanel from './glossPanel.vue'

const props = defineProps<{
  story: Story
}>()

const pageCount = computed(() => props.story.pageCount || props.story.pages.length)
const {
  pageIndex,
  resumedFrom,
  next,
  prev,
  dismissResume,
  restart,
} = useStoryProgress(props.story.id, pageCount.value)
const { displayMode } = useDisplayMode()

const page = computed(() => {
  return props.story.pages.find((item) => item.index === pageIndex.value) ?? props.story.pages[0]
})
const { playingLang, playingWord, playLine, playWord, stop } = usePageSpeech(page)

const learnItems = computed(() => page.value?.learnItems ?? [])
const learnWords = computed(() => learnItems.value.map((item) => item.word))
const enSegments = computed(() => parseEnSegments(page.value?.en ?? '', learnWords.value))
const canPrev = computed(() => pageIndex.value > 1)
const canNext = computed(() => pageIndex.value < pageCount.value)
const showEnglish = computed(() => displayMode.value !== 'zh' || !page.value?.zh)
const showChinese = computed(() => displayMode.value !== 'en' && Boolean(page.value?.zh))
const heading = computed(() => {
  if (displayMode.value === 'zh' && props.story.titleZh) return props.story.titleZh
  return props.story.title
})
const subheading = computed(() => {
  if (displayMode.value === 'zh') return props.story.title
  if (displayMode.value === 'en+zh') return props.story.titleZh
  return ''
})
const patternLearn = computed(() => {
  if (!page.value?.pattern?.includes('___')) return null
  return learnItems.value[0] ?? null
})
const openLearn = ref<LearnItem | null>(null)

function findLearnItem(word: string): LearnItem | null {
  const key = word.trim().toLowerCase()
  return learnItems.value.find((item) => item.word.toLowerCase() === key) ?? null
}

function openGloss(word: string) {
  const item = findLearnItem(word)
  if (!item) return
  openLearn.value = item
  playWord(item.word, item.audioWord)
}

function replayGloss() {
  const item = openLearn.value
  if (!item) return
  playWord(item.word, item.audioWord)
}

function closeGloss() {
  openLearn.value = null
}

function isOpenWord(word: string) {
  return openLearn.value?.word.toLowerCase() === word.trim().toLowerCase()
}

function onKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
  if (event.key === 'Escape' && openLearn.value) {
    event.preventDefault()
    closeGloss()
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
    closeGloss()
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  stop()
})
</script>

<template>
  <article v-if="page" class="reader">
    <header class="top">
      <div class="titles">
        <p class="kicker">{{ story.label || 'Story' }}</p>
        <h1>{{ heading }}</h1>
        <p v-if="subheading" class="subtitle">{{ subheading }}</p>
      </div>
      <div class="mode-toggle" role="radiogroup" aria-label="Display language">
        <button
          v-for="opt in DISPLAY_MODE_OPTIONS"
          :key="opt.id"
          type="button"
          role="radio"
          :aria-checked="displayMode === opt.id"
          :aria-label="opt.hint"
          :class="{ active: displayMode === opt.id }"
          @click="displayMode = opt.id"
        >
          {{ opt.label }}
        </button>
      </div>
    </header>

    <aside v-if="resumedFrom" class="resume" role="status">
      <p class="resume-copy">
        上次读到第 {{ resumedFrom }} 页
        <span class="resume-en">Continue from page {{ resumedFrom }}</span>
      </p>
      <div class="resume-actions">
        <button type="button" class="resume-continue" @click="dismissResume">
          继续阅读
        </button>
        <button type="button" class="resume-restart" @click="restart">
          从头读
        </button>
      </div>
    </aside>

    <PagePlaceholder
      :page-index="page.index"
      :focus-word="page.focusWord"
      :image="page.image"
    />

    <section class="copy">
      <div
        v-if="showEnglish"
        class="line en"
        :class="{ playing: playingLang === 'en' }"
      >
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
            <button
              v-if="seg.learnWord && findLearnItem(seg.learnWord)"
              type="button"
              class="tap-word"
              :class="{ hl: seg.highlight, open: isOpenWord(seg.learnWord) }"
              @click.stop="openGloss(seg.learnWord)"
            >{{ seg.text }}</button>
            <span v-else :class="{ hl: seg.highlight }">{{ seg.text }}</span>
          </template>
        </p>
      </div>
      <button
        v-if="showChinese && page.zh"
        type="button"
        class="line zh"
        :class="{ playing: playingLang === 'zh', lead: !showEnglish }"
        :aria-pressed="playingLang === 'zh'"
        aria-label="播放中文"
        @click="playLine('zh')"
      >
        <span class="speaker" aria-hidden="true">🔊</span>
        <span class="line-text">{{ page.zh }}</span>
      </button>
      <GlossPanel
        v-if="openLearn"
        :item="openLearn"
        :playing="Boolean(playingWord)"
        @replay="replayGloss"
        @close="closeGloss"
      />
      <p class="hint">点加粗词看意思 · 点喇叭或句子听整句</p>
      <div class="meta">
        <button
          v-if="page.pattern"
          type="button"
          class="chip"
          :class="{ tap: Boolean(patternLearn), open: patternLearn && isOpenWord(patternLearn.word) }"
          :disabled="!patternLearn"
          @click="patternLearn && openGloss(patternLearn.word)"
        >{{ page.pattern }}</button>
        <button
          v-for="item in learnItems"
          :key="`${page.id}-${item.word}`"
          type="button"
          class="chip word tap"
          :class="{ open: isOpenWord(item.word) }"
          @click="openGloss(item.word)"
        >{{ item.word }}</button>
      </div>
    </section>

    <nav class="nav" aria-label="Page navigation">
      <button type="button" :disabled="!canPrev" @click="prev">上一页</button>
      <p class="count">{{ page.index }} / {{ pageCount }}</p>
      <button type="button" class="next" :disabled="!canNext" @click="next">下一页</button>
    </nav>
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
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
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
  line-height: 1.15;
}

.subtitle {
  margin: 4px 0 0;
  color: var(--muted);
}

.mode-toggle {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: var(--fog);
  border: 3px solid #2f3f3b;
}

.mode-toggle button {
  min-height: 44px;
  min-width: 56px;
  padding: 8px 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font-size: 0.95rem;
  font-weight: 700;
}

.mode-toggle button.active {
  background: var(--paper);
  color: var(--teal-dark);
  box-shadow: 0 2px 0 rgba(47, 63, 59, 0.18);
}

.resume {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 18px;
  border: 3px solid #2f3f3b;
  background: rgba(31, 138, 128, 0.12);
  color: var(--teal-dark);
}

.resume-copy {
  margin: 0;
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.3;
}

.resume-en {
  display: block;
  margin-top: 2px;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--muted);
}

.resume-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.resume-actions button {
  min-height: 48px;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
}

.resume-continue {
  border: 3px solid #2f3f3b;
  background: var(--teal);
  color: white;
}

.resume-restart {
  border: 3px solid #2f3f3b;
  background: var(--paper);
  color: var(--ink);
}

.copy {
  padding: 18px 4px 8px;
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

button.line {
  cursor: pointer;
}

.line.en {
  font-size: 1.55rem;
  line-height: 1.45;
  font-weight: 500;
  color: var(--ink);
}

.line.zh {
  margin-top: 8px;
  color: var(--muted);
  font-size: 1.05rem;
  line-height: 1.5;
}

.line.zh.lead {
  margin-top: 0;
  color: var(--ink);
  font-size: 1.55rem;
  font-weight: 500;
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
  min-width: 0;
  margin: 0;
  cursor: pointer;
}

.hl {
  color: var(--coral);
  font-weight: 700;
}

.tap-word {
  display: inline;
  padding: 0 1px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 4px;
}

.tap-word.hl {
  text-decoration-thickness: 3px;
}

.tap-word.open,
.chip.open {
  background: rgba(224, 106, 78, 0.2);
  box-shadow: 0 0 0 3px rgba(224, 106, 78, 0.28);
}

.hint {
  margin: 10px 2px 0;
  color: var(--muted);
  font-size: 0.88rem;
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

  .top {
    flex-direction: column;
  }

  .mode-toggle {
    width: 100%;
  }

  .mode-toggle button {
    flex: 1;
    min-height: 48px;
  }

  h1 {
    font-size: 1.35rem;
  }

  .line.en,
  .line.zh.lead {
    font-size: 1.28rem;
  }

  .resume {
    flex-direction: column;
    align-items: stretch;
  }

  .resume-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
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

  .line.en,
  .line.zh.lead {
    font-size: 1.75rem;
  }

  .nav button {
    min-height: 64px;
    min-width: 148px;
    font-size: 1.15rem;
  }
}
</style>
