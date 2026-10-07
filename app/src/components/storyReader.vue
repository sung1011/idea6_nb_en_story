<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { Story } from '@/types/story'
import { parseEnSegments } from '@/utils/parseEn'
import { useStoryProgress } from '@/composables/useStoryProgress'
import PagePlaceholder from './pagePlaceholder.vue'

const props = defineProps<{
  story: Story
}>()

const pageCount = computed(() => props.story.pageCount || props.story.pages.length)
const {
  pageIndex,
  showZh,
  resumedFrom,
  next,
  prev,
  dismissResume,
} = useStoryProgress(props.story.id, pageCount.value)

const page = computed(() => {
  return props.story.pages.find((item) => item.index === pageIndex.value) ?? props.story.pages[0]
})

const enSegments = computed(() => parseEnSegments(page.value?.en ?? ''))
const canPrev = computed(() => pageIndex.value > 1)
const canNext = computed(() => pageIndex.value < pageCount.value)

function onKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
  if (event.key === 'ArrowRight' || event.key === 'PageDown') {
    event.preventDefault()
    next()
  } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    event.preventDefault()
    prev()
  } else if (event.key === 'Home') {
    event.preventDefault()
    pageIndex.value = 1
  } else if (event.key === 'End') {
    event.preventDefault()
    pageIndex.value = pageCount.value
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <article v-if="page" class="reader">
    <header class="top">
      <div>
        <p class="kicker">{{ story.label || 'Story' }}</p>
        <h1>{{ story.title }}</h1>
        <p v-if="story.titleZh" class="subtitle">{{ story.titleZh }}</p>
      </div>
      <label class="zh-toggle">
        <input v-model="showZh" type="checkbox" />
        <span>中文</span>
      </label>
    </header>

    <p v-if="resumedFrom" class="resume">
      Resumed at page {{ resumedFrom }}
      <button type="button" @click="dismissResume">OK</button>
    </p>

    <PagePlaceholder
      :page-index="page.index"
      :focus-word="page.focusWord"
      :image="page.image"
    />

    <section class="copy">
      <p class="en">
        <span
          v-for="(seg, i) in enSegments"
          :key="`${page.id}-${i}`"
          :class="{ hl: seg.highlight }"
        >{{ seg.text }}</span>
      </p>
      <p v-if="showZh && page.zh" class="zh">{{ page.zh }}</p>
      <div class="meta">
        <span v-if="page.pattern" class="chip">{{ page.pattern }}</span>
        <span v-if="page.focusWord" class="chip word">{{ page.focusWord }}</span>
      </div>
    </section>

    <nav class="nav" aria-label="Page navigation">
      <button type="button" :disabled="!canPrev" @click="prev">Prev</button>
      <p class="count">{{ page.index }} / {{ pageCount }}</p>
      <button type="button" class="next" :disabled="!canNext" @click="next">Next</button>
    </nav>
  </article>
</template>

<style scoped>
.reader {
  max-width: 720px;
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

.zh-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--fog);
  font-weight: 600;
}

.zh-toggle input {
  accent-color: var(--teal);
  width: 16px;
  height: 16px;
}

.resume {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 12px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(31, 138, 128, 0.12);
  color: var(--teal-dark);
  font-weight: 500;
}

.resume button {
  border: 0;
  background: var(--teal);
  color: white;
  border-radius: 999px;
  padding: 4px 12px;
}

.copy {
  padding: 18px 4px 8px;
}

.en {
  margin: 0;
  font-size: 1.55rem;
  line-height: 1.45;
  font-weight: 500;
}

.hl {
  color: var(--coral);
  font-weight: 700;
}

.zh {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 1.05rem;
  line-height: 1.5;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(31, 138, 128, 0.12);
  color: var(--teal-dark);
  font-size: 0.92rem;
}

.chip.word {
  background: rgba(224, 106, 78, 0.14);
  color: #b4452e;
}

.nav {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 12px 0 4px;
}

.nav button {
  border: 0;
  background: var(--teal);
  color: white;
  border-radius: 14px;
  padding: 12px 16px;
  font-size: 1rem;
  font-weight: 600;
}

.nav button:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.nav .next {
  justify-self: end;
}

.nav button:first-child {
  justify-self: start;
}

.count {
  margin: 0;
  font-weight: 600;
  color: var(--muted);
}

@media (max-width: 640px) {
  .reader {
    padding: 16px 14px 12px;
    border-radius: 20px;
  }

  h1 {
    font-size: 1.35rem;
  }

  .en {
    font-size: 1.28rem;
  }
}
</style>
