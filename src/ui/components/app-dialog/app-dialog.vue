<template>
  <view class="dialog-overlay">
    <view class="dialog-backdrop" @mousedown="dismiss.start" @mouseleave="dismiss.cancel" @mouseup="dismiss.end"
          @touchcancel="dismiss.cancel" @touchend="dismiss.end" @touchmove="dismiss.move" @touchstart="dismiss.start"/>
    <view :aria-label="title" class="dialog-panel" role="dialog">
      <view class="dialog-heading">
        <text>{{ title }}</text>
        <button :hover-stay-time="0" aria-label="关闭" class="dialog-close"
                @tap.stop="emit('close')">×
        </button>
      </view>
      <slot/>
    </view>
  </view>
</template>
<script lang="ts" setup>
import {useBackdropDismiss} from './useBackdropDismiss'

defineProps<{ title: string }>()
const emit = defineEmits<{ (event: 'close'): void }>()
const dismiss = useBackdropDismiss(() => emit('close'))
</script>
<style scoped>
/* Stay above page overlays (100), but below uni-app pickers and system dialogs (999). */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  box-sizing: border-box
}

.dialog-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(58, 37, 20, .4)
}

.dialog-panel {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 600rpx;
  max-height: 85vh;
  overflow: auto;
  background: #fffaf2;
  border: 3rpx solid #ffdfbd;
  border-radius: 36rpx;
  padding: 36rpx;
  box-sizing: border-box;
  box-shadow: 0 24rpx 80rpx #54331533
}

.dialog-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  font-size: 36rpx;
  font-weight: 900;
  color: #493728
}

.dialog-close {
  padding: 0;
  margin: 0;
  width: 56rpx;
  height: 56rpx;
  line-height: 50rpx;
  background: #fff0df;
  color: #a18064;
  --button-radius: 50%;
  font-size: 40rpx
}

.dialog-close::after {
  border: 0
}
</style>
