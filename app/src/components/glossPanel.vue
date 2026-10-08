<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

export type GlossAnchor = Pick<DOMRect, 'top' | 'left' | 'width' | 'height' | 'bottom' | 'right'>

const props = defineProps<{
  heading?: string
  body: string
  playing: boolean
  anchor: GlossAnchor
  replayLabel?: string
  ariaLabel?: string
}>()

const emit = defineEmits<{
  replay: []
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
  () => [props.heading, props.body, props.anchor.top, props.anchor.left, props.anchor.width, props.anchor.height],
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
      <p v-if="heading" class="word">{{ heading }}</p>
      <p class="meaning" :class="{ solo: !heading }">{{ body }}</p>
      <button
        type="button"
        class="replay"
        :aria-pressed="playing"
        @click="emit('replay')"
      >
        🔊 {{ replayLabel || 'Play again' }}
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

.word {
  margin: 0;
  color: #b4452e;
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.2;
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

.replay,
.close {
  border: 3px solid #2f3f3b;
  font-family: inherit;
  font-weight: 700;
}

.replay {
  min-height: 44px;
  min-width: 44px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--coral);
  color: white;
  font-size: 1rem;
}

.replay[aria-pressed='true'] {
  box-shadow: 0 3px 0 #2f3f3b;
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
  border-radius: 14px;
  background: var(--paper);
  color: var(--ink);
  font-size: 1.15rem;
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
