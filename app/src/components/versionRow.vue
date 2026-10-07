<script setup lang="ts">
import type { AppVersion } from '@/types/appVersion'

defineProps<{
  entry: AppVersion
  showUpdate?: boolean
}>()

const emit = defineEmits<{
  update: []
}>()
</script>

<template>
  <article class="row">
    <div class="copy">
      <p class="meta">
        <span class="ver">{{ entry.version }}</span>
        <span class="date">{{ entry.date }}</span>
      </p>
      <p class="summary">{{ entry.summary }}</p>
    </div>
    <button
      v-if="showUpdate"
      type="button"
      class="update"
      @click="emit('update')"
    >
      更新
    </button>
  </article>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  border: 3px solid #2f3f3b;
  background: var(--paper);
}

.copy {
  min-width: 0;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 4px;
}

.ver {
  font-weight: 700;
  font-size: 1.05rem;
}

.date {
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 500;
}

.summary {
  margin: 0;
  color: var(--ink);
  font-size: 0.95rem;
  line-height: 1.35;
  font-weight: 500;
}

.update {
  flex-shrink: 0;
  min-height: 48px;
  min-width: 72px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 3px solid #2f3f3b;
  background: var(--teal);
  color: white;
  font-size: 1rem;
  font-weight: 700;
}
</style>
