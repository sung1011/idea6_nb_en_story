<script setup lang="ts">
import { onMounted, ref } from 'vue'
import StoryReader from './components/storyReader.vue'
import AppSettings from './components/appSettings.vue'
import type { Story } from './types/story'

const STORY_ID = 'flag-in-the-fog'

const story = ref<Story | null>(null)
const error = ref('')

onMounted(async () => {
  const url = `${import.meta.env.BASE_URL}stories/${STORY_ID}.json`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to load story (${response.status})`)
    }
    story.value = (await response.json()) as Story
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load story'
  }
})
</script>

<template>
  <main class="shell">
    <AppSettings />
    <p v-if="error" class="status error">{{ error }}</p>
    <p v-else-if="!story" class="status">Loading story…</p>
    <StoryReader v-else :story="story" />
  </main>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  padding: 76px 16px 48px;
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
