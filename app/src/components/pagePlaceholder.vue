<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  pageIndex: number
  image: string | null
}>()

const palettes = [
  { sky: '#f7ead4', hill: '#cfe8d2', sand: '#ead7a8', flag: '#e08b74', sun: '#f3c97a' },
  { sky: '#f4e6d8', hill: '#d5e4f0', sand: '#edd6b0', flag: '#d98aa8', sun: '#f0c3a0' },
  { sky: '#efe8d6', hill: '#d7e8c8', sand: '#e6d0a4', flag: '#7eb8b0', sun: '#f2d07a' },
  { sky: '#f6e4dc', hill: '#e4d6f0', sand: '#ebcfa8', flag: '#e0a06a', sun: '#f5c48c' },
]

const palette = computed(() => palettes[(props.pageIndex - 1) % palettes.length])
const uid = computed(() => `p${props.pageIndex}`)
const imageSrc = computed(() => {
  const file = String(props.image || '').trim()
  if (!file) return ''
  const base = import.meta.env.BASE_URL
  return `${base}${file.replace(/^\//, '')}`
})
</script>

<template>
  <div class="art" :style="{ '--sky': palette.sky }">
    <img
      v-if="imageSrc"
      class="art-img"
      :src="imageSrc"
      :alt="`Page ${pageIndex} illustration`"
    />
    <svg
      v-else
      class="art-svg"
      viewBox="0 0 640 360"
      role="img"
      :aria-label="`Page ${pageIndex} clay placeholder`"
    >
      <defs>
        <linearGradient :id="`${uid}-sky`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="palette.sky" />
          <stop offset="100%" stop-color="#fff6e8" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" :fill="`url(#${uid}-sky)`" />
      <circle
        cx="528"
        cy="78"
        r="40"
        :fill="palette.sun"
        stroke="#2f3f3b"
        stroke-width="7"
      />
      <g fill="#fff8ec" stroke="#2f3f3b" stroke-width="7" stroke-linejoin="round">
        <ellipse cx="128" cy="86" rx="58" ry="30" />
        <ellipse cx="176" cy="96" rx="42" ry="24" />
        <ellipse cx="318" cy="64" rx="70" ry="28" />
        <ellipse cx="366" cy="74" rx="40" ry="22" />
      </g>
      <path
        d="M-20 230 C 90 188, 170 250, 280 214 C 390 178, 470 236, 660 198 L 660 380 L -20 380 Z"
        :fill="palette.hill"
        stroke="#2f3f3b"
        stroke-width="7"
        stroke-linejoin="round"
      />
      <path
        d="M-20 276 C 120 246, 230 304, 360 268 C 480 236, 560 292, 660 258 L 660 380 L -20 380 Z"
        :fill="palette.sand"
        stroke="#2f3f3b"
        stroke-width="7"
        stroke-linejoin="round"
      />
      <rect x="142" y="128" width="14" height="148" rx="7" fill="#5c4638" stroke="#2f3f3b" stroke-width="5" />
      <path
        d="M156 136 h 108 l -22 36 22 34 H 156 z"
        :fill="palette.flag"
        stroke="#2f3f3b"
        stroke-width="7"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </svg>
  </div>
</template>

<style scoped>
.art {
  overflow: hidden;
  aspect-ratio: 16 / 9;
  width: 100%;
  border-radius: 28px;
  background: var(--sky, #f7ead4);
  border: 4px solid #2f3f3b;
  box-shadow:
    0 8px 0 rgba(47, 63, 59, 0.18),
    inset 0 2px 0 rgba(255, 255, 255, 0.45);
}

.art-img,
.art-svg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 640px) {
  .art {
    border-radius: 22px;
    border-width: 3px;
  }
}
</style>
