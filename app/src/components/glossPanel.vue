<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

export type GlossAnchor = Pick<DOMRect, 'top' | 'left' | 'width' | 'height' | 'bottom' | 'right'>

const props = defineProps<{
  heading?: string
  body: string
  image?: string | null
  playingEn?: boolean
  playingZh?: boolean
  anchor: GlossAnchor
  ariaLabel?: string
}>()

const imageSrc = computed(() => {
  const file = String(props.image || '').trim()
  if (!file) return ''
  const base = import.meta.env.BASE_URL
  return `${base}${file.replace(/^\//, '')}`
})

const emit = defineEmits<{
  chinese: []
  speakEn: []
  close: []
}>()

const panelRef = ref<HTMLElement | null>(null)
const placement = ref<'above' | 'below'>('above')
const panelStyle = ref<Record<string, string>>({
  top: '0px',
  left: '0px',
})
const arrowOffset = ref(24)

const MARGIN = 8
const GAP = 12

function positionPanel() {
  const el = panelRef.value
  if (!el) return
  const box = el.getBoundingClientRect()
  const width = box.width || 240
  const height = box.height || 120
  const vw = window.innerWidth
  const vh = window.innerHeight
  const { anchor } = props

  let left = anchor.left + anchor.width / 2 - width / 2
  left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, vw - width - MARGIN))

  let top = anchor.top - height - GAP
  let nextPlacement: 'above' | 'below' = 'above'
  if (top < MARGIN) {
    top = anchor.bottom + GAP
    nextPlacement = 'below'
  }
  if (top + height > vh - MARGIN) {
    top = Math.max(MARGIN, vh - height - MARGIN)
  }

  const centerX = anchor.left + anchor.width / 2
  arrowOffset.value = Math.min(Math.max(16, centerX - left), width - 16)
  placement.value = nextPlacement
  panelStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    '--arrow-x': `${Math.round(arrowOffset.value)}px`,
  }
}

watch(
  () => [
    props.heading,
    props.body,
    props.image,
    props.anchor.top,
    props.anchor.left,
    props.anchor.width,
    props.anchor.height,
  ],
  async () => {
    await nextTick()
    positionPanel()
  },
)

onMounted(async () => {
  await nextTick()
  positionPanel()
})
</script>

<template>
  <Teleport to="body">
    <aside
      ref="panelRef"
      class="gloss"
      :class="placement"
      :style="panelStyle"
      role="dialog"
      :aria-label="ariaLabel || 'Word meaning'"
      data-gloss-panel
    >
      <button type="button" class="close" aria-label="Close" @click="emit('close')">
        ✕
      </button>
      <div v-if="imageSrc" class="art">
        <img :src="imageSrc" :alt="heading || body" @load="positionPanel" />
      </div>
      <button
        v-if="heading"
        type="button"
        class="word"
        :aria-pressed="playingEn"
        :aria-label="`Play ${heading}`"
        @click="emit('speakEn')"
      >
        {{ heading }}
      </button>
      <p class="meaning" :class="{ solo: !heading }">{{ body }}</p>
      <button
        type="button"
        class="chip zh tap side-chip"
        :class="{ open: playingZh }"
        aria-label="Play Chinese"
        :aria-pressed="playingZh"
        @click="emit('chinese')"
      >
        <svg class="side-icon icon-bubble" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M4.4 3.8h15.2A2.8 2.8 0 0 1 22.4 6.6v8.1a2.8 2.8 0 0 1-2.8 2.8h-7.15l-5.35 4.05v-4.05H4.4A2.8 2.8 0 0 1 1.6 14.7V6.6A2.8 2.8 0 0 1 4.4 3.8Z"
          />
        </svg>
        <span>CN</span>
      </button>
      <span class="arrow" aria-hidden="true" />
    </aside>
  </Teleport>
</template>

<style scoped>
.gloss {
  position: fixed;
  z-index: 80;
  box-sizing: border-box;
  min-width: 168px;
  max-width: min(320px, calc(100vw - 16px));
  padding: 16px 48px 16px 16px;
  border-radius: 20px;
  border: 3px solid #2f3f3b;
  background: var(--paper);
  color: var(--ink);
  box-shadow: var(--shadow);
  font-family: inherit;
}

.art {
  width: clamp(120px, 36vw, 160px);
  height: clamp(120px, 36vw, 160px);
  margin: 0 0 10px;
  overflow: hidden;
  border-radius: 18px;
  border: 3px solid #2f3f3b;
  background: #f3ead8;
  box-shadow: 0 3px 0 rgba(47, 63, 59, 0.16);
}

.art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.word {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #b4452e;
  font-family: inherit;
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.2;
  text-align: left;
  cursor: pointer;
}

.word[aria-pressed='true'] {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.meaning {
  margin: 6px 0 12px;
  color: var(--ink);
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.35;
}

.meaning.solo {
  margin-top: 0;
}

.chip {
  padding: 8px 12px;
  border: 0;
  border-radius: 999px;
  background: rgba(31, 138, 128, 0.12);
  color: var(--teal-dark);
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 700;
}

.chip.tap {
  min-height: 40px;
}

.chip.zh.open,
.chip.zh[aria-pressed='true'] {
  background: rgba(31, 138, 128, 0.28);
  box-shadow: 0 0 0 3px rgba(31, 138, 128, 0.28);
}

.side-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 44px;
  min-width: 44px;
  min-height: 48px;
  padding: 6px 4px 5px;
  font-size: 0.7rem;
  line-height: 1;
  letter-spacing: 0.02em;
}

.side-icon {
  display: block;
  width: 16px;
  height: 16px;
}

.close {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 3px solid #2f3f3b;
  border-radius: 14px;
  background: var(--paper);
  color: var(--ink);
  font-family: inherit;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1;
}

.arrow {
  position: absolute;
  left: var(--arrow-x, 24px);
  width: 14px;
  height: 14px;
  background: var(--paper);
  border: 3px solid #2f3f3b;
  transform: translateX(-50%) rotate(45deg);
}

.gloss.above .arrow {
  bottom: -10px;
  border-top: 0;
  border-left: 0;
}

.gloss.below .arrow {
  top: -10px;
  border-bottom: 0;
  border-right: 0;
}
</style>
