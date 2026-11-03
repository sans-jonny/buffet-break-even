<template>
  <view :class="{'is-dragging': drum.dragging.value}" class="mode-stage flex-center"
        @mousedown="drum.begin" @mouseleave="drum.end" @mousemove="drum.move" @mouseup="drum.end"
        @touchcancel="drum.end" @touchend="drum.end" @touchstart="drum.begin" @touchmove.stop.prevent="drum.move">
    <view class="dots flex-center" @touchstart.stop @mousedown.stop>
      <view v-for="(kind, index) in items" :key="kind.id" :class="{active: drum.highlightedIndex.value === index}"
            class="dot" @tap.stop="drum.choose(index)"/>
    </view>
    <view :style="{transform: drum.rotation.value}" class="mode-drum">
      <view v-for="(kind, index) in items" :key="kind.id" :class="'tone-' + kind.id"
            :style="{transform: 'rotateY(' + index * 360 / items.length + 'deg) translateZ(var(--drum-radius)) rotateY(' + (drum.position.value - index) * 360 / items.length + 'deg)'}"
            class="mode-card flex-center"
            @tap="drum.choose(index)">
        <text :class="{'is-floating': drum.highlightedIndex.value === index}" class="mode-emoji">{{ kind.emoji }}</text>
        <text class="mode-name">{{ kind.name }}</text>
      </view>
    </view>
  </view>
</template>
<script lang="ts">
export default {options: {virtualHost: true}}
</script>
<script lang="ts" setup>
import {computed, watch} from 'vue'
import {useCuisineDrum} from './useCuisineDrum'

const props = defineProps<{
  modelValue: string
  items: readonly { id: string; name: string; emoji: string }[]
}>()
const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'preview', value: string): void
}>()
const selected = computed({get: () => props.modelValue, set: value => emit('update:modelValue', value)})
const drum = useCuisineDrum(() => props.items.map(item => item.id), selected,
    () => (typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync()).windowWidth || 375)
watch(() => props.items[drum.highlightedIndex.value]?.id || props.modelValue,
    id => emit('preview', id), {immediate: true})
</script>

<style scoped>
.dots {
  gap: 18rpx;
  position: relative;
  flex: 0 0 auto;
  z-index: 3;
}

.dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 20rpx;
  background: rgba(161, 113, 54, .25);
}

.dot.active {
  width: 68rpx;
  background: linear-gradient(90deg, #ff9300, #ff501a);
}

.mode-stage {
  --drum-radius: 380rpx;
  flex: 1 1 0;
  min-height: 0;
  flex-direction: column;
  justify-content: center;
  gap: 24rpx;
  position: relative;
  overflow: hidden;
  perspective: 1200rpx;
  touch-action: pan-y;
  user-select: none;
  cursor: grab;
}

.mode-stage.is-dragging {
  cursor: grabbing
}

.mode-drum {
  width: 430rpx;
  height: 600rpx;
  max-height: calc(100% - 30rpx);
  flex: 0 1 600rpx;
  min-height: 0;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 420ms cubic-bezier(.22, .75, .24, 1);
}

.is-dragging .mode-drum,
.is-dragging .mode-card {
  transition: none
}

.mode-card {
  width: 100%;
  height: 600rpx;
  max-height: 100%;
  border-radius: 64rpx;
  background: linear-gradient(145deg, #a9e9d5, #6fc5ad);
  border: 8rpx solid rgba(255, 255, 255, .25);
  box-shadow: 0 38rpx 38rpx rgba(133, 93, 54, .18);
  flex-direction: column;
  position: absolute;
  top: 0;
  left: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  /* Counter-rotate each face: its center follows the drum while it faces the screen. */
  transition: transform 420ms cubic-bezier(.22, .75, .24, 1);
  color: white;
  box-sizing: border-box;
}

.tone-creator {
  background: linear-gradient(145deg, #d8c2f2, #aa8adf)
}

.tone-my-restaurants {
  background: linear-gradient(145deg, #e7c5bd, #cb9397)
}

.tone-barbecue {
  background: linear-gradient(145deg, #f3c976, #d7994d)
}

.tone-hotpot {
  background: linear-gradient(145deg, #f3ae8d, #d7745e)
}

.tone-pizza {
  background: linear-gradient(145deg, #edce80, #d4a03d)
}

.mode-emoji {
  display: inline-block;
  font-size: 96rpx;
}

.mode-emoji.is-floating {
  animation: emoji-float 2.4s ease-in-out infinite
}

@keyframes emoji-float {
  0%, 100% {
    transform: translateY(0)
  }
  50% {
    transform: translateY(-12rpx)
  }
}

@media (prefers-reduced-motion: reduce) {
  .mode-emoji.is-floating {
    animation: none
  }
}

.mode-name {
  font-size: 52rpx;
  font-weight: 900;
  margin-top: 24rpx;
}

@media (max-height: 650px) {
  .mode-emoji {
    font-size: 64rpx
  }

  .mode-name {
    font-size: 42rpx;
    margin-top: 12rpx
  }
}
</style>
