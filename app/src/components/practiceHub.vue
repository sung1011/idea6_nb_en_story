<script setup lang="ts">
import type { StoryIndexEntry } from '@/types/storyIndex'

defineProps<{
  stories: StoryIndexEntry[]
}>()

const emit = defineEmits<{
  back: []
  pickChapter: [storyId: string]
}>()
</script>

<template>
  <section class="hub">
    <header class="bar">
      <button type="button" class="back tap" aria-label="Back to story" @click="emit('back')">
        ← Back
      </button>
      <h1>Practice Island</h1>
      <span class="spacer" aria-hidden="true" />
    </header>
    <p class="lead">Pick a chapter to practice.</p>
    <ul class="chapters">
      <li v-for="(story, i) in stories" :key="story.id">
        <button type="button" class="chapter tap" @click="emit('pickChapter', story.id)">
          <span class="num">{{ i + 1 }}</span>
          <span class="meta">
            <span class="title">{{ story.title }}</span>
            <span v-if="story.titleZh" class="zh">{{ story.titleZh }}</span>
          </span>
          <span class="chev" aria-hidden="true">›</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.hub {
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
  margin-bottom: 8px;
}

.bar h1 {
  flex: 1;
  margin: 0;
  text-align: center;
  font-size: 1.45rem;
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

.lead {
  margin: 0 0 18px;
  text-align: center;
  color: var(--muted);
}

.chapters {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.chapter {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 64px;
  padding: 12px 16px;
  border: 2px solid rgba(47, 63, 59, 0.18);
  border-radius: 18px;
  background: #fff;
  color: inherit;
  font: inherit;
  text-align: left;
}

.chapter:active {
  transform: scale(0.98);
}

.num {
  flex: 0 0 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(31, 138, 128, 0.16);
  color: var(--teal-dark);
  font-weight: 700;
}

.meta {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
}

.title {
  font-weight: 700;
  overflow-wrap: anywhere;
}

.zh {
  color: var(--muted);
  font-size: 0.92rem;
}

.chev {
  color: var(--muted);
  font-size: 1.4rem;
}

.tap {
  touch-action: manipulation;
}
</style>
