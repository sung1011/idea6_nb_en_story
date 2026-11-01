<script setup lang="ts">
import { computed } from 'vue'
import { pickPraiseLine } from '@/utils/praiseLine'

const props = withDefaults(
  defineProps<{
    sub?: string
    stars?: number
    maxStars?: number
    count?: string
  }>(),
  {
    sub: '',
    maxStars: 3,
    count: '',
  },
)

const emit = defineEmits<{
  'play-again': []
  back: []
}>()

const title = pickPraiseLine()
const showStars = computed(() => typeof props.stars === 'number' && props.maxStars > 0)
const starSlots = computed(() => Array.from({ length: props.maxStars }, (_, index) => index + 1))
</script>

<template>
  <div class="win" role="dialog" aria-modal="true" aria-label="Game complete">
    <div class="banner">
      <p v-if="showStars" class="stars" :aria-label="`${stars} of ${maxStars} stars`">
        <span
          v-for="n in starSlots"
          :key="n"
          class="star"
          :class="{ on: n <= (stars ?? 0) }"
          :style="{ '--i': n }"
          aria-hidden="true"
        >
          ★
        </span>
      </p>
      <p v-else-if="count" class="count">{{ count }}</p>
      <p class="title">{{ title }}</p>
      <p v-if="sub" class="sub">{{ sub }}</p>
      <div class="actions">
        <button type="button" class="primary tap" @click="emit('play-again')">Play again</button>
        <button type="button" class="ghost tap" @click="emit('back')">Back to Games</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.win {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 9% 14px 16px;
  background: rgba(12, 24, 22, 0.4);
  pointer-events: auto;
}

.banner {
  width: min(92%, 440px);
  text-align: center;
  padding: 14px 16px 16px;
  border: 3px solid var(--outline);
  border-radius: 22px;
  background: rgba(255, 253, 247, 0.96);
  box-shadow: var(--shadow);
  animation: banner-in 0.42s ease both;
}

.stars {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin: 0 0 6px;
  line-height: 1;
}

.star {
  font-size: 1.35rem;
  color: #d7d0c4;
}

.star.on {
  color: #e4b43a;
  text-shadow: 0 1px 0 rgba(110, 70, 10, 0.2);
  animation: star-pop 0.55s ease both;
  animation-delay: calc(var(--i) * 0.08s);
}

.count {
  margin: 0 0 4px;
  color: var(--teal-dark);
  font-weight: 800;
  font-size: 0.95rem;
}

.title {
  margin: 0;
  font-size: clamp(1.45rem, 4vw, 1.85rem);
  font-weight: 800;
  color: var(--teal-dark);
  line-height: 1.15;
}

.sub {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 0.95rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
}

.primary,
.ghost {
  min-height: 44px;
  min-width: 132px;
  padding: 0 16px;
  border: 2px solid var(--outline);
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
}

.primary {
  background: rgba(31, 138, 128, 0.18);
  color: var(--teal-dark);
}

.ghost {
  background: #fff;
  color: var(--ink);
}

.tap {
  touch-action: manipulation;
}

.primary:active,
.ghost:active {
  transform: scale(0.97);
}

@keyframes banner-in {
  0% {
    opacity: 0;
    transform: translateY(-10px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes star-pop {
  0% {
    transform: scale(0.7);
  }
  45% {
    transform: scale(1.22);
  }
  100% {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .banner,
  .star.on {
    animation: none;
  }
}
</style>
