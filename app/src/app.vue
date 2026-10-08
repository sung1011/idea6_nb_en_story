<script setup lang="ts">
import { onMounted, ref } from 'vue'
import StoryReader from './components/storyReader.vue'
import type { Story } from './types/story'
import { parseStoryIndex, type StoryIndexEntry } from './types/storyIndex'
import { progressKey, SELECTED_STORY_KEY } from './utils/appStorage'

const catalog = ref<StoryIndexEntry[]>([])
const story = ref<Story | null>(null)
const error = ref('')
const readerGen = ref(0)

function storiesUrl(file: string) {
  return `${import.meta.env.BASE_URL}stories/${file}`
}

function pickStoryId(entries: StoryIndexEntry[], wanted: string | null) {
  if (wanted && entries.some((entry) => entry.id === wanted)) return wanted
  return entries[0]?.id ?? ''
}

async function loadStory(id: string) {
  const response = await fetch(storiesUrl(`${id}.json`))
  if (!response.ok) {
    throw new Error(`Failed to load story (${response.status})`)
  }
  story.value = (await response.json()) as Story
}

async function openStory(id: string, resetProgress = false) {
  const nextId = pickStoryId(catalog.value, id)
  if (!nextId) return
  localStorage.setItem(SELECTED_STORY_KEY, nextId)
  if (resetProgress) localStorage.setItem(progressKey(nextId), '1')
  error.value = ''
  try {
    await loadStory(nextId)
    if (resetProgress) readerGen.value += 1
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load story'
    story.value = null
  }
}

async function selectStory(id: string) {
  await openStory(id, true)
}

onMounted(async () => {
  try {
    const response = await fetch(storiesUrl('index.json'))
    if (!response.ok) {
      throw new Error(`Failed to load stories (${response.status})`)
    }
    const entries = parseStoryIndex(await response.json())
    if (!entries.length) {
      throw new Error('Failed to load stories')
    }
    catalog.value = entries
    const saved = localStorage.getItem(SELECTED_STORY_KEY)
    await openStory(pickStoryId(entries, saved), false)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load story'
  }
})
</script>

<template>
  <main class="shell">
    <p v-if="error" class="status error">{{ error }}</p>
    <p v-else-if="!story" class="status">Loading story…</p>
    <StoryReader
      v-else
      :key="`${story.id}:${readerGen}`"
      :story="story"
      :stories="catalog"
      @select="selectStory"
    />
  </main>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  padding: 16px 16px 48px;
}

@media (min-width: 768px) {
  .shell {
    padding: 36px 28px 56px;
  }
}

.status {
  max-width: 720px;
  margin: 20vh auto 0;
  text-align: center;
  color: var(--muted);
  font-size: 1.1rem;
}

.error {
  color: var(--coral);
}
</style>
