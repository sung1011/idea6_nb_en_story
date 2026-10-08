<script setup lang="ts">
import type { LearnItem } from '@/types/story'

const props = defineProps<{
  words: LearnItem[]
  patterns: string[]
  openWord?: string | null
}>()

const emit = defineEmits<{
  openWord: [item: LearnItem, event: Event]
  playPhrase: [pattern: string]
}>()

function imageSrc(file: string | null) {
  const name = String(file || '').trim()
  if (!name) return ''
  const base = import.meta.env.BASE_URL
  return `${base}${name.replace(/^\//, '')}`
}

function isOpen(word: string) {
  return props.openWord?.toLowerCase() === word.trim().toLowerCase()
}
</script>

<template>
  <section class="summary" aria-label="Story summary">
    <h2>Words</h2>
    <div class="word-grid">
      <button
        v-for="item in words"
        :key="item.word"
        type="button"
        class="word-card"
        :class="{ open: isOpen(item.word) }"
        @click="emit('openWord', item, $event)"
      >
        <span v-if="imageSrc(item.image)" class="thumb">
          <img :src="imageSrc(item.image)" :alt="item.word" />
        </span>
        <span class="en">{{ item.word }}</span>
        <span v-if="item.gloss" class="zh">{{ item.gloss }}</span>
      </button>
    </div>

    <h2>Sentences</h2>
    <ul class="patterns">
      <li v-for="pattern in patterns" :key="pattern">
        <button
          type="button"
          class="chip pattern"
          :aria-label="`Play phrase ${pattern}`"
          @click="emit('playPhrase', pattern)"
        >{{ pattern }}</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.summary {
  padding: 8px 4px 4px;
}

h2 {
  margin: 8px 0 12px;
  color: var(--teal-dark);
  font-size: 1.2rem;
  font-weight: 800;
}

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}

.word-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 10px 8px 12px;
  border: 3px solid #2f3f3b;
  border-radius: 18px;
  background: var(--paper);
  color: inherit;
  font: inherit;
  box-shadow: 0 3px 0 rgba(47, 63, 59, 0.16);
  text-align: center;
}

.word-card.open {
  background: rgba(224, 106, 78, 0.16);
  box-shadow: 0 0 0 3px rgba(224, 106, 78, 0.28);
}

.thumb {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 14px;
  border: 3px solid #2f3f3b;
  background: #f3ead8;
}

.thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.en {
  margin-top: 4px;
  color: #b4452e;
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.2;
}

.zh {
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.2;
}

.patterns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  padding: 8px 12px;
  border: 0;
  border-radius: 999px;
  background: rgba(31, 138, 128, 0.12);
  color: var(--teal-dark);
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 720px) {
  .word-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 768px) {
  .word-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}
</style>
