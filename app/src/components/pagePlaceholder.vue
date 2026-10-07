<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  pageIndex: number
  focusWord: string
  image: string | null
}>()

const hues = [168, 28, 200, 42, 152, 18]
const hue = computed(() => hues[(props.pageIndex - 1) % hues.length])
const imageSrc = computed(() => {
  if (!props.image) return ''
  const base = import.meta.env.BASE_URL
  return `${base}${props.image.replace(/^\//, '')}`
})
</script>

<template>
  <div class="art" :style="{ '--hue': hue }">
    <img
      v-if="imageSrc"
      class="art-img"
      :src="imageSrc"
      :alt="`Page ${pageIndex} illustration`"
    />
    <svg v-else class="art-svg" viewBox="0 0 640 360" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="`hsl(${hue} 32% 72%)`" />
          <stop offset="100%" :stop-color="`hsl(${hue} 28% 88%)`" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#sky)" />
      <ellipse cx="120" cy="80" rx="90" ry="28" fill="#ffffff" opacity="0.45" />
      <ellipse cx="300" cy="50" rx="120" ry="34" fill="#ffffff" opacity="0.38" />
      <ellipse cx="520" cy="90" rx="100" ry="30" fill="#ffffff" opacity="0.42" />
      <path d="M0 250 C 120 210, 220 280, 340 240 C 460 200, 540 260, 640 220 L 640 360 L 0 360 Z" fill="#e8d7b5" />
      <path d="M0 290 C 160 260, 280 310, 420 280 C 520 258, 580 300, 640 270 L 640 360 L 0 360 Z" fill="#d9c49a" />
      <rect x="118" y="118" width="8" height="150" rx="3" fill="#5b4636" />
      <path d="M126 122 h 90 l -18 32 18 30 H 126 z" fill="#e06a4e" />
      <circle cx="520" cy="210" r="36" fill="#c9b48a" />
      <text class="page-no" x="320" y="188" text-anchor="middle">{{ String(pageIndex).padStart(2, '0') }}</text>
    </svg>
    <p v-if="focusWord" class="focus-chip">{{ focusWord }}</p>
    <p v-else class="focus-chip muted">illustration soon</p>
  </div>
</template>

<style scoped>
.art {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  background: hsl(var(--hue, 168) 30% 80%);
  min-height: 220px;
  aspect-ratio: 16 / 9;
}

.art-img,
.art-svg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.page-no {
  font-size: 92px;
  font-weight: 700;
  fill: rgba(36, 51, 48, 0.18);
}

.focus-chip {
  position: absolute;
  left: 16px;
  bottom: 14px;
  margin: 0;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 253, 247, 0.9);
  color: var(--teal-dark);
  font-size: 0.92rem;
  font-weight: 600;
}

.muted {
  color: var(--muted);
  font-weight: 500;
}
</style>
