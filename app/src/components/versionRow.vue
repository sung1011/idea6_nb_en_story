<script setup lang="ts">
import type { AppVersion } from '@/types/appVersion'

defineProps<{
  entry: AppVersion
}>()
</script>

<template>
  <article class="row">
    <p class="meta">
      <span class="ver">{{ entry.version }}</span>
      <span class="date">{{ entry.date }}</span>
    </p>
    <p class="summary">{{ entry.summary }}</p>
  </article>
</template>

<style scoped>
.row {
  padding: 10px 12px;
  border-radius: 16px;
  border: 3px solid #2f3f3b;
  background: var(--paper);
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
</style>
