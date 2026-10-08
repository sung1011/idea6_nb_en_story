<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { StoryIndexEntry } from '@/types/storyIndex'

const props = defineProps<{
  stories: StoryIndexEntry[]
  currentId: string
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const currentIndex = computed(() => {
  const idx = props.stories.findIndex((item) => item.id === props.currentId)
  return idx === -1 ? 0 : idx
})

const currentLabel = computed(() => {
  const story = props.stories[currentIndex.value] ?? props.stories[0]
  if (!story) return 'Story'
  return `${currentIndex.value + 1}. ${story.title}`
})

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function pick(id: string) {
  close()
  if (id === props.currentId) return
  emit('select', id)
}

function onPointerDown(event: PointerEvent) {
  if (!open.value) return
  const target = event.target as HTMLElement | null
  if (target && rootRef.value?.contains(target)) return
  close()
}

function onKey(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

onMounted(() => {
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div
    ref="rootRef"
    class="switcher"
    :data-story-switcher-open="open ? 'true' : undefined"
  >
    <button
      type="button"
      class="current"
      :aria-expanded="open"
      aria-haspopup="listbox"
      aria-controls="story-switcher-list"
      aria-label="Choose story"
      @click="toggle"
    >
      {{ currentLabel }}
    </button>
    <ul
      v-if="open"
      id="story-switcher-list"
      class="menu"
      role="listbox"
      aria-label="Stories"
    >
      <li v-for="(item, index) in stories" :key="item.id" role="none">
        <button
          type="button"
          class="option"
          role="option"
          :aria-selected="item.id === currentId"
          :class="{ on: item.id === currentId }"
          @click="pick(item.id)"
        >
          {{ index + 1 }}. {{ item.title }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.switcher {
  position: relative;
  z-index: 8;
  margin: 0 0 4px;
  max-width: 100%;
}

.current,
.option {
  min-height: 44px;
  background: var(--paper);
  color: var(--teal-dark);
  font: inherit;
  font-weight: 700;
  text-align: left;
}

.current {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 6px 12px;
  border: 3px solid #2f3f3b;
  border-radius: 999px;
  background: rgba(31, 138, 128, 0.12);
  box-shadow: 0 2px 0 rgba(47, 63, 59, 0.16);
  font-size: 0.92rem;
  line-height: 1.2;
}

.menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 12;
  min-width: min(280px, calc(100vw - 48px));
  margin: 0;
  padding: 8px;
  list-style: none;
  border: 3px solid #2f3f3b;
  border-radius: 18px;
  background: var(--paper);
  box-shadow: var(--shadow);
}

.option {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border: 0;
  border-radius: 14px;
  font-size: 1rem;
}

.option.on {
  background: rgba(31, 138, 128, 0.2);
  box-shadow: 0 0 0 3px rgba(31, 138, 128, 0.28);
}
</style>
