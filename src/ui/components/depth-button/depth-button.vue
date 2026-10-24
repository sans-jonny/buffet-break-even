<template>
  <view class="depth-button" :class="[{'is-disabled': disabled}, 'depth-' + phase]" :style="{'--press-depth': depth + 'rpx', '--depth-color': shadowColor, '--ambient-shadow': ambientShadow, '--press-duration': PRESS_ANIMATION_MS + 'ms'}"
        role="button" :aria-label="label" :aria-disabled="disabled"
        hover-class="none"
        @touchstart="press" @touchend="release" @touchcancel="release"
        @mousedown="press" @mouseup="release" @mouseleave="release" @animationend="animationEnd"
        @tap="activate">
    <slot/>
  </view>
</template>

<script lang="ts">
export default {options:{virtualHost:true}}
</script>

<script setup lang="ts">
import {nextTick, watch} from 'vue'
import {PRESS_ANIMATION_MS, usePressFeedback} from '@/ui/composables/usePressFeedback'

const {phase, press: beginPress, release, animationEnd} = usePressFeedback()
let pendingActivation = false
const props = withDefaults(defineProps<{
  depth?: number
  shadowColor?: string
  ambientShadow?: string
  disabled?: boolean
  label?: string
}>(), {
  depth:14,
  shadowColor:'#a53700',
  ambientShadow:'0 26rpx 32rpx rgba(158, 64, 8, .2)',
  disabled:false
})
const emit = defineEmits<{(event: 'click'): void}>()
function press(event: Parameters<typeof beginPress>[0]) {if (!props.disabled) beginPress(event)}
function activate() {
  if (props.disabled) return
  if (phase.value === 'pressing') pendingActivation = true
  else emit('click')
}
watch(phase, async current => {
  if (!pendingActivation || current === 'pressing') return
  pendingActivation = false
  // 先完成压下反馈，再打开弹窗，避免同一帧的遮罩盖住整个按压过程。
  await nextTick()
  if (!props.disabled) emit('click')
})
</script>

<style scoped>
.depth-button {
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 var(--press-depth) 0 var(--depth-color), var(--ambient-shadow);
  cursor:pointer;
}
.depth-pressing {animation:depth-press-in var(--press-duration) ease-out both}
.depth-releasing {animation:depth-press-out var(--press-duration) ease-out both}
.depth-held {
  transform:translateY(var(--press-depth));
  box-shadow:0 0 0 var(--depth-color), 0 0 0 rgba(0, 0, 0, 0);
}
@keyframes depth-press-in {
  from {transform:translateY(0);box-shadow:0 var(--press-depth) 0 var(--depth-color), var(--ambient-shadow)}
  to {transform:translateY(var(--press-depth));box-shadow:0 0 0 var(--depth-color), 0 0 0 rgba(0, 0, 0, 0)}
}
@keyframes depth-press-out {
  from {transform:translateY(var(--press-depth));box-shadow:0 0 0 var(--depth-color), 0 0 0 rgba(0, 0, 0, 0)}
  to {transform:translateY(0);box-shadow:0 var(--press-depth) 0 var(--depth-color), var(--ambient-shadow)}
}
.depth-button.is-disabled {filter:grayscale(50%);cursor:default}
</style>
