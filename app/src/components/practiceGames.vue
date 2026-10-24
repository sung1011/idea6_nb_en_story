<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { StoryIndexEntry } from '@/types/storyIndex'
import { parseGamesIndex, type GameIndexEntry } from '@/types/games'
import { mediaUrl } from '@/utils/mediaUrl'

const props = defineProps<{
  storyId: string
  stories: StoryIndexEntry[]
}>()

const emit = defineEmits<{
  back: []
  play: [gameId: string, storyId: string]
}>()

const games = ref<GameIndexEntry[]>([])
const error = ref('')

const story = computed(() => props.stories.find((item) => item.id === props.storyId))

function gamesUrl(file: string) {
  return `${import.meta.env.BASE_URL}games/${file}`
}

function isOpen(game: GameIndexEntry) {
  return game.openStoryIds.includes(props.storyId)
}

onMounted(async () => {
  try {
    const response = await fetch(gamesUrl('index.json'))
    if (!response.ok) throw new Error(`Failed to load games (${response.status})`)
    games.value = parseGamesIndex(await response.json())
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load games'
  }
})
</script>

<template>
  <section class="games">
    <header class="bar">
      <button type="button" class="back tap" aria-label="Back to story" @click="emit('back')">
        ← Back
      </button>
      <div class="titles">
        <h1>Games</h1>
        <p v-if="story" class="sub">{{ story.title }}</p>
      </div>
      <span class="spacer" aria-hidden="true" />
    </header>

    <p v-if="error" class="status error">{{ error }}</p>
    <p v-else-if="!games.length" class="status">Loading games…</p>
    <ul v-else class="list">
      <li v-for="game in games" :key="game.id">
        <button
          type="button"
          class="card tap"
          :class="{ locked: !isOpen(game) }"
          :disabled="!isOpen(game)"
          :aria-label="isOpen(game) ? game.title : `${game.title}, Coming soon`"
          @click="isOpen(game) && emit('play', game.id, storyId)"
        >
          <img class="cover" :src="mediaUrl(game.cover)" :alt="game.title" loading="lazy" />
          <span class="meta">
            <span class="title">{{ game.title }}</span>
            <span v-if="game.titleZh" class="zh">{{ game.titleZh }}</span>
            <span v-if="!isOpen(game)" class="badge">Coming soon</span>
            <span v-else class="badge open">Play</span>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.games {
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
  margin-bottom: 18px;
}

.titles {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.titles h1 {
  margin: 0;
  font-size: 1.45rem;
}

.sub {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 0.95rem;
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
}

.error {
  color: var(--coral);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}

.card {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 14px;
  width: 100%;
  padding: 12px;
  border: 2px solid rgba(47, 63, 59, 0.16);
  border-radius: 20px;
  background: #fff;
  color: inherit;
  font: inherit;
  text-align: left;
}

.card:disabled {
  cursor: not-allowed;
  opacity: 0.78;
}

.card:not(:disabled):active {
  transform: scale(0.99);
}

.cover {
  width: 120px;
  height: 72px;
  object-fit: cover;
  border-radius: 14px;
  background: var(--fog);
}

.meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}

.title {
  font-weight: 700;
  font-size: 1.1rem;
}

.zh {
  color: var(--muted);
  font-size: 0.9rem;
}

.badge {
  align-self: flex-start;
  margin-top: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(92, 111, 106, 0.14);
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
}

.badge.open {
  background: rgba(31, 138, 128, 0.16);
  color: var(--teal-dark);
}

.tap {
  touch-action: manipulation;
}

@media (max-width: 480px) {
  .card {
    grid-template-columns: 96px 1fr;
  }

  .cover {
    width: 96px;
    height: 60px;
  }
}
</style>
