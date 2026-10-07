<script setup lang="ts">
import { computed } from 'vue'
import type { LearnItem } from '@/types/story'

const props = defineProps<{
  item: LearnItem
  playing: boolean
}>()

const emit = defineEmits<{
  replay: []
  close: []
}>()

const word = computed(() => props.item.word)
const gloss = computed(() => props.item.gloss)
</script>

<template>
  <aside class="gloss" role="dialog" aria-label="单词释义">
    <div class="body">
      <p class="word">{{ word }}</p>
      <p class="meaning">{{ gloss }}</p>
    </div>
    <div class="actions">
      <button type="button" class="replay" :aria-pressed="playing" @click="emit('replay')">
        再听
      </button>
      <button type="button" class="close" @click="emit('close')">关闭</button>
    </div>
  </aside>
</template>

<style scoped>
.gloss {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 20px;
  border: 3px solid #2f3f3b;
  background: rgba(224, 106, 78, 0.12);
}

.body {
  min-width: 0;
}

.word {
  margin: 0;
  color: #b4452e;
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.2;
}

.meaning {
  margin: 4px 0 0;
  color: var(--ink);
  font-size: 1.15rem;
  font-weight: 700;
}

.actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.actions button {
  min-height: 48px;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
}

.replay {
  border: 3px solid #2f3f3b;
  background: var(--coral);
  color: white;
}

.replay[aria-pressed='true'] {
  box-shadow: 0 3px 0 #2f3f3b;
}

.close {
  border: 3px solid #2f3f3b;
  background: var(--paper);
  color: var(--ink);
}

@media (max-width: 720px) {
  .gloss {
    flex-direction: column;
    align-items: stretch;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
