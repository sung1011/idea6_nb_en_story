<script setup lang="ts">
defineProps<{
  version: string
  date: string
  summaries: string[]
}>()
</script>

<template>
  <article class="row">
    <p class="meta">
      <span class="ver">{{ version }}</span>
      <span class="date">{{ date }}</span>
    </p>
    <ul v-if="summaries.length > 1" class="bullets">
      <li v-for="(line, index) in summaries" :key="index">{{ line }}</li>
    </ul>
    <p v-else-if="summaries[0]" class="summary">{{ summaries[0] }}</p>
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

.summary,
.bullets {
  margin: 0;
  color: var(--ink);
  font-size: 0.95rem;
  line-height: 1.35;
  font-weight: 500;
}

.bullets {
  padding-left: 1.15em;
}

.bullets li + li {
  margin-top: 4px;
}
</style>
